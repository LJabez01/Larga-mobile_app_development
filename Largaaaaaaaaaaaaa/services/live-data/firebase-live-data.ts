// Firebase Live Data Service - implements Firestore-backed trip and vehicle state.
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { auth, db } from '@/firebase';
import { isAppRole, normalizeApprovedRoles } from '@/lib/domain/auth';
import {
  buildDriverGuidancePathPlan,
  buildLiveDriverGuidanceState,
  buildRouteUnavailableGuidanceState,
  buildStoredRouteFallbackGuidanceState,
  buildReverseDriverSelection,
  createDriverSelection,
  createEmptyDriverSelection,
  deserializeRouteCoordinates,
  shouldRefreshDriverGuidance,
  isVehicleLocationFresh,
  resolveRouteForTerminals,
  type DriverGuidanceState,
  type DriverSelectionState,
  type DriverLocationStatus,
  type RouteRecord,
  type RouteCoordinate,
  type TerminalOption,
  type VehicleType,
} from '@/lib/domain/transport';
import type {
  ActiveTripState,
  DriverTerminalSelectionInput,
  LiveDataService,
  LiveDataSnapshot,
  PublishDriverLocationInput,
  StartTripInput,
  VehicleMarker,
} from '@/services/contracts/live-data';
import { COMMUTER_NOTIFICATIONS, DRIVER_NOTIFICATIONS } from '@/services/fixtures/notifications';
import { requestDriverGuidanceRoute } from '@/services/live-data/mapbox-guidance';
import { isSelectableTerminalId } from '@/lib/seed/transport-location-inventory';

interface FirebaseUserDocument {
  role?: unknown;
  approvedRoles?: unknown;
}

interface FirestoreRouteRecord {
  id?: unknown;
  label?: unknown;
  originTerminalId?: unknown;
  destinationTerminalId?: unknown;
  vehicleType?: unknown;
  coordinates?: unknown;
  isActive?: unknown;
}

interface FirestoreTerminalRecord {
  id?: unknown;
  label?: unknown;
  coordinate?: unknown;
  isActive?: unknown;
}

interface FirestoreActiveTripRecord {
  driverId?: unknown;
  routeId?: unknown;
  originTerminalId?: unknown;
  destinationTerminalId?: unknown;
  status?: unknown;
  startedAt?: unknown;
  updatedAt?: unknown;
}

interface FirestoreVehicleLocationRecord {
  driverId?: unknown;
  tripId?: unknown;
  routeId?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  heading?: unknown;
  speed?: unknown;
  accuracy?: unknown;
  recordedAt?: unknown;
  updatedAt?: unknown;
}

interface ParsedVehicleLocation {
  driverId: string;
  marker: VehicleMarker;
  recordedAt: string;
  isFresh: boolean;
}

const listeners = new Set<(snapshot: LiveDataSnapshot) => void>();
const sharedNotifications = {
  commuter: COMMUTER_NOTIFICATIONS.map((notification) => ({ ...notification })),
  driver: DRIVER_NOTIFICATIONS.map((notification) => ({ ...notification })),
};

let authWatcherReady = false;
let firestoreUnsubscribers: Unsubscribe[] = [];
let currentUserId: string | null = null;
let currentTerminals: TerminalOption[] = [];
let currentRoutes: RouteRecord[] = [];
let currentVehicles: VehicleMarker[] = [];
let currentActiveTrip: ActiveTripState | null = null;
let currentDriverGuidance: DriverGuidanceState | null = null;
let currentDriverSelection: DriverSelectionState = createEmptyDriverSelection();
let currentDriverLastLocationRecordedAt: string | null = null;
let currentDriverHasFreshLocation = false;
let currentDriverLocationStatus: DriverLocationStatus = 'idle';
let currentDriverGuidanceRequestId = 0;
let currentSnapshot: LiveDataSnapshot = buildSnapshot();

// Snapshot Builder - creates a fresh immutable snapshot for provider consumers.
function cloneVehicle(vehicle: VehicleMarker): VehicleMarker {
  return {
    ...vehicle,
    coordinate: [...vehicle.coordinate] as [number, number],
  };
}

