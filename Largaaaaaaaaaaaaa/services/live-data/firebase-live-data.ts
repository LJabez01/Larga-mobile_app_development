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
import {
  createEmptyCommuterEtaState,
  resolveStopAwareEta,
  type CommuterEtaState,
} from '@/lib/domain/commuter-eta';
import {
  buildCommuterPresenceRecord,
  buildCommuterVisibleVehicles,
  buildDriverVisibleCommuters,
  isCommuterPresenceFresh,
  type CommuterPresenceRecord,
  type CommuterPresenceStatus,
  type CommuterReferenceSource,
  type CommuterVisibleVehicle,
  type DriverVisibleCommuter,
} from '@/lib/domain/commuter-visibility';
import { isAppRole, normalizeApprovedRoles } from '@/lib/domain/auth';
import {
  buildDriverGuidancePathPlan,
  buildLiveDriverGuidanceState,
  buildRouteGeometrySignature,
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
  CommuterRideSelectionState,
  DriverTerminalSelectionInput,
  LiveDataService,
  LiveDataSnapshot,
  PublishCommuterPresenceInput,
  PublishDriverLocationInput,
  StartTripInput,
  VehicleMarker,
} from '@/services/contracts/live-data';
import { COMMUTER_NOTIFICATIONS, DRIVER_NOTIFICATIONS } from '@/services/fixtures/notifications';
import { getDestinationRouteCoordinate } from '@/services/live-data/guidance-destination';
import { requestDriverGuidanceRoute } from '@/services/live-data/mapbox-guidance';
import {
  createEmptyCommuterRideSelection,
  reconcileCommuterRideSelection,
  selectCommuterRideVehicle,
  setCommuterRideFareDestination,
  setCommuterRideFareOrigin,
} from '@/services/live-data/commuter-ride-selection';
import {
  buildActiveTripPayload,
  resolveEndedTripDriverSelection,
  type PersistedActiveTripRecord,
} from '@/services/live-data/trip-lifecycle';
import {
  resolveTripStartLocation,
  shouldTrustTripStartupLocationForGuidance,
} from '@/services/live-data/trip-start-location';
import { buildVehicleLocationSubscriptionPlan } from '@/services/live-data/vehicle-location-subscriptions';
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
  reconnectAccessCoordinates?: unknown;
  isActive?: unknown;
}

