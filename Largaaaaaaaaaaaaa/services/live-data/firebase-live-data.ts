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
import { createEmptyDriverSelection, deserializeRouteCoordinates, resolveRouteForTerminals, type DriverSelectionState, type RouteRecord, type TerminalOption, type VehicleType } from '@/lib/domain/transport';
import type { ActiveTripState, LiveDataService, LiveDataSnapshot, PublishDriverLocationInput, VehicleMarker } from '@/services/contracts/live-data';
import { COMMUTER_NOTIFICATIONS, DRIVER_NOTIFICATIONS } from '@/services/fixtures/notifications';

interface FirebaseUserDocument {
  role?: unknown;
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
let currentDriverSelection: DriverSelectionState = createEmptyDriverSelection();
let currentSnapshot: LiveDataSnapshot = buildSnapshot();

// Snapshot Builder - creates a fresh immutable snapshot for provider consumers.
function cloneVehicle(vehicle: VehicleMarker): VehicleMarker {
  return {
    ...vehicle,
    coordinate: [...vehicle.coordinate] as [number, number],
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

function updateSnapshot() {
  syncDriverSelectionFromCurrentState();
  currentSnapshot = buildSnapshot();
  notify();
  return currentSnapshot;
}

// Operational Reset - clears route, trip, and vehicle state when auth context changes.
function resetOperationalState() {
  currentTerminals = [];
  currentRoutes = [];
  currentVehicles = [];
  currentActiveTrip = null;
  currentDriverSelection = createEmptyDriverSelection();
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
): VehicleMarker {
  const speedKph = typeof speed === 'number' && Number.isFinite(speed) ? Math.max(speed, 0) : null;

  return {
    id: driverId,
    type: route.vehicleType,
    coordinate: [longitude, latitude],
    routeId: route.id,
    routeLabel: route.label,
    fare: route.vehicleType === 'bus' ? '13' : '15',
    speed: speedKph === null ? 'Unavailable' : `${Math.round(speedKph)} KM / Hour`,
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
    vehicleId: docId,
    startedAt: data.startedAt,
  };
}

function parseVehicleLocation(data: FirestoreVehicleLocationRecord): VehicleMarker | null {
  if (
    typeof data.driverId !== 'string'
    || typeof data.routeId !== 'string'
    || typeof data.latitude !== 'number'
    || typeof data.longitude !== 'number'
  ) {
    return null;
  }

  const route = currentRoutes.find((item) => item.id === data.routeId);

  if (!route) {
    return null;
  }

  const speed = typeof data.speed === 'number' ? data.speed : null;

  return buildVehicleMarkerFromRoute(
    data.driverId,
    route,
    data.latitude,
    data.longitude,
    speed,
  );
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
      },
    ),
    onSnapshot(collection(db, 'vehicleLocations'), (snapshot) => {
      currentVehicles = snapshot.docs
        .map((document) => parseVehicleLocation(document.data() as FirestoreVehicleLocationRecord))
        .filter((vehicle): vehicle is VehicleMarker => Boolean(vehicle));
      updateSnapshot();
    }),
    onSnapshot(doc(db, 'activeTrips', uid), (snapshot) => {
      currentActiveTrip = snapshot.exists()
        ? parseActiveTrip(snapshot.id, snapshot.data() as FirestoreActiveTripRecord)
        : null;
      updateSnapshot();
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

  if (userData.role !== 'driver') {
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

async function writeInitialVehicleLocation(driverId: string, route: RouteRecord, startedAt: string) {
  const [longitude, latitude] = route.coordinates[0];

  await setDoc(doc(db, 'vehicleLocations', driverId), {
    driverId,
    tripId: driverId,
    routeId: route.id,
    latitude,
    longitude,
    heading: 0,
    speed: 0,
    accuracy: 0,
    recordedAt: startedAt,
    updatedAt: startedAt,
  });

  currentVehicles = [
    ...currentVehicles.filter((vehicle) => vehicle.id !== driverId),
    buildVehicleMarkerFromRoute(driverId, route, latitude, longitude, 0),
  ];
}

// Firebase Live Data Adapter - exposes the shared live-data contract using Firestore state.
export const firebaseLiveDataService: LiveDataService = {
  async getSnapshot() {
    ensureAuthWatcher();

    if (auth.currentUser && currentUserId !== auth.currentUser.uid) {
      bindFirestoreListeners(auth.currentUser.uid);
    }

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

  async selectDriverTerminals(originTerminalId: string | null, destinationTerminalId: string | null) {
    if (
      currentActiveTrip
      && (
        currentActiveTrip.originTerminalId !== originTerminalId
        || currentActiveTrip.destinationTerminalId !== destinationTerminalId
      )
    ) {
      throw new Error('End the current trip before changing the selected terminals.');
    }

    currentDriverSelection = {
      originTerminalId,
      destinationTerminalId,
      resolvedRouteId: null,
      resolvedRouteLabel: null,
    };

    return updateSnapshot();
  },

  async startTrip() {
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
    await writeInitialVehicleLocation(user.uid, route, startedAt);
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
      vehicleId: user.uid,
      startedAt,
    };

    return updateSnapshot();
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

    currentActiveTrip = null;
    currentVehicles = currentVehicles.filter((vehicle) => vehicle.id !== user.uid);

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
      ),
    ];

    return updateSnapshot();
  },

  async reset() {
    clearFirestoreSubscriptions();
    currentUserId = null;
    resetOperationalState();
    return currentSnapshot;
  },
};