function cloneDriverGuidance(guidance: DriverGuidanceState): DriverGuidanceState {
  return {
    ...guidance,
    originCoordinate: [...guidance.originCoordinate] as [number, number],
    destinationCoordinate: [...guidance.destinationCoordinate] as [number, number],
    routeCoordinates: guidance.routeCoordinates
      ? guidance.routeCoordinates.map((coordinate) => [...coordinate] as [number, number])
      : null,
    connectorCoordinates: guidance.connectorCoordinates
      ? guidance.connectorCoordinates.map((coordinate) => [...coordinate] as [number, number])
      : null,
  };
}

function buildSnapshot(): LiveDataSnapshot {
  return {
    terminals: currentTerminals.map((terminal) => ({
      ...terminal,
      coordinate: [...terminal.coordinate] as [number, number],
    })),
    routes: currentRoutes.map((route) => ({
      ...route,
      coordinates: route.coordinates.map((coordinate) => [...coordinate] as [number, number]),
    })),
    activeTrip: currentActiveTrip ? { ...currentActiveTrip } : null,
    driverGuidance: currentDriverGuidance ? cloneDriverGuidance(currentDriverGuidance) : null,
    vehicles: currentVehicles.map(cloneVehicle),
    driverSelection: { ...currentDriverSelection },
    notificationsByRole: {
      commuter: sharedNotifications.commuter.map((notification) => ({ ...notification })),
      driver: sharedNotifications.driver.map((notification) => ({ ...notification })),
    },
  };
}

// Snapshot Sync - keeps the shared live-data snapshot and subscribers up to date.
function notify() {
  listeners.forEach((listener) => listener(currentSnapshot));
}

function syncDriverSelectionFromCurrentState() {
  if (currentActiveTrip) {
    currentDriverSelection = {
      originTerminalId: currentActiveTrip.originTerminalId,
      destinationTerminalId: currentActiveTrip.destinationTerminalId,
      originLocationId: currentActiveTrip.originLocationId,
      destinationLocationId: currentActiveTrip.destinationLocationId,
      resolvedRouteId: currentActiveTrip.routeId,
      resolvedRouteLabel: currentActiveTrip.routeLabel,
    };
    return;
  }

  const resolvedRoute = resolveRouteForTerminals(
    currentRoutes,
    currentDriverSelection.originTerminalId,
    currentDriverSelection.destinationTerminalId,
  );

  currentDriverSelection = {
    ...currentDriverSelection,
    resolvedRouteId: resolvedRoute?.id ?? null,
    resolvedRouteLabel: resolvedRoute?.label ?? null,
  };
}

function syncActiveTripLocationState() {
  if (!currentActiveTrip) {
    currentDriverLocationStatus = 'idle';
    return;
  }

  currentDriverLocationStatus = !currentDriverLastLocationRecordedAt
    ? 'missing'
    : (currentDriverHasFreshLocation ? 'live' : 'stale');

  currentActiveTrip = {
    ...currentActiveTrip,
    lastLocationRecordedAt: currentDriverLastLocationRecordedAt,
    locationStatus: currentDriverLocationStatus,
  };
}

function updateSnapshot() {
  syncDriverSelectionFromCurrentState();
  syncActiveTripLocationState();
  currentSnapshot = buildSnapshot();
  notify();
  return currentSnapshot;
}

function getActiveVehicleCoordinate() {
  if (!currentActiveTrip) {
    return null;
  }

  const activeTrip = currentActiveTrip;
  const activeVehicle = currentVehicles.find((vehicle) => vehicle.id === activeTrip.vehicleId);

  return activeVehicle?.coordinate ?? null;
}

function getDestinationCoordinate(destinationTerminalId: string) {
  const destinationTerminal = currentTerminals.find((terminal) => terminal.id === destinationTerminalId);

  return destinationTerminal?.coordinate ?? null;
}