interface FirestoreTerminalRecord {
  id?: unknown;
  label?: unknown;
  coordinate?: unknown;
  isActive?: unknown;
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

interface FirestoreCommuterPresenceRecord {
  commuterId?: unknown;
  status?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  referenceSource?: unknown;
  nearbyRouteIds?: unknown;
  recordedAt?: unknown;
  updatedAt?: unknown;
}

interface ParsedVehicleLocation {
  driverId: string;
  marker: VehicleMarker;
  recordedAt: string;
  isFresh: boolean;
  accuracy: number | null;
}

const listeners = new Set<(snapshot: LiveDataSnapshot) => void>();
const sharedNotifications = {
  commuter: COMMUTER_NOTIFICATIONS.map((notification) => ({ ...notification })),
  driver: DRIVER_NOTIFICATIONS.map((notification) => ({ ...notification })),
};

let authWatcherReady = false;
let firestoreUnsubscribers: Unsubscribe[] = [];
let commuterPresenceUnsubscriber: Unsubscribe | null = null;
let commuterPresenceRouteSubscriptionId: string | null = null;
let vehicleLocationUnsubscribers: Unsubscribe[] = [];
let vehicleLocationSubscriptionKey: string | null = null;
let vehicleLocationRecordsBySource = new Map<string, Map<string, FirestoreVehicleLocationRecord>>();
let currentUserId: string | null = null;
let currentTerminals: TerminalOption[] = [];
let currentRoutes: RouteRecord[] = [];
let currentVehicles: VehicleMarker[] = [];
let currentActiveTrip: ActiveTripState | null = null;
let currentDriverGuidance: DriverGuidanceState | null = null;
let currentCommuterPresence: CommuterPresenceRecord | null = null;
let currentDriverRelevantCommuterPresence: CommuterPresenceRecord[] = [];
let currentCommuterVisibleVehicles: CommuterVisibleVehicle[] = [];
let currentDriverVisibleCommuters: DriverVisibleCommuter[] = [];
let currentCommuterEtaStateByVehicleId = new Map<string, CommuterEtaState>();
let currentCommuterRideSelection: CommuterRideSelectionState = createEmptyCommuterRideSelection();
let currentDriverSelection: DriverSelectionState = createEmptyDriverSelection();
let currentDriverLastLocationRecordedAt: string | null = null;
let currentDriverLastLocationAccuracy: number | null = null;
let currentDriverHasFreshLocation = false;
let currentDriverLocationStatus: DriverLocationStatus = 'idle';
let currentDriverGuidanceRequestId = 0;
let currentSnapshot: LiveDataSnapshot = buildSnapshot();

// Snapshot Builder - creates a fresh immutable snapshot for provider consumers.
// Vehicle Clone - copies vehicle marker data before exposing it through snapshots.
function cloneVehicle(vehicle: VehicleMarker): VehicleMarker {
  return {
    ...vehicle,
    coordinate: [...vehicle.coordinate] as [number, number],
  };
}

// Driver Guidance Clone - copies nested route guidance coordinates for immutable snapshot consumers.
function cloneDriverGuidance(guidance: DriverGuidanceState): DriverGuidanceState {
  return {
    ...guidance,
    sourceRouteGeometrySignature: guidance.sourceRouteGeometrySignature,
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

// Commuter Presence Clone - copies commuter wait-state data before publishing provider snapshots.
function cloneCommuterPresence(presence: CommuterPresenceRecord): CommuterPresenceRecord {
  return {
    ...presence,
    coordinate: [...presence.coordinate] as RouteCoordinate,
    nearbyRouteIds: [...presence.nearbyRouteIds],
  };
}

// Commuter Visible Vehicle Clone - copies route-relevant vehicle visibility rows.
function cloneCommuterVisibleVehicle(vehicle: CommuterVisibleVehicle): CommuterVisibleVehicle {
  return {
    ...vehicle,
    coordinate: [...vehicle.coordinate] as RouteCoordinate,
  };
}

// Driver Visible Commuter Clone - copies route-relevant commuter visibility rows.
function cloneDriverVisibleCommuter(commuter: DriverVisibleCommuter): DriverVisibleCommuter {
  return {
    ...commuter,
    coordinate: [...commuter.coordinate] as RouteCoordinate,
    nearbyRouteIds: [...commuter.nearbyRouteIds],
  };
}

// Live Snapshot Builder - composes the provider snapshot from catalog, trip, vehicle, and visibility state.
function buildSnapshot(): LiveDataSnapshot {
  return {
    terminals: currentTerminals.map((terminal) => ({
      ...terminal,
      coordinate: [...terminal.coordinate] as [number, number],
    })),
    routes: currentRoutes.map((route) => ({
      ...route,
      coordinates: route.coordinates.map((coordinate) => [...coordinate] as [number, number]),
      reconnectAccessCoordinates: route.reconnectAccessCoordinates
        ? route.reconnectAccessCoordinates.map((coordinate) => [...coordinate] as [number, number])
        : null,
    })),
    activeTrip: currentActiveTrip ? { ...currentActiveTrip } : null,
    driverGuidance: currentDriverGuidance ? cloneDriverGuidance(currentDriverGuidance) : null,
    commuterPresence: currentCommuterPresence ? cloneCommuterPresence(currentCommuterPresence) : null,
    commuterVisibleVehicles: currentCommuterVisibleVehicles.map(cloneCommuterVisibleVehicle),
    driverVisibleCommuters: currentDriverVisibleCommuters.map(cloneDriverVisibleCommuter),
    vehicles: currentVehicles.map(cloneVehicle),
    commuterRideSelection: { ...currentCommuterRideSelection },
    driverSelection: { ...currentDriverSelection },
    notificationsByRole: {
      commuter: sharedNotifications.commuter.map((notification) => ({ ...notification })),
      driver: sharedNotifications.driver.map((notification) => ({ ...notification })),
    },
  };
}

// Snapshot Sync - keeps the shared live-data snapshot and subscribers up to date.
// Live Snapshot Broadcast - sends the current live-data snapshot to all provider listeners.
function notify() {
  listeners.forEach((listener) => listener(currentSnapshot));
}

// Driver Selection Sync - keeps selected terminals aligned with the active trip or resolved route.
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

// Active Trip Location Sync - derives live/stale/missing trip status from the latest vehicle point.
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

// Commuter Visibility Sync - recalculates route-relevant vehicles and commuters after state changes.
function syncCommuterVisibilityState() {
  const nextVisibleVehicles = currentCommuterPresence
    ? buildCommuterVisibleVehicles({
      routes: currentRoutes,
      vehicles: currentVehicles,
      commuterCoordinate: currentCommuterPresence.coordinate,
      routeIds: currentCommuterPresence.nearbyRouteIds,
    })
    : [];
  const nextEtaStateByVehicleId = new Map<string, CommuterEtaState>();

  currentCommuterVisibleVehicles = nextVisibleVehicles
    .map((vehicle) => {
      const previousEtaState = currentCommuterEtaStateByVehicleId.get(vehicle.id)
        ?? createEmptyCommuterEtaState();
      const etaResolution = resolveStopAwareEta({
        distanceMeters: vehicle.distanceMeters,
        speedKph: vehicle.speedKph,
        recordedAt: vehicle.recordedAt,
        previousState: previousEtaState,
      });

      nextEtaStateByVehicleId.set(vehicle.id, etaResolution.state);

      return {
        ...vehicle,
        etaMinutes: etaResolution.etaMinutes,
      };
    })
    .sort((left, right) => {
      if (left.etaMinutes === null && right.etaMinutes === null) {
        return 0;
      }

      if (left.etaMinutes === null) {
        return 1;
      }

      if (right.etaMinutes === null) {
        return -1;
      }

      return left.etaMinutes - right.etaMinutes;
    });
  currentCommuterEtaStateByVehicleId = nextEtaStateByVehicleId;

  const activeTripRoute = currentActiveTrip
    ? currentRoutes.find((route) => route.id === currentActiveTrip?.routeId) ?? null
    : null;

  currentDriverVisibleCommuters = activeTripRoute
    ? buildDriverVisibleCommuters({
      route: activeTripRoute,
      commuters: currentDriverRelevantCommuterPresence,
      routeProgressSegmentIndex: currentActiveTrip?.routeProgressSegmentIndex ?? null,
    })
    : [];
}

// Route Progress Normalizer - validates persisted route progress before using it for guidance.
function normalizeRouteProgressSegmentIndex(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function syncCommuterRideSelectionState() {
  currentCommuterRideSelection = reconcileCommuterRideSelection(
    currentCommuterRideSelection,
    currentCommuterVisibleVehicles,
  );
}

// Current Route Progress Lookup - reads active-trip route progress for the requested route.
function getCurrentRouteProgressSegmentIndex(routeId: string) {
  const activeTripProgress = currentActiveTrip?.routeId === routeId
    ? currentActiveTrip.routeProgressSegmentIndex
    : null;
  const guidanceProgress = currentDriverGuidance?.sourceRouteId === routeId
    ? currentDriverGuidance.routeProgressSegmentIndex
    : null;

  return Math.max(activeTripProgress ?? -1, guidanceProgress ?? -1, 0) || 0;
}

// Active Trip Progress Persistence - stores updated route progress when guidance advances.
async function persistActiveTripProgress(
  userId: string,
  routeProgressSegmentIndex: number | null,
  recordedAt: string,
) {
  if (!currentActiveTrip || currentActiveTrip.id !== userId) {
    return;
  }

  if (currentActiveTrip.routeProgressSegmentIndex === routeProgressSegmentIndex) {
    return;
  }

  currentActiveTrip = {
    ...currentActiveTrip,
    routeProgressSegmentIndex,
  };

  await setDoc(doc(db, 'activeTrips', userId), {
    routeProgressSegmentIndex,
    updatedAt: recordedAt,
  }, { merge: true });
}

// Live State Refresh - syncs derived state, rebuilds the snapshot, and notifies subscribers.
function updateSnapshot() {
  syncDriverSelectionFromCurrentState();
  syncActiveTripLocationState();
  syncCommuterVisibilityState();
  syncCommuterRideSelectionState();
  currentSnapshot = buildSnapshot();
  notify();
  return currentSnapshot;
}

// Active Vehicle Coordinate Lookup - returns the current vehicle coordinate for active guidance.
function getActiveVehicleCoordinate() {
  if (!currentActiveTrip) {
    return null;
  }

  const activeTrip = currentActiveTrip;
  const activeVehicle = currentVehicles.find((vehicle) => vehicle.id === activeTrip.vehicleId);

  return activeVehicle?.coordinate ?? null;
}

// Trusted Guidance Context - chooses whether live start GPS or stored corridor should seed guidance.
function getTrustedGuidanceContext(
  route: RouteRecord,
  fallbackCoordinate: RouteCoordinate,
) {
  const activeVehicleCoordinate = getActiveVehicleCoordinate();

  if (!activeVehicleCoordinate || !currentActiveTrip) {
    return {
      coordinate: fallbackCoordinate,
      progressSegmentIndexOverride: null as number | null,
    };
  }

  if (shouldTrustTripStartupLocationForGuidance({
    route,
    currentCoordinate: activeVehicleCoordinate,
    accuracy: currentDriverLastLocationAccuracy,
    startedAt: currentActiveTrip.startedAt,
  })) {
    return {
      coordinate: activeVehicleCoordinate,
      progressSegmentIndexOverride: null as number | null,
    };
  }

  return {
    coordinate: activeVehicleCoordinate,
    progressSegmentIndexOverride: 0,
  };
}

// Driver Guidance Refresh - rebuilds live or fallback guidance for the current active trip.
async function refreshDriverGuidanceForCurrentTrip(
  route: RouteRecord,
  currentCoordinate: RouteCoordinate,
  force = false,
) {
  const destinationCoordinate = getDestinationRouteCoordinate(route, currentTerminals);
  const sourceRouteGeometrySignature = buildRouteGeometrySignature(
    route.coordinates,
    route.reconnectAccessCoordinates ?? null,
  );

  if (!destinationCoordinate) {
    currentDriverGuidance = buildRouteUnavailableGuidanceState(
      currentCoordinate,
      route.coordinates[route.coordinates.length - 1] ?? currentCoordinate,
      route.id,
      new Date().toISOString(),
      'Destination guidance is unavailable until route terminals finish loading.',
      sourceRouteGeometrySignature,
    );
    return updateSnapshot();
  }

  if (!force && !shouldRefreshDriverGuidance({
    guidance: currentDriverGuidance,
    currentCoordinate,
    destinationCoordinate,
    sourceRouteId: route.id,
    sourceRouteGeometrySignature,
  })) {
    return currentSnapshot;
  }

  const requestId = ++currentDriverGuidanceRequestId;
  const updatedAt = new Date().toISOString();
  const trustedGuidanceContext = getTrustedGuidanceContext(route, currentCoordinate);
  const currentProgressSegmentIndex = trustedGuidanceContext.progressSegmentIndexOverride
    ?? getCurrentRouteProgressSegmentIndex(route.id);
  let nextRouteProgressSegmentIndex: number | null = currentProgressSegmentIndex;

  try {
    const guidanceRoute = await requestDriverGuidanceRoute({
      currentCoordinate: trustedGuidanceContext.coordinate,
      destinationCoordinate,
      storedRouteCoordinates: route.coordinates,
      reconnectAccessCoordinates: route.reconnectAccessCoordinates ?? null,
      currentProgressSegmentIndex,
    });

    if (requestId !== currentDriverGuidanceRequestId) {
      return currentSnapshot;
    }

    currentDriverGuidance = buildLiveDriverGuidanceState(
      trustedGuidanceContext.coordinate,
      destinationCoordinate,
      guidanceRoute.routeCoordinates,
      route.id,
      updatedAt,
      guidanceRoute.routeProgressSegmentIndex,
      guidanceRoute.connectorCoordinates,
      sourceRouteGeometrySignature,
    );
    nextRouteProgressSegmentIndex = guidanceRoute.routeProgressSegmentIndex;
  } catch {
    if (requestId !== currentDriverGuidanceRequestId) {
      return currentSnapshot;
    }

    const guidancePlan = buildDriverGuidancePathPlan(
      trustedGuidanceContext.coordinate,
      route.coordinates,
      destinationCoordinate,
      currentProgressSegmentIndex,
    );
    currentDriverGuidance = buildStoredRouteFallbackGuidanceState(
      trustedGuidanceContext.coordinate,
      destinationCoordinate,
      guidancePlan.remainingRouteCoordinates,
      route.id,
      updatedAt,
      'Live road guidance unavailable. Showing the remaining assigned route only.',
      guidancePlan.rejoinSegmentIndex,
      sourceRouteGeometrySignature,
    );
    nextRouteProgressSegmentIndex = guidancePlan.rejoinSegmentIndex;
  }

  if (currentUserId) {
    await persistActiveTripProgress(
      currentUserId,
      nextRouteProgressSegmentIndex,
      updatedAt,
    );
  }

  return updateSnapshot();
}

// Conditional Guidance Refresh - refreshes guidance only when movement or stale data requires it.
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
// Operational State Reset - clears live trip, visibility, and selection state after auth/session changes.
function resetOperationalState() {
  currentTerminals = [];
  currentRoutes = [];
  currentVehicles = [];
  currentActiveTrip = null;
  currentDriverGuidance = null;
  currentCommuterPresence = null;
  currentDriverRelevantCommuterPresence = [];
  currentCommuterVisibleVehicles = [];
  currentDriverVisibleCommuters = [];
  currentCommuterEtaStateByVehicleId = new Map<string, CommuterEtaState>();
  currentCommuterRideSelection = createEmptyCommuterRideSelection();
  currentDriverSelection = createEmptyDriverSelection();
  currentDriverLastLocationRecordedAt = null;
  currentDriverLastLocationAccuracy = null;
  currentDriverHasFreshLocation = false;
  currentDriverLocationStatus = 'idle';
  updateSnapshot();
}

// Firestore Subscription Cleanup - unsubscribes all live listeners before rebinding or resetting.
function clearFirestoreSubscriptions() {
  firestoreUnsubscribers.forEach((unsubscribe) => unsubscribe());
  firestoreUnsubscribers = [];

  if (commuterPresenceUnsubscriber) {
    commuterPresenceUnsubscriber();
    commuterPresenceUnsubscriber = null;
  }

  commuterPresenceRouteSubscriptionId = null;
  vehicleLocationUnsubscribers.forEach((unsubscribe) => unsubscribe());
  vehicleLocationUnsubscribers = [];
  vehicleLocationSubscriptionKey = null;
  vehicleLocationRecordsBySource = new Map<string, Map<string, FirestoreVehicleLocationRecord>>();
  syncVehicleLocationStateFromCurrentSources();
}

// Firestore Parsing Helpers - validate terminal, route, trip, and vehicle records from Firestore.
// Vehicle Type Guard - validates Firestore vehicle type values for map markers.
function isVehicleType(value: unknown): value is VehicleType {
  return value === 'bus' || value === 'jeep';
}

// Coordinate Guard - validates Firestore coordinate tuples before rendering or routing.
function isCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && typeof value[0] === 'number'
    && Number.isFinite(value[0])
    && typeof value[1] === 'number'
    && Number.isFinite(value[1]);
}

// Terminal Parser - converts Firestore terminal records into route picker options.
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

// Route Parser - converts Firestore route records into active route catalog entries.
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
  const reconnectAccessCoordinates = Array.isArray(data.reconnectAccessCoordinates)
    && data.reconnectAccessCoordinates.every(isCoordinate)
    ? data.reconnectAccessCoordinates
    : deserializeRouteCoordinates(data.reconnectAccessCoordinates);

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
    reconnectAccessCoordinates,
    isActive: data.isActive !== false,
  };
}

// Vehicle Marker Builder - combines trip, route, and GPS data into a map vehicle marker.
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
    speed: speedKph === null ? 'Unavailable' : `${Math.round(speedKph)} km/h`,
    speedKph,
    distance: 'Live route',
    eta: speedKph === null ? 'Updating...' : 'Live',
  };
}

