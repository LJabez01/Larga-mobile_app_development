import { resolveMapboxDirectionsAccessToken } from '@/lib/config/mapbox';
import {
  buildDriverGuidancePathPlan,
  DRIVER_GUIDANCE_CONNECTOR_MIN_DISTANCE_METERS,
  type RouteCoordinate,
} from '@/lib/domain/transport';

interface DirectionsGeometryResponse {
  routes?: Array<{
    geometry?: {
      coordinates?: unknown;
    };
  }>;
  message?: string;
  code?: string;
}

function resolveDirectionsToken() {
  const envSource = typeof process !== 'undefined'
    ? process.env as Record<string, string | undefined>
    : undefined;

  return resolveMapboxDirectionsAccessToken(envSource);
}

function isCoordinateArray(value: unknown): value is RouteCoordinate[] {
  return Array.isArray(value)
    && value.length >= 2
    && value.every(
      (coordinate) => Array.isArray(coordinate)
        && coordinate.length === 2
        && typeof coordinate[0] === 'number'
        && Number.isFinite(coordinate[0])
        && typeof coordinate[1] === 'number'
        && Number.isFinite(coordinate[1]),
    );
}

interface RequestDriverGuidanceRouteInput {
  currentCoordinate: RouteCoordinate;
  destinationCoordinate: RouteCoordinate;
  storedRouteCoordinates: RouteCoordinate[];
  currentProgressSegmentIndex?: number | null;
}

interface DriverGuidanceRouteResponse {
  connectorCoordinates: RouteCoordinate[] | null;
  routeCoordinates: RouteCoordinate[];
  routeProgressSegmentIndex: number | null;
}

export async function requestDriverGuidanceRoute({
  currentCoordinate,
  destinationCoordinate,
  storedRouteCoordinates,
  currentProgressSegmentIndex = null,
}: RequestDriverGuidanceRouteInput) {
  const accessToken = resolveDirectionsToken();
  const guidancePlan = buildDriverGuidancePathPlan(
    currentCoordinate,
    storedRouteCoordinates,
    destinationCoordinate,
    currentProgressSegmentIndex,
  );

  if (guidancePlan.offRouteDistanceMeters < DRIVER_GUIDANCE_CONNECTOR_MIN_DISTANCE_METERS) {
    return {
      connectorCoordinates: null,
      routeCoordinates: guidancePlan.remainingRouteCoordinates,
      routeProgressSegmentIndex: guidancePlan.rejoinSegmentIndex,
    } satisfies DriverGuidanceRouteResponse;
  }

  const coordinatePath = [currentCoordinate, guidancePlan.rejoinCoordinate]
    .map(([longitude, latitude]) => `${longitude},${latitude}`)
    .join(';');
  const requestUrl = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatePath}`);

  requestUrl.searchParams.set('access_token', accessToken);
  requestUrl.searchParams.set('geometries', 'geojson');
  requestUrl.searchParams.set('overview', 'full');
  requestUrl.searchParams.set('steps', 'false');

  const response = await fetch(requestUrl.toString());
  const payload = await response.json() as DirectionsGeometryResponse;

  if (!response.ok) {
    throw new Error(payload.message ?? payload.code ?? 'Unable to calculate route guidance right now.');
  }

  const coordinates = payload.routes?.[0]?.geometry?.coordinates;

  if (!isCoordinateArray(coordinates)) {
    throw new Error('Route guidance returned invalid geometry.');
  }

  const connectorCoordinates = coordinates.map(
    ([longitude, latitude]) => [longitude, latitude] as RouteCoordinate,
  );

  return {
    connectorCoordinates: connectorCoordinates.length > 0
      ? [
        ...connectorCoordinates.slice(0, -1),
        guidancePlan.rejoinCoordinate,
      ]
      : [currentCoordinate, guidancePlan.rejoinCoordinate],
    routeCoordinates: guidancePlan.remainingRouteCoordinates,
    routeProgressSegmentIndex: guidancePlan.rejoinSegmentIndex,
  } satisfies DriverGuidanceRouteResponse;
}
