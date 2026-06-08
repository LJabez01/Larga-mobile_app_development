import {
  areCoordinatesEqual,
  findNearestRouteProjection,
  getBearingDeltaDegrees,
  getCoordinateDistance,
  getCoordinateDistanceMeters,
  getPathDistanceMeters,
  projectCoordinateOntoSegment,
  getSegmentBearingDegrees,
  mergeRouteCoordinateSegments,
  sliceRouteFromProjection,
} from '@/lib/domain/route-geometry';
import type {
  RouteCoordinate,
  RouteProjection,
  RouteBranchRange,
  SliceRouteFromProjectionResult,
} from '@/lib/domain/route-geometry';
// Transport Domain Helpers - resolves route, terminal, and vehicle transport logic.
export type VehicleType = 'bus' | 'jeep';
export {
  areCoordinatesEqual,
  findNearestRouteProjection,
  getCoordinateDistanceMeters,
  getPathDistanceMeters,
  mergeRouteCoordinateSegments,
} from '@/lib/domain/route-geometry';
export type {
  RouteCoordinate,
  RouteProjection,
  RouteBranchRange,
  SliceRouteFromProjectionResult,
} from '@/lib/domain/route-geometry';

export interface FirestoreRouteCoordinate {
  longitude: number;
  latitude: number;
}

export interface TerminalOption {
  id: string;
  label: string;
  coordinate: RouteCoordinate;
  isActive: boolean;
}

export interface RouteRecord {
  id: string;
  label: string;
  originTerminalId: string;
  destinationTerminalId: string;
  vehicleType: VehicleType;
  coordinates: RouteCoordinate[];
  reconnectAccessCoordinates?: RouteCoordinate[] | null;
  isActive: boolean;
}

export interface DriverSelectionState {
  originTerminalId: string | null;
  destinationTerminalId: string | null;
  originLocationId: string | null;
  destinationLocationId: string | null;
  resolvedRouteId: string | null;
  resolvedRouteLabel: string | null;
}

export type DriverTerminalTarget = 'origin' | 'destination';
export type DriverLocationStatus = 'idle' | 'live' | 'stale' | 'missing';
export type DriverGuidanceMode = 'live-guidance' | 'stored-route-fallback' | 'route-unavailable';

export interface DriverGuidanceState {
  mode: DriverGuidanceMode;
  sourceRouteId: string;
  sourceRouteGeometrySignature: string | null;
  originCoordinate: RouteCoordinate;
  destinationCoordinate: RouteCoordinate;
  routeProgressSegmentIndex: number | null;
  routeCoordinates: RouteCoordinate[] | null;
  connectorCoordinates: RouteCoordinate[] | null;
  warningMessage: string | null;
  updatedAt: string;
}

export interface DriverTripMetrics {
  distanceMeters: number | null;
  etaMinutes: number | null;
}

export const VEHICLE_FRESHNESS_WINDOW_MS = 2 * 60 * 1000;
export const DRIVER_GUIDANCE_REROUTE_DISTANCE_METERS = 120;
export const DRIVER_GUIDANCE_OFF_ROUTE_DISTANCE_METERS = 80;
export const DRIVER_GUIDANCE_CONNECTOR_MIN_DISTANCE_METERS = 20;
export const DRIVER_GUIDANCE_MIN_REFRESH_INTERVAL_MS = 15 * 1000;
export const DRIVER_GUIDANCE_MAX_DIRECTIONS_COORDINATES = 25;
export const DRIVER_GUIDANCE_PROGRESS_BACKTRACK_SEGMENTS = 6;
export const DRIVER_GUIDANCE_TERMINAL_START_SEGMENT_WINDOW = 8;

const DRIVER_GUIDANCE_CORRIDOR_ANCHOR_SPACING_METERS = 1_200;
const DRIVER_GUIDANCE_CORRIDOR_TURN_THRESHOLD_DEGREES = 20;
const DRIVER_GUIDANCE_MIN_TURN_ANCHOR_SPACING_METERS = 200;
const DRIVER_GUIDANCE_START_CORRIDOR_REJOIN_TOLERANCE_METERS = 40;