// Active Trip Parser - validates the current driver trip document from Firestore.
function parseActiveTrip(docId: string, data: PersistedActiveTripRecord): ActiveTripState | null {
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
    originLocationId: typeof data.originLocationId === 'string' ? data.originLocationId : null,
    destinationLocationId: typeof data.destinationLocationId === 'string' ? data.destinationLocationId : null,
    vehicleId: docId,
    startedAt: data.startedAt,
    lastLocationRecordedAt: currentDriverLastLocationRecordedAt,
    locationStatus: currentDriverLocationStatus,
    routeProgressSegmentIndex: normalizeRouteProgressSegmentIndex(data.routeProgressSegmentIndex),
  };
}

// Vehicle Location Parser - validates the live vehicle GPS record used by trip tracking.
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
  const accuracy = typeof data.accuracy === 'number' && Number.isFinite(data.accuracy)
    ? data.accuracy
    : null;
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
    accuracy,
  };
}

function syncVehicleLocationStateFromCurrentSources() {
  const mergedVehicleLocationRecords = new Map<string, FirestoreVehicleLocationRecord>();

  vehicleLocationRecordsBySource.forEach((sourceRecords) => {
    sourceRecords.forEach((record, driverId) => {
      mergedVehicleLocationRecords.set(driverId, record);
    });
  });

  const parsedLocations = Array.from(mergedVehicleLocationRecords.values())
    .map((record) => parseVehicleLocation(record))
    .filter((vehicle): vehicle is ParsedVehicleLocation => Boolean(vehicle));

  currentVehicles = parsedLocations
    .filter((vehicle) => vehicle.isFresh)
    .map((vehicle) => vehicle.marker);
  currentCommuterEtaStateByVehicleId = new Map(
    Array.from(currentCommuterEtaStateByVehicleId.entries()).filter(([vehicleId]) => (
      currentVehicles.some((vehicle) => vehicle.id === vehicleId)
    )),
  );

  const driverLocation = currentUserId
    ? parsedLocations.find((vehicle) => vehicle.driverId === currentUserId) ?? null
    : null;

  currentDriverLastLocationRecordedAt = driverLocation?.recordedAt ?? null;
  currentDriverLastLocationAccuracy = driverLocation?.accuracy ?? null;
  currentDriverHasFreshLocation = driverLocation?.isFresh ?? false;
}

