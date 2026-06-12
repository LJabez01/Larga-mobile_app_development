import {
  findNearestRouteProjection,
  getCoordinateDistanceMeters,
  isVehicleLocationFresh,
  type RouteCoordinate,
  type RouteProjection,
  type RouteRecord,
  type VehicleType,
} from '@/lib/domain/transport';

export type CommuterPresenceStatus = 'waiting' | 'active';
export type CommuterReferenceSource = 'gps' | 'manual';

export interface CommuterPresenceRecord {
  id: string;
  coordinate: RouteCoordinate;
  status: CommuterPresenceStatus;
  referenceSource: CommuterReferenceSource;
  nearbyRouteIds: string[];
  recordedAt: string;
  updatedAt: string;
}

export interface VehicleVisibilityInput {
  id: string;
  type: VehicleType;
  coordinate: RouteCoordinate;
  routeId: string;
  routeLabel: string;
  recordedAt: string;
  speedKph: number | null;
}

export interface CommuterVisibleVehicle {
  id: string;
  type: VehicleType;
  coordinate: RouteCoordinate;
  routeId: string;
  routeLabel: string;
  recordedAt: string;
  speedKph: number | null;
  distanceMeters: number;
  etaMinutes: number | null;
}

export interface DriverVisibleCommuter {
  id: string;
  coordinate: RouteCoordinate;
  status: CommuterPresenceStatus;
  referenceSource: CommuterReferenceSource;
  nearbyRouteIds: string[];
  recordedAt: string;
}

export const COMMUTER_ROUTE_PROXIMITY_THRESHOLD_METERS = 180;
export const COMMUTER_PRESENCE_FRESHNESS_WINDOW_MS = 2 * 60 * 1000;

// Timestamp Parser - converts persisted ISO timestamps into comparable millisecond values.
function parseTimestampMs(value: string) {
  const timestampMs = Date.parse(value);

  return Number.isFinite(timestampMs) ? timestampMs : null;
}

// Commuter Presence Freshness - keeps stale waiting commuters out of route visibility.
export function isCommuterPresenceFresh(recordedAt: string, now = Date.now()) {
  const recordedAtMs = parseTimestampMs(recordedAt);

  if (recordedAtMs === null) {
    return false;
  }

  return now - recordedAtMs <= COMMUTER_PRESENCE_FRESHNESS_WINDOW_MS;
}

// Projection Fraction - calculates how far a snapped point sits along a route segment.
function getProjectionFraction(
  coordinate: RouteCoordinate,
  start: RouteCoordinate,
  end: RouteCoordinate,
) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const segmentLengthSquared = dx * dx + dy * dy;

  if (segmentLengthSquared <= 0) {
    return 0;
  }

  const rawFraction = ((coordinate[0] - start[0]) * dx + (coordinate[1] - start[1]) * dy)
    / segmentLengthSquared;

  return Math.max(0, Math.min(1, rawFraction));
}

// Projection Ordering - checks whether one route projection is still ahead of another along the route.
function isProjectionAheadOrSame(
  route: RouteRecord,
  fromProjection: RouteProjection,
  toProjection: RouteProjection,
) {
  if (fromProjection.segmentIndex < toProjection.segmentIndex) {
    return true;
  }

  if (fromProjection.segmentIndex > toProjection.segmentIndex) {
    return false;
  }

  const segmentStart = route.coordinates[fromProjection.segmentIndex];
  const segmentEnd = route.coordinates[fromProjection.segmentIndex + 1];

  if (!segmentStart || !segmentEnd) {
    return true;
  }

  return getProjectionFraction(fromProjection.coordinate, segmentStart, segmentEnd)
    <= getProjectionFraction(toProjection.coordinate, segmentStart, segmentEnd);
}

// Route Distance Between Projections - measures remaining route distance from vehicle to commuter.
function getRouteDistanceBetweenProjections(
  route: RouteRecord,
  fromProjection: RouteProjection,
  toProjection: RouteProjection,
) {
  if (!isProjectionAheadOrSame(route, fromProjection, toProjection)) {
    return null;
  }

  if (fromProjection.segmentIndex === toProjection.segmentIndex) {
    return getCoordinateDistanceMeters(fromProjection.coordinate, toProjection.coordinate);
  }

  let distanceMeters = 0;
  const firstSegmentEnd = route.coordinates[fromProjection.segmentIndex + 1];

  if (!firstSegmentEnd) {
    return null;
  }

  distanceMeters += getCoordinateDistanceMeters(fromProjection.coordinate, firstSegmentEnd);

  for (let index = fromProjection.segmentIndex + 1; index < toProjection.segmentIndex; index += 1) {
    const currentCoordinate = route.coordinates[index];
    const nextCoordinate = route.coordinates[index + 1];

    if (!currentCoordinate || !nextCoordinate) {
      return null;
    }

    distanceMeters += getCoordinateDistanceMeters(currentCoordinate, nextCoordinate);
  }

  const finalSegmentStart = route.coordinates[toProjection.segmentIndex];

  if (!finalSegmentStart) {
    return null;
  }

  distanceMeters += getCoordinateDistanceMeters(finalSegmentStart, toProjection.coordinate);

  return distanceMeters;
}

// ETA Estimator - converts route distance and live speed into a commuter-friendly arrival estimate.
function getEtaMinutes(distanceMeters: number, speedKph: number | null) {
  if (
    typeof speedKph !== 'number'
    || !Number.isFinite(speedKph)
    || speedKph < 5
  ) {
    return null;
  }

  return Math.max(1, Math.ceil((distanceMeters / 1000) / speedKph * 60));
}

