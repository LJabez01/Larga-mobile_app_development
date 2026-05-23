// Transport Domain Helpers - resolves route, terminal, and vehicle transport logic.
export type VehicleType = 'bus' | 'jeep';

export type RouteCoordinate = [number, number];

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

const DRIVER_GUIDANCE_CORRIDOR_ANCHOR_SPACING_METERS = 1_200;
const DRIVER_GUIDANCE_CORRIDOR_TURN_THRESHOLD_DEGREES = 20;
const DRIVER_GUIDANCE_MIN_TURN_ANCHOR_SPACING_METERS = 200;

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

export function createEmptyDriverSelection(): DriverSelectionState {
  return createDriverSelection(null, null);
}

export function isDistinctTerminalPair(
  originTerminalId: string | null,
  destinationTerminalId: string | null,
): originTerminalId is string {
  return Boolean(originTerminalId && destinationTerminalId && originTerminalId !== destinationTerminalId);
}

export function buildDirectionKey(originTerminalId: string, destinationTerminalId: string) {
  return `${originTerminalId}::${destinationTerminalId}`;
}

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

export function isVehicleLocationFresh(recordedAt: string, now = Date.now()) {
  const recordedAtMs = Date.parse(recordedAt);

  if (!Number.isFinite(recordedAtMs)) {
    return false;
  }

  return now - recordedAtMs <= VEHICLE_FRESHNESS_WINDOW_MS;
}