function setVehicleLocationSourceRecords(
  sourceId: string,
  records: Map<string, FirestoreVehicleLocationRecord>,
) {
  vehicleLocationRecordsBySource.set(sourceId, records);
  syncVehicleLocationStateFromCurrentSources();
}

function setVehicleLocationSourceRecord(
  sourceId: string,
  docId: string,
  record: FirestoreVehicleLocationRecord,
) {
  const sourceRecords = new Map(vehicleLocationRecordsBySource.get(sourceId) ?? []);
  sourceRecords.set(docId, record);
  setVehicleLocationSourceRecords(sourceId, sourceRecords);
}

function clearVehicleLocationSource(sourceId: string) {
  if (!vehicleLocationRecordsBySource.delete(sourceId)) {
    return;
  }

  syncVehicleLocationStateFromCurrentSources();
}

function removeVehicleLocationDocumentFromAllSources(docId: string) {
  let didChange = false;

  vehicleLocationRecordsBySource.forEach((sourceRecords, sourceId) => {
    if (!sourceRecords.has(docId)) {
      return;
    }

    didChange = true;
    const nextSourceRecords = new Map(sourceRecords);
    nextSourceRecords.delete(docId);

    if (nextSourceRecords.size === 0) {
      vehicleLocationRecordsBySource.delete(sourceId);
      return;
    }

    vehicleLocationRecordsBySource.set(sourceId, nextSourceRecords);
  });

  if (didChange) {
    syncVehicleLocationStateFromCurrentSources();
  }
}

