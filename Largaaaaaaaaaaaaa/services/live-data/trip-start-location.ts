import {
  DRIVER_GUIDANCE_OFF_ROUTE_DISTANCE_METERS,
  findNearestRouteProjection,
  getCoordinateDistanceMeters,
  type RouteCoordinate,
  type RouteRecord,
} from '@/lib/domain/transport';
import type { StartTripInput } from '@/services/contracts/live-data';

export const MAX_TRUSTED_START_TRIP_ACCURACY_METERS = 40;
export const TRIP_START_LOCATION_TRUST_WINDOW_MS = 60 * 1000;

export interface ResolvedTripStartLocation {
  coordinate: RouteCoordinate;
  heading: number;
  speed: number;
  accuracy: number;
  recordedAt: string;
  usesLiveLocation: boolean;
}

export function resolveTripStartLocation(
  route: RouteRecord,
  startedAt: string,
  initialLocation?: StartTripInput,
): ResolvedTripStartLocation {
  const fallbackCoordinate = route.coordinates[0];
  const fallbackLocation: ResolvedTripStartLocation = {
    coordinate: fallbackCoordinate,
    heading: 0,
    speed: 0,
    accuracy: 0,
    recordedAt: startedAt,
    usesLiveLocation: false,
  };

  if (!initialLocation) {
    return fallbackLocation;
  }

  const {
    longitude,
    latitude,
    heading,
    speed,
    accuracy,
    recordedAt,
  } = initialLocation;

  if (
    !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
  ) {
    return fallbackLocation;
  }

  return {
    coordinate: [longitude, latitude],
    heading: heading ?? 0,
    speed: speed ?? 0,
    accuracy: typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0 ? accuracy : 0,
    recordedAt: recordedAt ?? startedAt,
    usesLiveLocation: true,
  };
}

export function shouldTrustTripStartupLocationForGuidance({
  route,
  currentCoordinate,
  accuracy,
  startedAt,
  now = Date.now(),
}: {
  route: RouteRecord;
  currentCoordinate: RouteCoordinate;
  accuracy: number | null;
  startedAt: string;
  now?: number;
}) {
  const startedAtMs = Date.parse(startedAt);

  if (!Number.isFinite(startedAtMs)) {
    return true;
  }

  if (now - startedAtMs > TRIP_START_LOCATION_TRUST_WINDOW_MS) {
    return true;
  }

  if (
    typeof accuracy !== 'number'
    || !Number.isFinite(accuracy)
    || accuracy <= 0
    || accuracy > MAX_TRUSTED_START_TRIP_ACCURACY_METERS
  ) {
    return false;
  }

  const nearestProjection = findNearestRouteProjection(route.coordinates, currentCoordinate);

  if (!nearestProjection) {
    return false;
  }

  return getCoordinateDistanceMeters(currentCoordinate, nearestProjection.coordinate)
    <= DRIVER_GUIDANCE_OFF_ROUTE_DISTANCE_METERS;
}