async function refreshDriverGuidanceForCurrentTrip(
  route: RouteRecord,
  currentCoordinate: RouteCoordinate,
  force = false,
) {
  const destinationCoordinate = getDestinationCoordinate(route.destinationTerminalId);

  if (!destinationCoordinate) {
    currentDriverGuidance = buildRouteUnavailableGuidanceState(
      currentCoordinate,
      route.coordinates[route.coordinates.length - 1] ?? currentCoordinate,
      route.id,
      new Date().toISOString(),
      'Destination guidance is unavailable until route terminals finish loading.',
    );
    return updateSnapshot();
  }

  if (!force && !shouldRefreshDriverGuidance({
    guidance: currentDriverGuidance,
    currentCoordinate,
    destinationCoordinate,
    sourceRouteId: route.id,
  })) {
    return currentSnapshot;
  }

  const requestId = ++currentDriverGuidanceRequestId;
  const updatedAt = new Date().toISOString();
  const currentProgressSegmentIndex = currentDriverGuidance?.sourceRouteId === route.id
    ? currentDriverGuidance.routeProgressSegmentIndex
    : null;

  try {
    const guidanceRoute = await requestDriverGuidanceRoute({
      currentCoordinate,
      destinationCoordinate,
      storedRouteCoordinates: route.coordinates,
      currentProgressSegmentIndex,
    });

    if (requestId !== currentDriverGuidanceRequestId) {
      return currentSnapshot;
    }

    currentDriverGuidance = buildLiveDriverGuidanceState(
      currentCoordinate,
      destinationCoordinate,
      guidanceRoute.routeCoordinates,
      route.id,
      updatedAt,
      guidanceRoute.routeProgressSegmentIndex,
      guidanceRoute.connectorCoordinates,
    );
  } catch {
    if (requestId !== currentDriverGuidanceRequestId) {
      return currentSnapshot;
    }

    const guidancePlan = buildDriverGuidancePathPlan(
      currentCoordinate,
      route.coordinates,
      destinationCoordinate,
      currentProgressSegmentIndex,
    );
    currentDriverGuidance = buildStoredRouteFallbackGuidanceState(
      currentCoordinate,
      destinationCoordinate,
      guidancePlan.remainingRouteCoordinates,
      route.id,
      updatedAt,
      'Live road guidance unavailable. Showing the remaining assigned route only.',
      guidancePlan.rejoinSegmentIndex,
    );
  }

  return updateSnapshot();
}

async function maybeRefreshDriverGuidanceFromCurrentState(force = false) {
  if (!currentActiveTrip) {
    if (currentDriverGuidance) {
      currentDriverGuidance = null;
      updateSnapshot();
    }
    return currentSnapshot;
  }

  const currentCoordinate = getActiveVehicleCoordinate();
  const route = currentRoutes.find((item) => item.id === currentActiveTrip?.routeId) ?? null;

  if (!currentCoordinate || !route) {
    return currentSnapshot;
  }

  return refreshDriverGuidanceForCurrentTrip(route, currentCoordinate, force);
}

// Operational Reset - clears route, trip, and vehicle state when auth context changes.
function resetOperationalState() {
  currentTerminals = [];
  currentRoutes = [];
  currentVehicles = [];
  currentActiveTrip = null;
  currentDriverGuidance = null;
  currentDriverSelection = createEmptyDriverSelection();
  currentDriverLastLocationRecordedAt = null;
  currentDriverHasFreshLocation = false;
  currentDriverLocationStatus = 'idle';
  updateSnapshot();
}

function clearFirestoreSubscriptions() {
  firestoreUnsubscribers.forEach((unsubscribe) => unsubscribe());
  firestoreUnsubscribers = [];
}

// Firestore Parsing Helpers - validate terminal, route, trip, and vehicle records from Firestore.
function isVehicleType(value: unknown): value is VehicleType {
  return value === 'bus' || value === 'jeep';
}

function isCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && typeof value[0] === 'number'
    && Number.isFinite(value[0])
    && typeof value[1] === 'number'
    && Number.isFinite(value[1]);
}

function parseTerminal(docId: string, data: FirestoreTerminalRecord): TerminalOption | null {
  if (typeof data.label !== 'string' || !isCoordinate(data.coordinate)) {
    return null;
  }

  return {
    id: typeof data.id === 'string' ? data.id : docId,
    label: data.label,
    coordinate: [...data.coordinate],
    isActive: data.isActive !== false,
  };
}