function publishVehicleLocationStateChange() {
  syncVehicleLocationStateFromCurrentSources();
  updateSnapshot();
  void maybeRefreshDriverGuidanceFromCurrentState();
}

// Commuter Presence Status Guard - accepts only supported commuter wait-state values.
function isCommuterPresenceStatus(value: unknown): value is CommuterPresenceStatus {
  return value === 'waiting' || value === 'active';
}

// Commuter Reference Source Guard - validates whether commuter location came from GPS or manual reference.
function isCommuterReferenceSource(value: unknown): value is CommuterReferenceSource {
  return value === 'gps' || value === 'manual';
}

// Commuter Presence Parser - validates route-scoped commuter presence records from Firestore.
function parseCommuterPresence(
  docId: string,
  data: FirestoreCommuterPresenceRecord,
): CommuterPresenceRecord | null {
  if (
    typeof data.commuterId !== 'string'
    || data.commuterId !== docId
    || !isCommuterPresenceStatus(data.status)
    || typeof data.latitude !== 'number'
    || !Number.isFinite(data.latitude)
    || typeof data.longitude !== 'number'
    || !Number.isFinite(data.longitude)
    || !isCommuterReferenceSource(data.referenceSource)
    || !Array.isArray(data.nearbyRouteIds)
    || !data.nearbyRouteIds.every((routeId) => typeof routeId === 'string')
    || typeof data.recordedAt !== 'string'
    || typeof data.updatedAt !== 'string'
  ) {
    return null;
  }

  return {
    id: docId,
    coordinate: [data.longitude, data.latitude],
    status: data.status,
    referenceSource: data.referenceSource,
    nearbyRouteIds: [...new Set(data.nearbyRouteIds)],
    recordedAt: data.recordedAt,
    updatedAt: data.updatedAt,
  };
}

// Driver Commuter Presence Binding - listens only to commuter presence for the driver's active route.
function bindDriverCommuterPresenceSubscription(routeId: string | null) {
  if (commuterPresenceRouteSubscriptionId === routeId) {
    return;
  }

  if (commuterPresenceUnsubscriber) {
    commuterPresenceUnsubscriber();
    commuterPresenceUnsubscriber = null;
  }

  commuterPresenceRouteSubscriptionId = routeId;
  currentDriverRelevantCommuterPresence = [];

  if (!routeId) {
    return;
  }

  commuterPresenceUnsubscriber = onSnapshot(
    collection(db, 'routeCommuterPresence', routeId, 'commuters'),
    (snapshot) => {
      currentDriverRelevantCommuterPresence = snapshot.docs
        .map((document) => parseCommuterPresence(
          document.id,
          document.data() as FirestoreCommuterPresenceRecord,
        ))
        .filter((presence): presence is CommuterPresenceRecord => (
          presence !== null
          && presence.id !== currentUserId
          && isCommuterPresenceFresh(presence.recordedAt)
        ));
      updateSnapshot();
    },
    () => {
      if (commuterPresenceRouteSubscriptionId !== routeId) {
        return;
      }

      commuterPresenceUnsubscriber = null;
      commuterPresenceRouteSubscriptionId = null;
      currentDriverRelevantCommuterPresence = [];
      updateSnapshot();
    },
  );
}