// Driver Selection Builder - creates the terminal/location pair state before resolving a route.
export function createDriverSelection(
  originTerminalId: string | null,
  destinationTerminalId: string | null,
  originLocationId: string | null = null,
  destinationLocationId: string | null = null,
): DriverSelectionState {
  return {
    originTerminalId,
    destinationTerminalId,
    originLocationId,
    destinationLocationId,
    resolvedRouteId: null,
    resolvedRouteLabel: null,
  };
}

// Empty Driver Selection - resets trip setup to no selected origin or destination.
export function createEmptyDriverSelection(): DriverSelectionState {
  return createDriverSelection(null, null);
}

// Distinct Terminal Guard - confirms a usable origin/destination pair for route lookup.
export function isDistinctTerminalPair(
  originTerminalId: string | null,
  destinationTerminalId: string | null,
): originTerminalId is string {
  return Boolean(originTerminalId && destinationTerminalId && originTerminalId !== destinationTerminalId);
}

// Direction Key Builder - creates the live-data direction key used by route resolution.
export function buildDirectionKey(originTerminalId: string, destinationTerminalId: string) {
  return `${originTerminalId}::${destinationTerminalId}`;
}

// Reverse Selection Builder - swaps origin and destination when a driver reverses direction.
export function buildReverseDriverSelection(
  originTerminalId: string,
  destinationTerminalId: string,
  originLocationId: string | null = null,
  destinationLocationId: string | null = null,
) {
  return createDriverSelection(
    destinationTerminalId,
    originTerminalId,
    destinationLocationId,
    originLocationId,
  );
}

// Vehicle Freshness Guard - keeps stale vehicle locations out of live map visibility.
export function isVehicleLocationFresh(recordedAt: string, now = Date.now()) {
  const recordedAtMs = Date.parse(recordedAt);

  if (!Number.isFinite(recordedAtMs)) {
    return false;
  }

  return now - recordedAtMs <= VEHICLE_FRESHNESS_WINDOW_MS;
}

// Guidance Progress Start - backs up the search window so route snapping can recover from small drift.
function normalizeGuidanceProgressStartIndex(
  routeCoordinates: RouteCoordinate[],
  currentProgressSegmentIndex: number | null,
) {
  if (
    currentProgressSegmentIndex === null
    || !Number.isInteger(currentProgressSegmentIndex)
    || routeCoordinates.length < 2
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      routeCoordinates.length - 2,
      currentProgressSegmentIndex - DRIVER_GUIDANCE_PROGRESS_BACKTRACK_SEGMENTS,
    ),
  );
}

// Timestamp Parser - converts persisted guidance timestamps into comparable millisecond values.
function parseTimestampMs(value: string) {
  const timestampMs = Date.parse(value);

  return Number.isFinite(timestampMs) ? timestampMs : null;
}