function getCoordinateDistance(
  left: RouteCoordinate,
  right: RouteCoordinate,
) {
  const longitudeDistance = left[0] - right[0];
  const latitudeDistance = left[1] - right[1];

  return Math.sqrt((longitudeDistance ** 2) + (latitudeDistance ** 2));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

export function getCoordinateDistanceMeters(
  left: RouteCoordinate,
  right: RouteCoordinate,
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(right[1] - left[1]);
  const longitudeDelta = toRadians(right[0] - left[0]);
  const leftLatitude = toRadians(left[1]);
  const rightLatitude = toRadians(right[1]);
  const a = (Math.sin(latitudeDelta / 2) ** 2)
    + (Math.cos(leftLatitude) * Math.cos(rightLatitude) * (Math.sin(longitudeDelta / 2) ** 2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function areCoordinatesEqual(left: RouteCoordinate, right: RouteCoordinate) {
  return left[0] === right[0] && left[1] === right[1];
}

function getSegmentBearingDegrees(
  segmentStart: RouteCoordinate,
  segmentEnd: RouteCoordinate,
) {
  const latitudeDelta = toRadians(segmentEnd[1] - segmentStart[1]);
  const longitudeDelta = toRadians(segmentEnd[0] - segmentStart[0]);

  if (latitudeDelta === 0 && longitudeDelta === 0) {
    return null;
  }

  const startLatitude = toRadians(segmentStart[1]);
  const endLatitude = toRadians(segmentEnd[1]);
  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
  const x = (Math.cos(startLatitude) * Math.sin(endLatitude))
    - (Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta));
  const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;

  return Number.isFinite(bearing) ? bearing : null;
}

function getBearingDeltaDegrees(leftBearing: number, rightBearing: number) {
  const delta = Math.abs(leftBearing - rightBearing);

  return Math.min(delta, 360 - delta);
}

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

function projectCoordinateOntoSegment(
  coordinate: RouteCoordinate,
  segmentStart: RouteCoordinate,
  segmentEnd: RouteCoordinate,
): RouteCoordinate {
  const segmentLongitude = segmentEnd[0] - segmentStart[0];
  const segmentLatitude = segmentEnd[1] - segmentStart[1];
  const segmentLengthSquared = (segmentLongitude ** 2) + (segmentLatitude ** 2);

  if (segmentLengthSquared === 0) {
    return segmentStart;
  }

  const coordinateLongitude = coordinate[0] - segmentStart[0];
  const coordinateLatitude = coordinate[1] - segmentStart[1];
  const projection = ((coordinateLongitude * segmentLongitude) + (coordinateLatitude * segmentLatitude)) / segmentLengthSquared;
  const clampedProjection = Math.min(Math.max(projection, 0), 1);

  return [
    segmentStart[0] + (segmentLongitude * clampedProjection),
    segmentStart[1] + (segmentLatitude * clampedProjection),
  ];
}

export function findNearestRouteProjection(
  coordinates: RouteCoordinate[],
  currentCoordinate: RouteCoordinate,
) {
  if (coordinates.length < 2) {
    return null;
  }

  let nearestProjection: {
    coordinate: RouteCoordinate;
    segmentIndex: number;
    distance: number;
  } | null = null;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const projectedCoordinate = projectCoordinateOntoSegment(
      currentCoordinate,
      coordinates[index],
      coordinates[index + 1],
    );
    const distance = getCoordinateDistance(projectedCoordinate, currentCoordinate);

    if (!nearestProjection || distance < nearestProjection.distance) {
      nearestProjection = {
        coordinate: projectedCoordinate,
        segmentIndex: index,
        distance,
      };
    }
  }

  return nearestProjection;
}

function parseTimestampMs(value: string) {
  const timestampMs = Date.parse(value);

  return Number.isFinite(timestampMs) ? timestampMs : null;
}

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

export function buildResponsiveRouteCoordinates(
  coordinates: RouteCoordinate[],
  currentCoordinate: RouteCoordinate,
) {
  if (coordinates.length < 2) {
    return coordinates;
  }

  const nearestProjection = findNearestRouteProjection(coordinates, currentCoordinate);

  if (!nearestProjection) {
    return coordinates;
  }

  const remainingCoordinates = coordinates.slice(nearestProjection.segmentIndex + 1);
  const snappedCoordinate = nearestProjection.coordinate;

  if (remainingCoordinates.length === 0) {
    return [snappedCoordinate];
  }

  if (areCoordinatesEqual(snappedCoordinate, remainingCoordinates[0])) {
    return remainingCoordinates;
  }

  return [snappedCoordinate, ...remainingCoordinates];
}

function buildGuidanceRouteCoordinates(
  coordinates: RouteCoordinate[],
  currentCoordinate: RouteCoordinate,
  minimumSegmentIndex = 0,
) {
  if (coordinates.length < 2) {
    return {
      remainingCoordinates: coordinates,
      progressSegmentIndex: null as number | null,
      snappedCoordinate: coordinates[0] ?? currentCoordinate,
    };
  }

  let nearestProjection: {
    coordinate: RouteCoordinate;
    segmentIndex: number;
    distance: number;
  } | null = null;

  for (let index = minimumSegmentIndex; index < coordinates.length - 1; index += 1) {
    const projectedCoordinate = projectCoordinateOntoSegment(
      currentCoordinate,
      coordinates[index],
      coordinates[index + 1],
    );
    const distance = getCoordinateDistance(projectedCoordinate, currentCoordinate);

    if (!nearestProjection || distance < nearestProjection.distance) {
      nearestProjection = {
        coordinate: projectedCoordinate,
        segmentIndex: index,
        distance,
      };
    }
  }

  if (!nearestProjection) {
    return {
      remainingCoordinates: coordinates,
      progressSegmentIndex: null,
      snappedCoordinate: coordinates[0] ?? currentCoordinate,
    };
  }

  const remainingCoordinates = coordinates.slice(nearestProjection.segmentIndex + 1);
  const snappedCoordinate = nearestProjection.coordinate;

  if (remainingCoordinates.length === 0) {
    return {
      remainingCoordinates: [snappedCoordinate],
      progressSegmentIndex: nearestProjection.segmentIndex,
      snappedCoordinate,
    };
  }

  if (areCoordinatesEqual(snappedCoordinate, remainingCoordinates[0])) {
    return {
      remainingCoordinates,
      progressSegmentIndex: nearestProjection.segmentIndex,
      snappedCoordinate,
    };
  }

  return {
    remainingCoordinates: [snappedCoordinate, ...remainingCoordinates],
    progressSegmentIndex: nearestProjection.segmentIndex,
    snappedCoordinate,
  };
}

export interface DriverGuidancePathPlan {
  rejoinCoordinate: RouteCoordinate;
  rejoinSegmentIndex: number | null;
  remainingRouteCoordinates: RouteCoordinate[];
  offRouteDistanceMeters: number;
}

export function mergeRouteCoordinateSegments(...segments: RouteCoordinate[][]) {
  const mergedCoordinates: RouteCoordinate[] = [];

  segments.forEach((segment) => {
    segment.forEach((coordinate) => {
      if (
        mergedCoordinates.length === 0
        || !areCoordinatesEqual(mergedCoordinates[mergedCoordinates.length - 1], coordinate)
      ) {
        mergedCoordinates.push(coordinate);
      }
    });
  });

  return mergedCoordinates;
}

export function getPathDistanceMeters(coordinates: RouteCoordinate[]) {
  if (coordinates.length < 2) {
    return 0;
  }

  let totalDistanceMeters = 0;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    totalDistanceMeters += getCoordinateDistanceMeters(
      coordinates[index],
      coordinates[index + 1],
    );
  }

  return totalDistanceMeters;
}

export function buildDriverGuidancePathPlan(
  currentCoordinate: RouteCoordinate,
  routeCoordinates: RouteCoordinate[],
  destinationCoordinate: RouteCoordinate,
  currentProgressSegmentIndex: number | null = null,
): DriverGuidancePathPlan {
  const guidanceRoute = buildGuidanceRouteCoordinates(
    routeCoordinates,
    currentCoordinate,
    normalizeGuidanceProgressStartIndex(routeCoordinates, currentProgressSegmentIndex),
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
  updatedAt?: string;
  warningMessage?: string | null;
}

function createDriverGuidanceState({
  currentCoordinate,
  destinationCoordinate,
  routeProgressSegmentIndex = null,
  routeCoordinates,
  connectorCoordinates = null,
  mode,
  sourceRouteId,
  updatedAt = new Date().toISOString(),
  warningMessage = null,
}: BuildDriverGuidanceStateInput): DriverGuidanceState {
  return {
    mode,
    sourceRouteId,
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

export function buildLiveDriverGuidanceState(
  currentCoordinate: RouteCoordinate,
  destinationCoordinate: RouteCoordinate,
  routeCoordinates: RouteCoordinate[],
  sourceRouteId: string,
  updatedAt?: string,
  routeProgressSegmentIndex: number | null = null,
  connectorCoordinates: RouteCoordinate[] | null = null,
) {
  return createDriverGuidanceState({
    currentCoordinate,
    destinationCoordinate,
    routeProgressSegmentIndex,
    routeCoordinates,
    connectorCoordinates,
    mode: 'live-guidance',
    sourceRouteId,
    updatedAt,
  });
}

export function buildStoredRouteFallbackGuidanceState(
  currentCoordinate: RouteCoordinate,
  destinationCoordinate: RouteCoordinate,
  storedRouteCoordinates: RouteCoordinate[],
  sourceRouteId: string,
  updatedAt?: string,
  warningMessage = 'Live road guidance unavailable. Showing the remaining assigned route only.',
  routeProgressSegmentIndex: number | null = null,
) {
  return createDriverGuidanceState({
    currentCoordinate,
    destinationCoordinate,
    routeProgressSegmentIndex,
    routeCoordinates: storedRouteCoordinates,
    mode: 'stored-route-fallback',
    sourceRouteId,
    updatedAt,
    warningMessage,
  });
}

export function buildRouteUnavailableGuidanceState(
  currentCoordinate: RouteCoordinate,
  destinationCoordinate: RouteCoordinate,
  sourceRouteId: string,
  updatedAt?: string,
  warningMessage = 'Route guidance is unavailable right now. Retry when your connection improves.',
) {
  return createDriverGuidanceState({
    currentCoordinate,
    destinationCoordinate,
    routeCoordinates: null,
    mode: 'route-unavailable',
    sourceRouteId,
    updatedAt,
    warningMessage,
  });
}

interface ShouldRefreshDriverGuidanceInput {
  guidance: DriverGuidanceState | null;
  currentCoordinate: RouteCoordinate;
  destinationCoordinate: RouteCoordinate;
  sourceRouteId: string;
  now?: number;
}

export function shouldRefreshDriverGuidance({
  guidance,
  currentCoordinate,
  destinationCoordinate,
  sourceRouteId,
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

export function serializeRouteCoordinates(coordinates: RouteCoordinate[]): FirestoreRouteCoordinate[] {
  return coordinates.map(([longitude, latitude]) => ({
    longitude,
    latitude,
  }));
}

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