function bindVehicleLocationSubscriptions(uid: string | null) {
  const subscriptionPlan = buildVehicleLocationSubscriptionPlan({
    activeVehicleId: currentActiveTrip?.vehicleId ?? null,
    commuterNearbyRouteIds: currentCommuterPresence?.nearbyRouteIds ?? [],
  });
  const nextSubscriptionKey = uid
    ? `${uid}|${subscriptionPlan.subscriptionKey}`
    : null;

  if (vehicleLocationSubscriptionKey === nextSubscriptionKey) {
    return;
  }

  vehicleLocationUnsubscribers.forEach((unsubscribe) => unsubscribe());
  vehicleLocationUnsubscribers = [];
  vehicleLocationSubscriptionKey = nextSubscriptionKey;
  vehicleLocationRecordsBySource = new Map<string, Map<string, FirestoreVehicleLocationRecord>>();
  syncVehicleLocationStateFromCurrentSources();

  if (!uid) {
    return;
  }

  if (subscriptionPlan.ownVehicleDocId) {
    const ownSourceId = `own:${subscriptionPlan.ownVehicleDocId}`;

    vehicleLocationUnsubscribers.push(onSnapshot(
      doc(db, 'vehicleLocations', subscriptionPlan.ownVehicleDocId),
      (snapshot) => {
        if (!snapshot.exists()) {
          clearVehicleLocationSource(ownSourceId);
          updateSnapshot();
          void maybeRefreshDriverGuidanceFromCurrentState();
          return;
        }

        setVehicleLocationSourceRecords(ownSourceId, new Map([
          [snapshot.id, snapshot.data() as FirestoreVehicleLocationRecord],
        ]));
        updateSnapshot();
        void maybeRefreshDriverGuidanceFromCurrentState();
      },
      () => {
        clearVehicleLocationSource(ownSourceId);
        updateSnapshot();
        void maybeRefreshDriverGuidanceFromCurrentState();
      },
    ));
  }

  subscriptionPlan.routeQueryChunks.forEach((routeIds) => {
    const routeSourceId = `routes:${routeIds.join(',')}`;

    vehicleLocationUnsubscribers.push(onSnapshot(
      query(
        collection(db, 'vehicleLocations'),
        where('routeId', 'in', routeIds),
      ),
      (snapshot) => {
        setVehicleLocationSourceRecords(
          routeSourceId,
          new Map(snapshot.docs.map((vehicleDocument) => (
            [vehicleDocument.id, vehicleDocument.data() as FirestoreVehicleLocationRecord]
          ))),
        );
        updateSnapshot();
        void maybeRefreshDriverGuidanceFromCurrentState();
      },
      () => {
        clearVehicleLocationSource(routeSourceId);
        updateSnapshot();
        void maybeRefreshDriverGuidanceFromCurrentState();
      },
    ));
  });
}

// Firestore Subscriptions - binds the active auth user to the live Firestore listeners.
// Firestore Listener Binding - attaches catalog, trip, vehicle, and commuter presence subscriptions.
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
        syncVehicleLocationStateFromCurrentSources();
        updateSnapshot();
        void maybeRefreshDriverGuidanceFromCurrentState();
      },
    ),
    onSnapshot(doc(db, 'commuterPresence', uid), (snapshot) => {
      currentCommuterPresence = snapshot.exists()
        ? parseCommuterPresence(snapshot.id, snapshot.data() as FirestoreCommuterPresenceRecord)
        : null;
      bindVehicleLocationSubscriptions(uid);
      updateSnapshot();
    }),
    onSnapshot(doc(db, 'activeTrips', uid), (snapshot) => {
      currentActiveTrip = snapshot.exists()
        ? parseActiveTrip(snapshot.id, snapshot.data() as PersistedActiveTripRecord)
        : null;
      bindDriverCommuterPresenceSubscription(currentActiveTrip?.routeId ?? null);
      bindVehicleLocationSubscriptions(uid);
      updateSnapshot();
      void maybeRefreshDriverGuidanceFromCurrentState(snapshot.exists());
    }),
  ];

  bindVehicleLocationSubscriptions(uid);
}

// Auth Watcher - initializes the one-time auth observer used by live data.
// Live Data Auth Watcher - binds or clears Firestore listeners when Firebase auth changes.
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
// Signed-In User Guard - blocks live-data writes when no Firebase user is active.
async function requireSignedInUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please sign in first.');
  }

  return user;
}

// Driver Role Guard - verifies the current user may mutate driver-only live trip state.
async function requireDriverRole(uid: string) {
  const userSnapshot = await getDoc(doc(db, 'users', uid));

  if (!userSnapshot.exists()) {
    throw new Error('We cannot find your account details. Please sign in again.');
  }

  const userData = userSnapshot.data() as FirebaseUserDocument;
  const approvedRoles = normalizeApprovedRoles(userData.approvedRoles);
  const hasLegacyDriverRole = typeof userData.role === 'string' && isAppRole(userData.role) && userData.role === 'driver';

  if (!approvedRoles.includes('driver') && !hasLegacyDriverRole) {
    throw new Error('This feature is for drivers only.');
  }
}