function parseRoute(docId: string, data: FirestoreRouteRecord): RouteRecord | null {
  if (
    typeof data.label !== 'string'
    || typeof data.originTerminalId !== 'string'
    || typeof data.destinationTerminalId !== 'string'
    || !isVehicleType(data.vehicleType)
  ) {
    return null;
  }

  const coordinates = Array.isArray(data.coordinates) && data.coordinates.every(isCoordinate)
    ? data.coordinates
    : deserializeRouteCoordinates(data.coordinates);

  if (!coordinates) {
    return null;
  }

  return {
    id: typeof data.id === 'string' ? data.id : docId,
    label: data.label,
    originTerminalId: data.originTerminalId,
    destinationTerminalId: data.destinationTerminalId,
    vehicleType: data.vehicleType,
    coordinates,
    isActive: data.isActive !== false,
  };
}

function buildVehicleMarkerFromRoute(
  driverId: string,
  route: RouteRecord,
  latitude: number,
  longitude: number,
  speed: number | null,
  recordedAt: string,
): VehicleMarker {
  const speedKph = typeof speed === 'number' && Number.isFinite(speed)
    ? Math.max(speed * 3.6, 0)
    : null;

  return {
    id: driverId,
    type: route.vehicleType,
    coordinate: [longitude, latitude],
    routeId: route.id,
    routeLabel: route.label,
    recordedAt,
    fare: route.vehicleType === 'bus' ? '13' : '15',
    speed: speedKph === null ? 'Unavailable' : `${Math.round(speedKph)} km/h`,
    speedKph,
    distance: 'Live route',
    eta: speedKph === null ? 'Updating...' : 'Live',
  };
}

function parseActiveTrip(docId: string, data: FirestoreActiveTripRecord): ActiveTripState | null {
  if (
    typeof data.routeId !== 'string'
    || typeof data.originTerminalId !== 'string'
    || typeof data.destinationTerminalId !== 'string'
    || typeof data.startedAt !== 'string'
  ) {
    return null;
  }

  const route = currentRoutes.find((item) => item.id === data.routeId);

  return {
    id: docId,
    routeId: data.routeId,
    routeLabel: route?.label ?? data.routeId,
    originTerminalId: data.originTerminalId,
    destinationTerminalId: data.destinationTerminalId,
    originLocationId: null,
    destinationLocationId: null,
    vehicleId: docId,
    startedAt: data.startedAt,
    lastLocationRecordedAt: currentDriverLastLocationRecordedAt,
    locationStatus: currentDriverLocationStatus,
  };
}

function parseVehicleLocation(data: FirestoreVehicleLocationRecord): ParsedVehicleLocation | null {
  if (
    typeof data.driverId !== 'string'
    || typeof data.routeId !== 'string'
    || typeof data.latitude !== 'number'
    || typeof data.longitude !== 'number'
    || typeof data.recordedAt !== 'string'
  ) {
    return null;
  }

  const route = currentRoutes.find((item) => item.id === data.routeId);

  if (!route) {
    return null;
  }

  const speed = typeof data.speed === 'number' ? data.speed : null;
  const isFresh = isVehicleLocationFresh(data.recordedAt);

  return {
    driverId: data.driverId,
    marker: buildVehicleMarkerFromRoute(
      data.driverId,
      route,
      data.latitude,
      data.longitude,
      speed,
      data.recordedAt,
    ),
    recordedAt: data.recordedAt,
    isFresh,
  };
}