function compareEtaMinutes(leftEtaMinutes: number | null, rightEtaMinutes: number | null) {
  if (leftEtaMinutes === null && rightEtaMinutes === null) {
    return 0;
  }

  if (leftEtaMinutes === null) {
    return 1;
  }

  if (rightEtaMinutes === null) {
    return -1;
  }

  return leftEtaMinutes - rightEtaMinutes;
}

// Nearby Route Finder - returns active routes close enough to the commuter reference point.
export function findNearbyRoutesForCommuter(
  routes: RouteRecord[],
  commuterCoordinate: RouteCoordinate,
  thresholdMeters = COMMUTER_ROUTE_PROXIMITY_THRESHOLD_METERS,
) {
  return routes.filter((route) => {
    if (!route.isActive || route.coordinates.length < 2) {
      return false;
    }

    const projection = findNearestRouteProjection(route.coordinates, commuterCoordinate);

    return Boolean(projection && projection.distanceMeters <= thresholdMeters);
  });
}

// Commuter Presence Builder - records a waiting commuter and the nearby routes they can reasonably board.
export function buildCommuterPresenceRecord({
  commuterId,
  coordinate,
  referenceSource,
  routes,
  recordedAt = new Date().toISOString(),
}: {
  commuterId: string;
  coordinate: RouteCoordinate;
  referenceSource: CommuterReferenceSource;
  routes: RouteRecord[];
  recordedAt?: string;
}): CommuterPresenceRecord {
  const nearbyRouteIds = findNearbyRoutesForCommuter(routes, coordinate)
    .map((route) => route.id);

  return {
    id: commuterId,
    coordinate: [...coordinate],
    status: 'waiting',
    referenceSource,
    nearbyRouteIds,
    recordedAt,
    updatedAt: recordedAt,
  };
}

// Commuter Vehicle Visibility - filters live vehicles to those that can still pass the commuter's point.
export function buildCommuterVisibleVehicles({
  routes,
  vehicles,
  commuterCoordinate,
  routeIds = null,
  now = Date.now(),
}: {
  routes: RouteRecord[];
  vehicles: VehicleVisibilityInput[];
  commuterCoordinate: RouteCoordinate;
  routeIds?: string[] | null;
  now?: number;
}) {
  const commuterRouteIds = routeIds
    ?? findNearbyRoutesForCommuter(routes, commuterCoordinate).map((route) => route.id);
  const routeIdSet = new Set(
    commuterRouteIds.filter((routeId) => routes.some((route) => route.id === routeId)),
  );

  return vehicles.flatMap((vehicle): CommuterVisibleVehicle[] => {
    if (!routeIdSet.has(vehicle.routeId) || !isVehicleLocationFresh(vehicle.recordedAt, now)) {
      return [];
    }

    const route = routes.find((item) => item.id === vehicle.routeId);

    if (!route) {
      return [];
    }

    const vehicleProjection = findNearestRouteProjection(route.coordinates, vehicle.coordinate);
    const commuterProjection = findNearestRouteProjection(route.coordinates, commuterCoordinate);

    if (!vehicleProjection || !commuterProjection) {
      return [];
    }

    if (commuterProjection.distanceMeters > COMMUTER_ROUTE_PROXIMITY_THRESHOLD_METERS) {
      return [];
    }

    const distanceMeters = getRouteDistanceBetweenProjections(
      route,
      vehicleProjection,
      commuterProjection,
    );

    if (distanceMeters === null) {
      return [];
    }

    return [{
      id: vehicle.id,
      type: vehicle.type,
      coordinate: [...vehicle.coordinate],
      routeId: vehicle.routeId,
      routeLabel: vehicle.routeLabel,
      recordedAt: vehicle.recordedAt,
      speedKph: vehicle.speedKph,
      distanceMeters,
      etaMinutes: getEtaMinutes(distanceMeters, vehicle.speedKph),
    }];
  }).sort((left, right) => compareEtaMinutes(left.etaMinutes, right.etaMinutes));
}

// Driver Commuter Visibility - filters waiting commuters to the route segment still ahead of the driver.
export function buildDriverVisibleCommuters({
  route,
  commuters,
  routeProgressSegmentIndex = null,
  now = Date.now(),
}: {
  route: RouteRecord;
  commuters: CommuterPresenceRecord[];
  routeProgressSegmentIndex?: number | null;
  now?: number;
}) {
  const minimumSegmentIndex = Math.max(0, routeProgressSegmentIndex ?? 0);

  return commuters.flatMap((commuter): DriverVisibleCommuter[] => {
    if (
      commuter.status !== 'waiting'
      || !isCommuterPresenceFresh(commuter.recordedAt, now)
      || !commuter.nearbyRouteIds.includes(route.id)
    ) {
      return [];
    }

    const commuterProjection = findNearestRouteProjection(
      route.coordinates,
      commuter.coordinate,
      minimumSegmentIndex,
    );

    if (
      !commuterProjection
      || commuterProjection.distanceMeters > COMMUTER_ROUTE_PROXIMITY_THRESHOLD_METERS
      || commuterProjection.segmentIndex < minimumSegmentIndex
    ) {
      return [];
    }

    return [{
      id: commuter.id,
      coordinate: [...commuter.coordinate],
      status: commuter.status,
      referenceSource: commuter.referenceSource,
      nearbyRouteIds: [...commuter.nearbyRouteIds],
      recordedAt: commuter.recordedAt,
    }];
  });
}