// Commuter Role Guard - verifies the current user may publish commuter presence.
async function requireCommuterRole(uid: string) {
  const userSnapshot = await getDoc(doc(db, 'users', uid));

  if (!userSnapshot.exists()) {
    throw new Error('We cannot find your account details. Please sign in again.');
  }

  const userData = userSnapshot.data() as FirebaseUserDocument;
  const approvedRoles = normalizeApprovedRoles(userData.approvedRoles);
  const hasLegacyCommuterRole = typeof userData.role === 'string'
    && isAppRole(userData.role)
    && userData.role === 'commuter';

  if (!approvedRoles.includes('commuter') && !hasLegacyCommuterRole) {
    throw new Error('This feature is for commuters only.');
  }
}

// Route Resolution Guard - ensures trip actions always use a supported stored route.
// Resolved Route Guard - returns the selected driver route or raises a setup error.
function getResolvedRouteOrThrow() {
  const route = resolveRouteForTerminals(
    currentRoutes,
    currentDriverSelection.originTerminalId,
    currentDriverSelection.destinationTerminalId,
  );

  if (!route) {
    throw new Error('Choose a starting terminal and a destination first.');
  }

  return route;
}

// Trip Persistence Helpers - write trip events and initial vehicle state to Firestore.
// Trip Event Append - writes an audit event under the active trip timeline.
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