// Firestore Subscriptions - binds the active auth user to the live Firestore listeners.
function bindFirestoreListeners(uid: string | null) {
  clearFirestoreSubscriptions();
  currentUserId = uid;

  if (!uid) {
    resetOperationalState();
    return;
  }

  firestoreUnsubscribers = [
    onSnapshot(
      query(collection(db, 'terminals'), where('isActive', '==', true)),
      (snapshot) => {
        currentTerminals = snapshot.docs
          .map((document) => parseTerminal(document.id, document.data() as FirestoreTerminalRecord))
          .filter((terminal): terminal is TerminalOption => Boolean(terminal))
          .sort((left, right) => left.label.localeCompare(right.label));
        updateSnapshot();
        void maybeRefreshDriverGuidanceFromCurrentState();
      },
    ),
    onSnapshot(
      query(collection(db, 'routes'), where('isActive', '==', true)),
      (snapshot) => {
        currentRoutes = snapshot.docs
          .map((document) => parseRoute(document.id, document.data() as FirestoreRouteRecord))
          .filter((route): route is RouteRecord => Boolean(route))
          .sort((left, right) => left.label.localeCompare(right.label));
        updateSnapshot();
        void maybeRefreshDriverGuidanceFromCurrentState();
      },
    ),
    onSnapshot(collection(db, 'vehicleLocations'), (snapshot) => {
      const parsedLocations = snapshot.docs
        .map((document) => parseVehicleLocation(document.data() as FirestoreVehicleLocationRecord))
        .filter((vehicle): vehicle is ParsedVehicleLocation => Boolean(vehicle));

      currentVehicles = parsedLocations
        .filter((vehicle) => vehicle.isFresh)
        .map((vehicle) => vehicle.marker);

      const driverLocation = parsedLocations.find((vehicle) => vehicle.driverId === uid) ?? null;
      currentDriverLastLocationRecordedAt = driverLocation?.recordedAt ?? null;
      currentDriverHasFreshLocation = driverLocation?.isFresh ?? false;

      updateSnapshot();
      void maybeRefreshDriverGuidanceFromCurrentState();
    }),
    onSnapshot(doc(db, 'activeTrips', uid), (snapshot) => {
      currentActiveTrip = snapshot.exists()
        ? parseActiveTrip(snapshot.id, snapshot.data() as FirestoreActiveTripRecord)
        : null;
      updateSnapshot();
      void maybeRefreshDriverGuidanceFromCurrentState(snapshot.exists());
    }),
  ];
}

// Auth Watcher - initializes the one-time auth observer used by live data.
function ensureAuthWatcher() {
  if (authWatcherReady) {
    return;
  }

  authWatcherReady = true;

  onAuthStateChanged(auth, (user) => {
    bindFirestoreListeners(user?.uid ?? null);
  });
}

// Access Guards - enforce signed-in and role checks before mutating live trip state.
async function requireSignedInUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You need to be signed in before using live trip controls.');
  }

  return user;
}

async function requireDriverRole(uid: string) {
  const userSnapshot = await getDoc(doc(db, 'users', uid));

  if (!userSnapshot.exists()) {
    throw new Error('Your profile is missing. Please sign in again.');
  }

  const userData = userSnapshot.data() as FirebaseUserDocument;
  const approvedRoles = normalizeApprovedRoles(userData.approvedRoles);
  const hasLegacyDriverRole = typeof userData.role === 'string' && isAppRole(userData.role) && userData.role === 'driver';

  if (!approvedRoles.includes('driver') && !hasLegacyDriverRole) {
    throw new Error('Driver access is required for this action.');
  }
}

// Route Resolution Guard - ensures trip actions always use a supported stored route.
function getResolvedRouteOrThrow() {
  const route = resolveRouteForTerminals(
    currentRoutes,
    currentDriverSelection.originTerminalId,
    currentDriverSelection.destinationTerminalId,
  );

  if (!route) {
    throw new Error('Select two different terminals with a supported route before starting a trip.');
  }

  return route;
}

// Trip Persistence Helpers - write trip events and initial vehicle state to Firestore.
async function appendTripEvent(
  driverId: string,
  routeId: string,
  eventType: 'trip_started' | 'trip_ended',
  metadata: Record<string, unknown>,
) {
  const recordedAt = new Date().toISOString();

  await addDoc(collection(db, 'tripEvents'), {
    tripId: driverId,
    driverId,
    routeId,
    eventType,
    recordedAt,
    metadata,
  });
}