// Nearest Coordinate Index - finds the closest stored route point to a live coordinate.
export function findNearestRouteCoordinateIndex(
  coordinates: RouteCoordinate[],
  currentCoordinate: RouteCoordinate,
) {
  if (coordinates.length === 0) {
    return -1;
  }

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  coordinates.forEach((coordinate, index) => {
    const distance = getCoordinateDistance(coordinate, currentCoordinate);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

// Responsive Route Coordinates - slices a route to the live snapped point for display.
export function buildResponsiveRouteCoordinates(
  coordinates: RouteCoordinate[],
  currentCoordinate: RouteCoordinate,
) {
  return sliceRouteFromProjection(
    coordinates,
    currentCoordinate,
  ).remainingCoordinates;
}

// Route Geometry Signature - builds a stable comparison key for route and reconnect geometry changes.
export function buildRouteGeometrySignature(
  coordinates: ReadonlyArray<RouteCoordinate>,
  reconnectAccessCoordinates: ReadonlyArray<RouteCoordinate> | null = null,
) {
  const coordinateSignature = coordinates.length === 0
    ? ''
    : coordinates
      .map(([longitude, latitude]) => `${longitude.toFixed(6)},${latitude.toFixed(6)}`)
      .join('|');

  const reconnectAccessSignature = !reconnectAccessCoordinates || reconnectAccessCoordinates.length === 0
    ? ''
    : reconnectAccessCoordinates
      .map(([longitude, latitude]) => `${longitude.toFixed(6)},${latitude.toFixed(6)}`)
      .join('|');

  return `${coordinateSignature}::${reconnectAccessSignature}`;
}

export interface DriverGuidancePathPlan {
  rejoinCoordinate: RouteCoordinate;
  rejoinSegmentIndex: number | null;
  remainingRouteCoordinates: RouteCoordinate[];
  offRouteDistanceMeters: number;
}

// Route Start Corridor Preference - avoids unnecessary reroutes while the driver is still near the terminal.
export function shouldPreferStoredCorridorAtRouteStart(
  guidancePlan: DriverGuidancePathPlan,
  currentProgressSegmentIndex: number | null = null,
) {
  const normalizedProgressSegmentIndex = Math.max(currentProgressSegmentIndex ?? 0, 0);
  const normalizedRejoinSegmentIndex = Math.max(guidancePlan.rejoinSegmentIndex ?? 0, 0);

  return normalizedProgressSegmentIndex <= DRIVER_GUIDANCE_TERMINAL_START_SEGMENT_WINDOW
    && normalizedRejoinSegmentIndex <= DRIVER_GUIDANCE_TERMINAL_START_SEGMENT_WINDOW
    && guidancePlan.offRouteDistanceMeters < DRIVER_GUIDANCE_OFF_ROUTE_DISTANCE_METERS;
}

// Route Slice From Projection - starts the remaining route at an already-computed projection.
function buildRouteSliceFromProjection(
  routeCoordinates: RouteCoordinate[],
  projection: RouteProjection,
): SliceRouteFromProjectionResult {
  const remainingCoordinates = routeCoordinates.slice(projection.segmentIndex + 1);
  const snappedCoordinate = projection.coordinate;

  if (remainingCoordinates.length === 0) {
    return {
      remainingCoordinates: [snappedCoordinate],
      progressSegmentIndex: projection.segmentIndex,
      snappedCoordinate,
    };
  }

  if (areCoordinatesEqual(snappedCoordinate, remainingCoordinates[0])) {
    return {
      remainingCoordinates,
      progressSegmentIndex: projection.segmentIndex,
      snappedCoordinate,
    };
  }

  return {
    remainingCoordinates: [snappedCoordinate, ...remainingCoordinates],
    progressSegmentIndex: projection.segmentIndex,
    snappedCoordinate,
  };
}

// Preferred Guidance Slice - chooses the best remaining corridor slice from current driver progress.
function buildPreferredGuidanceRouteSlice(
  routeCoordinates: RouteCoordinate[],
  currentCoordinate: RouteCoordinate,
  currentProgressSegmentIndex: number | null,
) {
  const minimumSegmentIndex = normalizeGuidanceProgressStartIndex(
    routeCoordinates,
    currentProgressSegmentIndex,
  );
  const nearestProjection = findNearestRouteProjection(
    routeCoordinates,
    currentCoordinate,
    minimumSegmentIndex,
  );

  if (!nearestProjection) {
    return sliceRouteFromProjection(
      routeCoordinates,
      currentCoordinate,
      minimumSegmentIndex,
    );
  }

  const normalizedProgressSegmentIndex = Math.max(currentProgressSegmentIndex ?? 0, 0);

  if (
    normalizedProgressSegmentIndex > DRIVER_GUIDANCE_TERMINAL_START_SEGMENT_WINDOW
    || nearestProjection.segmentIndex <= DRIVER_GUIDANCE_TERMINAL_START_SEGMENT_WINDOW
  ) {
    return buildRouteSliceFromProjection(routeCoordinates, nearestProjection);
  }

  const maxComparableDistanceMeters = nearestProjection.distanceMeters
    + DRIVER_GUIDANCE_START_CORRIDOR_REJOIN_TOLERANCE_METERS;
  let preferredProjection = nearestProjection;

  for (let index = minimumSegmentIndex; index <= nearestProjection.segmentIndex; index += 1) {
    const projectedCoordinate = projectCoordinateOntoSegment(
      currentCoordinate,
      routeCoordinates[index],
      routeCoordinates[index + 1],
    );
    const distanceMeters = getCoordinateDistanceMeters(projectedCoordinate, currentCoordinate);

    if (distanceMeters <= maxComparableDistanceMeters) {
      preferredProjection = {
        coordinate: projectedCoordinate,
        segmentIndex: index,
        distanceDegrees: getCoordinateDistance(projectedCoordinate, currentCoordinate),
        distanceMeters,
      };
      break;
    }
  }

  return buildRouteSliceFromProjection(routeCoordinates, preferredProjection);
}

// Driver Guidance Path Plan - identifies the rejoin point and remaining route to destination.
export function buildDriverGuidancePathPlan(
  currentCoordinate: RouteCoordinate,
  routeCoordinates: RouteCoordinate[],
  destinationCoordinate: RouteCoordinate,
  currentProgressSegmentIndex: number | null = null,
): DriverGuidancePathPlan {
  const guidanceRoute = buildPreferredGuidanceRouteSlice(
    routeCoordinates,
    currentCoordinate,
    currentProgressSegmentIndex,
  );

  const routeTailCoordinates = guidanceRoute.remainingCoordinates.length > 0
    ? guidanceRoute.remainingCoordinates
    : [destinationCoordinate];
  const routeToDestinationCoordinates = areCoordinatesEqual(
    routeTailCoordinates[routeTailCoordinates.length - 1],
    destinationCoordinate,
  )
    ? routeTailCoordinates
    : [...routeTailCoordinates, destinationCoordinate];
  const rejoinCoordinate = routeToDestinationCoordinates[0];

  return {
    rejoinCoordinate,
    rejoinSegmentIndex: guidanceRoute.progressSegmentIndex,
    remainingRouteCoordinates: routeToDestinationCoordinates,
    offRouteDistanceMeters: getCoordinateDistanceMeters(currentCoordinate, rejoinCoordinate),
  };
}

// Route Distance From Current Point - measures how far a live coordinate is from the assigned corridor.
export function getRouteDistanceMeters(
  currentCoordinate: RouteCoordinate,
  routeCoordinates: RouteCoordinate[],
) {
  const nearestProjection = findNearestRouteProjection(routeCoordinates, currentCoordinate);

  if (!nearestProjection) {
    return Number.POSITIVE_INFINITY;
  }

  return getCoordinateDistanceMeters(currentCoordinate, nearestProjection.coordinate);
}

// Driver Trip Metrics - converts guidance geometry and speed into distance and ETA values.
export function buildDriverTripMetrics(
  guidance: DriverGuidanceState | null,
  speedKph: number | null,
  locationStatus: DriverLocationStatus,
): DriverTripMetrics {
  const routePathCoordinates = guidance
    ? mergeRouteCoordinateSegments(
      guidance.connectorCoordinates ?? [],
      guidance.routeCoordinates ?? [],
    )
    : [];
  const distanceMeters = routePathCoordinates.length >= 2
    ? getPathDistanceMeters(routePathCoordinates)
    : null;

  if (
    distanceMeters === null
    || !Number.isFinite(distanceMeters)
    || distanceMeters <= 0
    || speedKph === null
    || !Number.isFinite(speedKph)
    || speedKph < 5
    || locationStatus !== 'live'
  ) {
    return {
      distanceMeters,
      etaMinutes: null,
    };
  }

  const etaMinutes = Math.max(
    1,
    Math.ceil((distanceMeters / 1000) / speedKph * 60),
  );

  return {
    distanceMeters,
    etaMinutes,
  };
}

// Route Connector Coordinates - draws a connector only when the driver is meaningfully off the route line.
export function buildRouteConnectorCoordinates(
  currentCoordinate: RouteCoordinate,
  routeCoordinates: RouteCoordinate[],
) {
  const nearestProjection = findNearestRouteProjection(routeCoordinates, currentCoordinate);

  if (!nearestProjection) {
    return null;
  }

  if (getCoordinateDistanceMeters(currentCoordinate, nearestProjection.coordinate) < DRIVER_GUIDANCE_CONNECTOR_MIN_DISTANCE_METERS) {
    return null;
  }

  return [currentCoordinate, nearestProjection.coordinate] as RouteCoordinate[];
}

// Guidance Waypoint Path - compresses the remaining route into Mapbox Directions waypoints.
export function buildGuidanceWaypointPath(
  currentCoordinate: RouteCoordinate,
  routeCoordinates: RouteCoordinate[],
  destinationCoordinate: RouteCoordinate,
  currentProgressSegmentIndex: number | null = null,
) {
  const guidancePlan = buildDriverGuidancePathPlan(
    currentCoordinate,
    routeCoordinates,
    destinationCoordinate,
    currentProgressSegmentIndex,
  );
  const waypointPath: RouteCoordinate[] = [currentCoordinate];
  const routeAnchors: RouteCoordinate[] = [];
  let distanceSinceLastAnchor = 0;

  guidancePlan.remainingRouteCoordinates.forEach((coordinate, index) => {
    if (index > 0) {
      distanceSinceLastAnchor += getCoordinateDistanceMeters(
        guidancePlan.remainingRouteCoordinates[index - 1],
        coordinate,
      );
    }

    const isFirstCoordinate = index === 0;
    const isLastCoordinate = index === guidancePlan.remainingRouteCoordinates.length - 1;

    if (isFirstCoordinate || isLastCoordinate) {
      routeAnchors.push(coordinate);
      distanceSinceLastAnchor = 0;
      return;
    }

    const previousCoordinate = guidancePlan.remainingRouteCoordinates[index - 1];
    const nextCoordinate = guidancePlan.remainingRouteCoordinates[index + 1];
    const incomingBearing = getSegmentBearingDegrees(previousCoordinate, coordinate);
    const outgoingBearing = getSegmentBearingDegrees(coordinate, nextCoordinate);
    const turnDeltaDegrees = incomingBearing !== null && outgoingBearing !== null
      ? getBearingDeltaDegrees(incomingBearing, outgoingBearing)
      : 0;
    const shouldAnchorTurn = turnDeltaDegrees >= DRIVER_GUIDANCE_CORRIDOR_TURN_THRESHOLD_DEGREES
      && distanceSinceLastAnchor >= DRIVER_GUIDANCE_MIN_TURN_ANCHOR_SPACING_METERS;
    const shouldAnchorSpacing = distanceSinceLastAnchor >= DRIVER_GUIDANCE_CORRIDOR_ANCHOR_SPACING_METERS;

    if (shouldAnchorTurn || shouldAnchorSpacing) {
      routeAnchors.push(coordinate);
      distanceSinceLastAnchor = 0;
    }
  });

  const maxRouteAnchors = Math.max(DRIVER_GUIDANCE_MAX_DIRECTIONS_COORDINATES - 1, 1);
  const normalizedRouteAnchors = routeAnchors.length <= maxRouteAnchors
    ? routeAnchors
    : Array.from({ length: maxRouteAnchors }, (_, index) => {
      const anchorIndex = Math.round((index * (routeAnchors.length - 1)) / (maxRouteAnchors - 1));

      return routeAnchors[anchorIndex];
    }).filter((coordinate, index, coordinates) => (
      index === 0 || !areCoordinatesEqual(coordinate, coordinates[index - 1])
    ));

  normalizedRouteAnchors.forEach((coordinate) => {
    if (!areCoordinatesEqual(waypointPath[waypointPath.length - 1], coordinate)) {
      waypointPath.push(coordinate);
    }
  });

  if (!areCoordinatesEqual(waypointPath[waypointPath.length - 1], destinationCoordinate)) {
    waypointPath.push(destinationCoordinate);
  }

  return waypointPath.slice(0, DRIVER_GUIDANCE_MAX_DIRECTIONS_COORDINATES);
}

interface BuildDriverGuidanceStateInput {
  currentCoordinate: RouteCoordinate;
  destinationCoordinate: RouteCoordinate;
  routeProgressSegmentIndex?: number | null;
  routeCoordinates: RouteCoordinate[] | null;
  connectorCoordinates?: RouteCoordinate[] | null;
  mode: DriverGuidanceMode;
  sourceRouteId: string;
  sourceRouteGeometrySignature?: string | null;
  updatedAt?: string;
  warningMessage?: string | null;
}

// Driver Guidance State Factory - creates an immutable guidance snapshot for live, fallback, and unavailable modes.
function createDriverGuidanceState({
  currentCoordinate,
  destinationCoordinate,
  routeProgressSegmentIndex = null,
  routeCoordinates,
  connectorCoordinates = null,
  mode,
  sourceRouteId,
  sourceRouteGeometrySignature = null,
  updatedAt = new Date().toISOString(),
  warningMessage = null,
}: BuildDriverGuidanceStateInput): DriverGuidanceState {
  return {
    mode,
    sourceRouteId,
    sourceRouteGeometrySignature,
    originCoordinate: [...currentCoordinate],
    destinationCoordinate: [...destinationCoordinate],
    routeProgressSegmentIndex,
    routeCoordinates: routeCoordinates
      ? routeCoordinates.map((coordinate) => [...coordinate] as RouteCoordinate)
      : null,
    connectorCoordinates: connectorCoordinates
      ? connectorCoordinates.map((coordinate) => [...coordinate] as RouteCoordinate)
      : null,
    warningMessage,
    updatedAt,
  };
}

// Live Driver Guidance State - stores road-guidance geometry returned from the live directions flow.
export function buildLiveDriverGuidanceState(
  currentCoordinate: RouteCoordinate,
  destinationCoordinate: RouteCoordinate,
  routeCoordinates: RouteCoordinate[],
  sourceRouteId: string,
  updatedAt?: string,
  routeProgressSegmentIndex: number | null = null,
  connectorCoordinates: RouteCoordinate[] | null = null,
  sourceRouteGeometrySignature: string | null = null,
) {
  return createDriverGuidanceState({
    currentCoordinate,
    destinationCoordinate,
    routeProgressSegmentIndex,
    routeCoordinates,
    connectorCoordinates,
    mode: 'live-guidance',
    sourceRouteId,
    sourceRouteGeometrySignature,
    updatedAt,
  });
}

// Stored Route Fallback State - falls back to the assigned route when live directions cannot be trusted.
export function buildStoredRouteFallbackGuidanceState(
  currentCoordinate: RouteCoordinate,
  destinationCoordinate: RouteCoordinate,
  storedRouteCoordinates: RouteCoordinate[],
  sourceRouteId: string,
  updatedAt?: string,
  warningMessage = 'Live road guidance unavailable. Showing the remaining assigned route only.',
  routeProgressSegmentIndex: number | null = null,
  sourceRouteGeometrySignature: string | null = null,
) {
  return createDriverGuidanceState({
    currentCoordinate,
    destinationCoordinate,
    routeProgressSegmentIndex,
    routeCoordinates: storedRouteCoordinates,
    mode: 'stored-route-fallback',
    sourceRouteId,
    sourceRouteGeometrySignature,
    updatedAt,
    warningMessage,
  });
}

// Route Unavailable State - records that neither live nor fallback guidance is currently usable.
export function buildRouteUnavailableGuidanceState(
  currentCoordinate: RouteCoordinate,
  destinationCoordinate: RouteCoordinate,
  sourceRouteId: string,
  updatedAt?: string,
  warningMessage = 'Route guidance is unavailable right now. Retry when your connection improves.',
  sourceRouteGeometrySignature: string | null = null,
) {
  return createDriverGuidanceState({
    currentCoordinate,
    destinationCoordinate,
    routeCoordinates: null,
    mode: 'route-unavailable',
    sourceRouteId,
    sourceRouteGeometrySignature,
    updatedAt,
    warningMessage,
  });
}

interface ShouldRefreshDriverGuidanceInput {
  guidance: DriverGuidanceState | null;
  currentCoordinate: RouteCoordinate;
  destinationCoordinate: RouteCoordinate;
  sourceRouteId: string;
  sourceRouteGeometrySignature?: string | null;
  now?: number;
}

// Driver Guidance Refresh Policy - decides when movement, route drift, or stale data requires rerouting.
export function shouldRefreshDriverGuidance({
  guidance,
  currentCoordinate,
  destinationCoordinate,
  sourceRouteId,
  sourceRouteGeometrySignature = null,
  now = Date.now(),
}: ShouldRefreshDriverGuidanceInput) {
  if (!guidance) {
    return true;
  }

  if (guidance.sourceRouteId !== sourceRouteId) {
    return true;
  }

  if (!areCoordinatesEqual(guidance.destinationCoordinate, destinationCoordinate)) {
    return true;
  }

  if (guidance.sourceRouteGeometrySignature !== sourceRouteGeometrySignature) {
    return true;
  }

  const updatedAtMs = parseTimestampMs(guidance.updatedAt);

  if (updatedAtMs === null) {
    return true;
  }

  const movedDistanceMeters = getCoordinateDistanceMeters(currentCoordinate, guidance.originCoordinate);

  if (guidance.mode !== 'live-guidance') {
    return movedDistanceMeters >= DRIVER_GUIDANCE_REROUTE_DISTANCE_METERS
      && (now - updatedAtMs) >= DRIVER_GUIDANCE_MIN_REFRESH_INTERVAL_MS;
  }

  const currentRouteDistanceMeters = guidance.routeCoordinates
    ? getRouteDistanceMeters(currentCoordinate, guidance.routeCoordinates)
    : Number.POSITIVE_INFINITY;

  if (currentRouteDistanceMeters >= DRIVER_GUIDANCE_OFF_ROUTE_DISTANCE_METERS) {
    return true;
  }

  return movedDistanceMeters >= DRIVER_GUIDANCE_REROUTE_DISTANCE_METERS
    && (now - updatedAtMs) >= DRIVER_GUIDANCE_MIN_REFRESH_INTERVAL_MS;
}

// Firestore Coordinate Serializer - converts tuple coordinates into Firestore-safe objects.
export function serializeRouteCoordinates(coordinates: RouteCoordinate[]): FirestoreRouteCoordinate[] {
  return coordinates.map(([longitude, latitude]) => ({
    longitude,
    latitude,
  }));
}

// Firestore Coordinate Deserializer - validates and restores persisted route coordinates.
export function deserializeRouteCoordinates(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const coordinates = value.flatMap((item) => {
    if (
      typeof item === 'object'
      && item !== null
      && typeof (item as FirestoreRouteCoordinate).longitude === 'number'
      && Number.isFinite((item as FirestoreRouteCoordinate).longitude)
      && typeof (item as FirestoreRouteCoordinate).latitude === 'number'
      && Number.isFinite((item as FirestoreRouteCoordinate).latitude)
    ) {
      return [[
        (item as FirestoreRouteCoordinate).longitude,
        (item as FirestoreRouteCoordinate).latitude,
      ] as RouteCoordinate];
    }

    return [];
  });

  return coordinates.length >= 2 ? coordinates : null;
}

// Terminal Route Resolver - finds the single active route matching a selected terminal pair.
export function resolveRouteForTerminals(
  routes: RouteRecord[],
  originTerminalId: string | null,
  destinationTerminalId: string | null,
) {
  if (!isDistinctTerminalPair(originTerminalId, destinationTerminalId)) {
    return null;
  }

  const activeMatches = routes.filter(
    (route) =>
      route.isActive
      && route.originTerminalId === originTerminalId
      && route.destinationTerminalId === destinationTerminalId,
  );

  if (activeMatches.length !== 1) {
    return null;
  }

  return activeMatches[0];
}

// Selectable Terminal Resolver - limits picker choices to active routes compatible with the counterpart terminal.
export function getSelectableTerminalIds(
  routes: RouteRecord[],
  target: DriverTerminalTarget,
  selectedCounterpartTerminalId: string | null,
) {
  const compatibleRouteSet = routes.filter((route) => route.isActive);

  if (target === 'origin') {
    return new Set(
      compatibleRouteSet
        .filter((route) => !selectedCounterpartTerminalId || route.destinationTerminalId === selectedCounterpartTerminalId)
        .map((route) => route.originTerminalId),
    );
  }

  return new Set(
    compatibleRouteSet
      .filter((route) => !selectedCounterpartTerminalId || route.originTerminalId === selectedCounterpartTerminalId)
      .map((route) => route.destinationTerminalId),
  );
}