// Initial Vehicle Location Writer - seeds vehicle location and active trip status when a trip starts.
async function writeInitialVehicleLocation(
  driverId: string,
  route: RouteRecord,
  startedAt: string,
  initialLocation?: StartTripInput,
) {
  const resolvedStartLocation = resolveTripStartLocation(route, startedAt, initialLocation);
  const [longitude, latitude] = resolvedStartLocation.coordinate;
  const heading = resolvedStartLocation.heading;
  const speed = resolvedStartLocation.speed;
  const accuracy = resolvedStartLocation.accuracy;
  const recordedAt = resolvedStartLocation.recordedAt;

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
  setVehicleLocationSourceRecord(`own:${driverId}`, driverId, {
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
  currentDriverLocationStatus = 'live';
}

// Firebase Live Data Adapter - exposes the shared live-data contract using Firestore state.
export const firebaseLiveDataService: LiveDataService = {
  // Snapshot Fetch - hydrates auth-bound listeners and returns the latest derived live-data state.
  async getSnapshot() {
    ensureAuthWatcher();

    if (auth.currentUser && currentUserId !== auth.currentUser.uid) {
      bindFirestoreListeners(auth.currentUser.uid);
    }

    await maybeRefreshDriverGuidanceFromCurrentState();

    return updateSnapshot();
  },

  // Live Data Subscribe - registers a snapshot listener for provider consumers.
  subscribe(listener) {
    ensureAuthWatcher();
    listeners.add(listener);
    listener(currentSnapshot);

    return () => {
      listeners.delete(listener);
    };
  },

  async selectCommuterVehicle(vehicleId) {
    currentCommuterRideSelection = selectCommuterRideVehicle(
      currentCommuterRideSelection,
      currentCommuterVisibleVehicles,
      vehicleId,
    );

    return updateSnapshot();
  },

  async setCommuterFareOrigin(locationId) {
    currentCommuterRideSelection = setCommuterRideFareOrigin(
      currentCommuterRideSelection,
      currentCommuterVisibleVehicles,
      locationId,
    );

    return updateSnapshot();
  },

  async setCommuterFareDestination(locationId) {
    currentCommuterRideSelection = setCommuterRideFareDestination(
      currentCommuterRideSelection,
      currentCommuterVisibleVehicles,
      locationId,
    );

    return updateSnapshot();
  },

  // Driver Terminal Selection - stores a valid terminal pair before trip start.
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
      throw new Error('End your current trip first.');
    }

    if (originTerminalId && !isSelectableTerminalId(originTerminalId)) {
      throw new Error('This terminal cannot be used right now.');
    }

    if (destinationTerminalId && !isSelectableTerminalId(destinationTerminalId)) {
      throw new Error('This terminal cannot be used right now.');
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

  // Trip Start - creates the active trip, seeds vehicle location, and starts route commuter visibility.
  async startTrip(input) {
    const user = await requireSignedInUser();
    await requireDriverRole(user.uid);

    if (currentActiveTrip) {
      throw new Error('You already have an active trip.');
    }

    const route = getResolvedRouteOrThrow();
    const tripRef = doc(db, 'activeTrips', user.uid);
    const activeTripSnapshot = await getDoc(tripRef);

    if (activeTripSnapshot.exists()) {
      throw new Error('You already have an active trip.');
    }

    const startedAt = new Date().toISOString();
    const tripPayload = buildActiveTripPayload(user.uid, route, startedAt, {
      originLocationId: currentDriverSelection.originLocationId,
      destinationLocationId: currentDriverSelection.destinationLocationId,
    });

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
      routeProgressSegmentIndex: null,
    };
    bindDriverCommuterPresenceSubscription(route.id);
    bindVehicleLocationSubscriptions(user.uid);

    updateSnapshot();

    return refreshDriverGuidanceForCurrentTrip(
      route,
      resolveTripStartLocation(route, startedAt, input).coordinate,
      true,
    );
  },

  // Trip End - records the stop event, clears vehicle state, and prepares the reverse route selection.
  async endTrip() {
    const user = await requireSignedInUser();
    await requireDriverRole(user.uid);

    const tripRef = doc(db, 'activeTrips', user.uid);
    const activeTripSnapshot = await getDoc(tripRef);

    if (!activeTripSnapshot.exists()) {
      throw new Error('There is no active trip to end.');
    }

    const tripData = activeTripSnapshot.data() as PersistedActiveTripRecord;
    const routeId = typeof tripData.routeId === 'string' ? tripData.routeId : currentActiveTrip?.routeId;

    if (!routeId) {
      throw new Error('We could not read your trip details. Please try again.');
    }

    await appendTripEvent(user.uid, routeId, 'trip_ended', {
      endedAt: new Date().toISOString(),
    });
    await deleteDoc(doc(db, 'vehicleLocations', user.uid));
    bindDriverCommuterPresenceSubscription(null);
    await deleteDoc(tripRef);

    currentDriverSelection = resolveEndedTripDriverSelection(currentActiveTrip, tripData);
    currentActiveTrip = null;
    currentDriverGuidance = null;
    bindVehicleLocationSubscriptions(user.uid);
    removeVehicleLocationDocumentFromAllSources(user.uid);
    currentDriverLastLocationRecordedAt = null;
    currentDriverLastLocationAccuracy = null;
    currentDriverHasFreshLocation = false;
    currentDriverLocationStatus = 'idle';

    return updateSnapshot();
  },

  // Driver Location Publish - writes the driver's GPS point and refreshes route guidance.
  async publishDriverLocation(input: PublishDriverLocationInput) {
    const user = await requireSignedInUser();
    await requireDriverRole(user.uid);

    const tripRef = doc(db, 'activeTrips', user.uid);
    const activeTripSnapshot = await getDoc(tripRef);

    if (!activeTripSnapshot.exists()) {
      throw new Error('Start your trip first.');
    }

    const tripData = activeTripSnapshot.data() as PersistedActiveTripRecord;

    if (tripData.routeId !== input.routeId) {
      throw new Error('We could not update your location for this trip.');
    }

    const route = currentRoutes.find((item) => item.id === input.routeId);

    if (!route) {
      throw new Error('This route is not available right now.');
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
    setVehicleLocationSourceRecord(`own:${user.uid}`, user.uid, {
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
    currentDriverLocationStatus = 'live';

    updateSnapshot();

    return refreshDriverGuidanceForCurrentTrip(
      route,
      [input.longitude, input.latitude],
    );
  },

  // Commuter Presence Publish - writes commuter location plus route-scoped mirrors for driver visibility.
  async publishCommuterPresence(input: PublishCommuterPresenceInput) {
    const user = await requireSignedInUser();
    await requireCommuterRole(user.uid);

    if (
      !Number.isFinite(input.latitude)
      || !Number.isFinite(input.longitude)
    ) {
      throw new Error('We could not get your location. Please try again.');
    }

    const recordedAt = input.recordedAt ?? new Date().toISOString();
    const presence = buildCommuterPresenceRecord({
      commuterId: user.uid,
      coordinate: [input.longitude, input.latitude],
      referenceSource: input.referenceSource,
      routes: currentRoutes,
      recordedAt,
    });

    const presencePayload = {
      commuterId: user.uid,
      status: presence.status,
      latitude: input.latitude,
      longitude: input.longitude,
      referenceSource: presence.referenceSource,
      nearbyRouteIds: presence.nearbyRouteIds,
      recordedAt: presence.recordedAt,
      updatedAt: presence.updatedAt,
    };
    const staleRouteMirrorIds = (currentCommuterPresence?.nearbyRouteIds ?? [])
      .filter((routeId) => !presence.nearbyRouteIds.includes(routeId));

    await setDoc(doc(db, 'commuterPresence', user.uid), presencePayload);
    await Promise.all(
      [
        ...presence.nearbyRouteIds.map((routeId) => (
          setDoc(
            doc(db, 'routeCommuterPresence', routeId, 'commuters', user.uid),
            presencePayload,
          )
        )),
        ...staleRouteMirrorIds.map((routeId) => (
          deleteDoc(doc(db, 'routeCommuterPresence', routeId, 'commuters', user.uid))
        )),
      ],
    );

    currentCommuterPresence = presence;
    bindVehicleLocationSubscriptions(user.uid);

    return updateSnapshot();
  },

  // Commuter Presence Clear - removes the commuter's global and route-scoped waiting records.
  async clearCommuterPresence() {
    const user = await requireSignedInUser();
    const routeIdsToClear = currentCommuterPresence?.nearbyRouteIds ?? [];

    await deleteDoc(doc(db, 'commuterPresence', user.uid));
    await Promise.all(
      routeIdsToClear.map((routeId) => (
        deleteDoc(doc(db, 'routeCommuterPresence', routeId, 'commuters', user.uid))
      )),
    );
    currentCommuterPresence = null;
    bindVehicleLocationSubscriptions(user.uid);

    return updateSnapshot();
  },

  // Live Data Reset - clears subscriptions and local state for test/dev reset flows.
  async reset() {
    clearFirestoreSubscriptions();
    currentUserId = null;
    resetOperationalState();
    return currentSnapshot;
  },
};