async function writeInitialVehicleLocation(
  driverId: string,
  route: RouteRecord,
  startedAt: string,
  initialLocation?: StartTripInput,
) {
  const fallbackCoordinate = route.coordinates[0];
  const longitude = initialLocation?.longitude ?? fallbackCoordinate[0];
  const latitude = initialLocation?.latitude ?? fallbackCoordinate[1];
  const heading = initialLocation?.heading ?? 0;
  const speed = initialLocation?.speed ?? 0;
  const accuracy = initialLocation?.accuracy ?? 0;
  const recordedAt = initialLocation?.recordedAt ?? startedAt;

  await setDoc(doc(db, 'vehicleLocations', driverId), {
    driverId,
    tripId: driverId,
    routeId: route.id,
    latitude,
    longitude,
    heading,
    speed,
    accuracy,
    recordedAt,
    updatedAt: recordedAt,
  });

  currentVehicles = [
    ...currentVehicles.filter((vehicle) => vehicle.id !== driverId),
    buildVehicleMarkerFromRoute(driverId, route, latitude, longitude, speed, recordedAt),
  ];
  currentDriverLastLocationRecordedAt = recordedAt;
  currentDriverHasFreshLocation = true;
  currentDriverLocationStatus = 'live';
}

// Firebase Live Data Adapter - exposes the shared live-data contract using Firestore state.
export const firebaseLiveDataService: LiveDataService = {
  async getSnapshot() {
    ensureAuthWatcher();

    if (auth.currentUser && currentUserId !== auth.currentUser.uid) {
      bindFirestoreListeners(auth.currentUser.uid);
    }

    await maybeRefreshDriverGuidanceFromCurrentState();

    return updateSnapshot();
  },

  subscribe(listener) {
    ensureAuthWatcher();
    listeners.add(listener);
    listener(currentSnapshot);

    return () => {
      listeners.delete(listener);
    };
  },

  async selectDriverTerminals({
    originTerminalId,
    destinationTerminalId,
    originLocationId = null,
    destinationLocationId = null,
  }: DriverTerminalSelectionInput) {
    if (
      currentActiveTrip
      && (
        currentActiveTrip.originTerminalId !== originTerminalId
        || currentActiveTrip.destinationTerminalId !== destinationTerminalId
      )
    ) {
      throw new Error('End the current trip before changing the selected terminals.');
    }

    if (originTerminalId && !isSelectableTerminalId(originTerminalId)) {
      throw new Error('Only supported origin terminals can be selected right now.');
    }

    if (destinationTerminalId && !isSelectableTerminalId(destinationTerminalId)) {
      throw new Error('Only supported destination terminals can be selected right now.');
    }

    currentDriverSelection = {
      ...createDriverSelection(
        originTerminalId,
        destinationTerminalId,
        originLocationId,
        destinationLocationId,
      ),
    };

    return updateSnapshot();
  },

  async startTrip(input) {
    const user = await requireSignedInUser();
    await requireDriverRole(user.uid);

    if (currentActiveTrip) {
      throw new Error('Only one active trip is allowed per driver.');
    }

    const route = getResolvedRouteOrThrow();
    const tripRef = doc(db, 'activeTrips', user.uid);
    const activeTripSnapshot = await getDoc(tripRef);

    if (activeTripSnapshot.exists()) {
      throw new Error('Only one active trip is allowed per driver.');
    }

    const startedAt = new Date().toISOString();
    const tripPayload = {
      driverId: user.uid,
      routeId: route.id,
      originTerminalId: route.originTerminalId,
      destinationTerminalId: route.destinationTerminalId,
      status: 'active',
      startedAt,
      updatedAt: startedAt,
    };

    await setDoc(tripRef, tripPayload);
    await writeInitialVehicleLocation(user.uid, route, startedAt, input);
    await appendTripEvent(user.uid, route.id, 'trip_started', {
      originTerminalId: route.originTerminalId,
      destinationTerminalId: route.destinationTerminalId,
    });

    currentActiveTrip = {
      id: user.uid,
      routeId: route.id,
      routeLabel: route.label,
      originTerminalId: route.originTerminalId,
      destinationTerminalId: route.destinationTerminalId,
      originLocationId: currentDriverSelection.originLocationId,
      destinationLocationId: currentDriverSelection.destinationLocationId,
      vehicleId: user.uid,
      startedAt,
      lastLocationRecordedAt: startedAt,
      locationStatus: 'live',
    };

    updateSnapshot();

    return refreshDriverGuidanceForCurrentTrip(
      route,
      [input?.longitude ?? route.coordinates[0][0], input?.latitude ?? route.coordinates[0][1]],
      true,
    );
  },

  async endTrip() {
    const user = await requireSignedInUser();
    await requireDriverRole(user.uid);

    const tripRef = doc(db, 'activeTrips', user.uid);
    const activeTripSnapshot = await getDoc(tripRef);

    if (!activeTripSnapshot.exists()) {
      throw new Error('No active trip exists to end.');
    }

    const tripData = activeTripSnapshot.data() as FirestoreActiveTripRecord;
    const routeId = typeof tripData.routeId === 'string' ? tripData.routeId : currentActiveTrip?.routeId;

    if (!routeId) {
      throw new Error('The active trip record is malformed.');
    }

    await appendTripEvent(user.uid, routeId, 'trip_ended', {
      endedAt: new Date().toISOString(),
    });
    await deleteDoc(doc(db, 'vehicleLocations', user.uid));
    await deleteDoc(tripRef);

    const endedOriginTerminalId = currentActiveTrip?.originTerminalId
      ?? (typeof tripData.originTerminalId === 'string' ? tripData.originTerminalId : null);
    const endedDestinationTerminalId = currentActiveTrip?.destinationTerminalId
      ?? (typeof tripData.destinationTerminalId === 'string' ? tripData.destinationTerminalId : null);

    currentDriverSelection = endedOriginTerminalId && endedDestinationTerminalId
      ? buildReverseDriverSelection(
        endedOriginTerminalId,
        endedDestinationTerminalId,
        currentActiveTrip?.originLocationId ?? null,
        currentActiveTrip?.destinationLocationId ?? null,
      )
      : createEmptyDriverSelection();
    currentActiveTrip = null;
    currentDriverGuidance = null;
    currentVehicles = currentVehicles.filter((vehicle) => vehicle.id !== user.uid);
    currentDriverLastLocationRecordedAt = null;
    currentDriverHasFreshLocation = false;
    currentDriverLocationStatus = 'idle';

    return updateSnapshot();
  },

  async publishDriverLocation(input: PublishDriverLocationInput) {
    const user = await requireSignedInUser();
    await requireDriverRole(user.uid);

    const tripRef = doc(db, 'activeTrips', user.uid);
    const activeTripSnapshot = await getDoc(tripRef);

    if (!activeTripSnapshot.exists()) {
      throw new Error('Start a trip before publishing driver location.');
    }

    const tripData = activeTripSnapshot.data() as FirestoreActiveTripRecord;

    if (tripData.routeId !== input.routeId) {
      throw new Error('Location updates must match the driver’s active route.');
    }

    const route = currentRoutes.find((item) => item.id === input.routeId);

    if (!route) {
      throw new Error('The active route is not available for location publishing.');
    }

    const recordedAt = input.recordedAt ?? new Date().toISOString();

    await setDoc(doc(db, 'vehicleLocations', user.uid), {
      driverId: user.uid,
      tripId: user.uid,
      routeId: input.routeId,
      latitude: input.latitude,
      longitude: input.longitude,
      heading: input.heading ?? 0,
      speed: input.speed ?? 0,
      accuracy: input.accuracy ?? 0,
      recordedAt,
      updatedAt: recordedAt,
    });

    currentVehicles = [
      ...currentVehicles.filter((vehicle) => vehicle.id !== user.uid),
      buildVehicleMarkerFromRoute(
        user.uid,
        route,
        input.latitude,
        input.longitude,
        input.speed ?? null,
        recordedAt,
      ),
    ];
    currentDriverLastLocationRecordedAt = recordedAt;
    currentDriverHasFreshLocation = true;
    currentDriverLocationStatus = 'live';

    updateSnapshot();

    return refreshDriverGuidanceForCurrentTrip(
      route,
      [input.longitude, input.latitude],
    );
  },

  async reset() {
    clearFirestoreSubscriptions();
    currentUserId = null;
    resetOperationalState();
    return currentSnapshot;
  },
};
