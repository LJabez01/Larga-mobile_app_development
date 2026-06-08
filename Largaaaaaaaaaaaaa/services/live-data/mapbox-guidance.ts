import { resolveMapboxDirectionsAccessToken } from '@/lib/config/mapbox';
import {
  areCoordinatesEqual,
  buildGuidanceWaypointPath,
  buildDriverGuidancePathPlan,
  DRIVER_GUIDANCE_CONNECTOR_MIN_DISTANCE_METERS,
  findNearestRouteProjection,
  getCoordinateDistanceMeters,
  type RouteProjection,
  type SliceRouteFromProjectionResult,
  type RouteCoordinate,
} from '@/lib/domain/transport';
import { sliceRouteFromProjection } from '@/lib/domain/route-geometry';

interface DirectionsGeometryResponse {
  routes?: Array<{
    geometry?: {
      coordinates?: unknown;
    };
  }>;
  message?: string;
  code?: string;
}

// Directions Token Resolver - loads the Mapbox token used for driver road guidance requests.
function resolveDirectionsToken() {
  const envSource = typeof process !== 'undefined'
    ? process.env as Record<string, string | undefined>
    : undefined;

  return resolveMapboxDirectionsAccessToken(envSource);
}

// Directions Coordinate Guard - validates the GeoJSON coordinate array returned by Mapbox.
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
  reconnectAccessCoordinates?: RouteCoordinate[] | null;
  currentProgressSegmentIndex?: number | null;
}

interface DriverGuidanceRouteResponse {
  connectorCoordinates: RouteCoordinate[] | null;
  routeCoordinates: RouteCoordinate[];
  routeProgressSegmentIndex: number | null;
}

const DRIVER_GUIDANCE_ROUTE_MERGE_MAX_DISTANCE_METERS = 25;
const DRIVER_GUIDANCE_ACCESS_WAYPOINT_MATCH_DISTANCE_METERS = 40;
const DRIVER_GUIDANCE_ACCESS_CORRIDOR_MAX_DISTANCE_METERS = 2_500;

// Coordinate Normalizer - clones a route coordinate before using it in guidance output.
function normalizeCoordinate([longitude, latitude]: RouteCoordinate): RouteCoordinate {
  return [longitude, latitude];
}

// Corridor Merge Builder - clips a Directions connector once it reaches the stored route corridor.
function buildConnectorUntilCorridorMerge(
  currentCoordinate: RouteCoordinate,
  connectorCoordinates: RouteCoordinate[],
  storedRouteCoordinates: RouteCoordinate[],
  minimumSegmentIndex: number,
  maximumSegmentIndex: number | null = null,
  minimumConnectorIndex = 1,
): {
  connectorCoordinates: RouteCoordinate[];
  routeSlice: SliceRouteFromProjectionResult;
  mergeProjection: RouteProjection;
} | null {
  for (let index = minimumConnectorIndex; index < connectorCoordinates.length; index += 1) {
    const mergeProjection = findNearestRouteProjection(
      storedRouteCoordinates,
      connectorCoordinates[index],
      minimumSegmentIndex,
    );

    if (
      !mergeProjection
      || mergeProjection.distanceMeters > DRIVER_GUIDANCE_ROUTE_MERGE_MAX_DISTANCE_METERS
      || (
        maximumSegmentIndex !== null
        && mergeProjection.segmentIndex > maximumSegmentIndex
      )
    ) {
      continue;
    }

    const routeSlice = sliceRouteFromProjection(
      storedRouteCoordinates,
      mergeProjection.coordinate,
      minimumSegmentIndex,
    );
    const connectorToMerge = connectorCoordinates
      .slice(0, index)
      .map(normalizeCoordinate);

    if (
      connectorToMerge.length === 0
      || !areCoordinatesEqual(connectorToMerge[0], currentCoordinate)
    ) {
      connectorToMerge.unshift(normalizeCoordinate(currentCoordinate));
    }

    if (
      connectorToMerge.length === 0
      || !areCoordinatesEqual(
        connectorToMerge[connectorToMerge.length - 1],
        routeSlice.snappedCoordinate,
      )
    ) {
      connectorToMerge.push(normalizeCoordinate(routeSlice.snappedCoordinate));
    }

    return {
      connectorCoordinates: connectorToMerge,
      routeSlice,
      mergeProjection,
    };
  }

  return null;
}

// Access Waypoint Cursor - resumes connector clipping after the last approved reconnect waypoint.
function findConnectorIndexAfterLastAccessWaypoint(
  connectorCoordinates: RouteCoordinate[],
  reconnectAccessCoordinates: RouteCoordinate[] | null,
) {
  const lastAccessCoordinate = reconnectAccessCoordinates?.[reconnectAccessCoordinates.length - 1];

  if (!lastAccessCoordinate) {
    return 1;
  }

  const lastAccessConnectorIndex = connectorCoordinates.findIndex((coordinate, index) => (
    index > 0
    && getCoordinateDistanceMeters(coordinate, lastAccessCoordinate)
      <= DRIVER_GUIDANCE_ACCESS_WAYPOINT_MATCH_DISTANCE_METERS
  ));

  return lastAccessConnectorIndex >= 0 ? lastAccessConnectorIndex + 1 : 1;
}

// Unique Waypoint Append - adds waypoints without duplicating adjacent coordinates.
function appendUniqueWaypoint(
  waypoints: RouteCoordinate[],
  coordinate: RouteCoordinate,
) {
  if (
    waypoints.length === 0
    || !areCoordinatesEqual(waypoints[waypoints.length - 1], coordinate)
  ) {
    waypoints.push(normalizeCoordinate(coordinate));
  }
}

// Reconnect Request Path - builds the waypoint list sent to Mapbox for reconnect guidance.
function buildReconnectRequestWaypointPath(
  waypointPath: RouteCoordinate[],
  slicedReconnectAccessCoordinates: RouteCoordinate[] | null,
) {
  if (slicedReconnectAccessCoordinates && slicedReconnectAccessCoordinates.length > 0) {
    const requestWaypointPath: RouteCoordinate[] = [];

    appendUniqueWaypoint(requestWaypointPath, waypointPath[0]);
    slicedReconnectAccessCoordinates.forEach((coordinate) => {
      appendUniqueWaypoint(requestWaypointPath, coordinate);
    });

    return requestWaypointPath;
  }

  if (waypointPath.length <= 2) {
    return waypointPath;
  }

  // Skip the exact first rejoin point in the Directions request so Mapbox
  // targets the broader corridor anchors, then let first-merge clipping decide
  // where the dashed line actually rejoins the stored route.
  return [
    waypointPath[0],
    ...waypointPath.slice(2),
  ];
}

// Access Reconnect Plan - uses approved reconnect access geometry before rejoining the stored route.
function buildAccessReconnectPlan({
  currentCoordinate,
  reconnectAccessCoordinates,
  guidancePlan,
  storedRouteCoordinates,
}: {
  currentCoordinate: RouteCoordinate;
  reconnectAccessCoordinates: RouteCoordinate[];
  guidancePlan: ReturnType<typeof buildDriverGuidancePathPlan>;
  storedRouteCoordinates: RouteCoordinate[];
}): {
  routeSlice: SliceRouteFromProjectionResult;
  slicedReconnectAccessCoordinates: RouteCoordinate[];
} | null {
  const accessProjection = findNearestRouteProjection(
    reconnectAccessCoordinates,
    currentCoordinate,
  );

  if (
    !accessProjection
    || accessProjection.distanceMeters > DRIVER_GUIDANCE_ACCESS_CORRIDOR_MAX_DISTANCE_METERS
  ) {
    return null;
  }

  const accessSlice = sliceRouteFromProjection(
    reconnectAccessCoordinates,
    accessProjection.coordinate,
    accessProjection.segmentIndex,
  );
  const approvedRejoinCoordinate = accessSlice.remainingCoordinates[accessSlice.remainingCoordinates.length - 1];

  if (!approvedRejoinCoordinate) {
    return null;
  }

  const approvedRejoinProjection = findNearestRouteProjection(
    storedRouteCoordinates,
    approvedRejoinCoordinate,
    guidancePlan.rejoinSegmentIndex ?? 0,
  );

  if (!approvedRejoinProjection) {
    return null;
  }

  const routeSlice = sliceRouteFromProjection(
    storedRouteCoordinates,
    approvedRejoinProjection.coordinate,
    approvedRejoinProjection.segmentIndex,
  );

  const slicedReconnectAccessCoordinates = [...accessSlice.remainingCoordinates];
  appendUniqueWaypoint(
    slicedReconnectAccessCoordinates,
    routeSlice.snappedCoordinate,
  );

  return {
    routeSlice,
    slicedReconnectAccessCoordinates,
  };
}

// Driver Guidance Request - asks Mapbox for off-route connector geometry and merges it with stored routes.
export async function requestDriverGuidanceRoute({
  currentCoordinate,
  destinationCoordinate,
  storedRouteCoordinates,
  reconnectAccessCoordinates = null,
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

  const accessReconnectPlan = reconnectAccessCoordinates && reconnectAccessCoordinates.length >= 2
    ? buildAccessReconnectPlan({
      currentCoordinate,
      reconnectAccessCoordinates,
      guidancePlan,
      storedRouteCoordinates,
    })
    : null;

  const waypointPath = buildGuidanceWaypointPath(
    currentCoordinate,
    storedRouteCoordinates,
    destinationCoordinate,
    currentProgressSegmentIndex,
  );
  const requestWaypointPath = buildReconnectRequestWaypointPath(
    waypointPath,
    accessReconnectPlan?.slicedReconnectAccessCoordinates ?? null,
  );
  const coordinatePath = requestWaypointPath
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
  const normalizedConnectorCoordinates = connectorCoordinates.map(normalizeCoordinate);

  if (normalizedConnectorCoordinates.length > 0) {
    normalizedConnectorCoordinates[0] = normalizeCoordinate(currentCoordinate);
  }

  if (accessReconnectPlan) {
    appendUniqueWaypoint(
      normalizedConnectorCoordinates,
      accessReconnectPlan.routeSlice.snappedCoordinate,
    );

    return {
      connectorCoordinates: normalizedConnectorCoordinates,
      routeCoordinates: accessReconnectPlan.routeSlice.remainingCoordinates,
      routeProgressSegmentIndex: accessReconnectPlan.routeSlice.progressSegmentIndex,
    } satisfies DriverGuidanceRouteResponse;
  }

  const connectorMerge = buildConnectorUntilCorridorMerge(
    currentCoordinate,
    normalizedConnectorCoordinates,
    storedRouteCoordinates,
    guidancePlan.rejoinSegmentIndex ?? 0,
    reconnectAccessCoordinates && guidancePlan.rejoinSegmentIndex !== null
      ? guidancePlan.rejoinSegmentIndex + 2
      : null,
    findConnectorIndexAfterLastAccessWaypoint(
      normalizedConnectorCoordinates,
      reconnectAccessCoordinates,
    ),
  );

  if (!connectorMerge) {
    throw new Error('Route guidance did not reconnect to the stored corridor.');
  }

  return {
    connectorCoordinates: connectorMerge.connectorCoordinates.length > 1
      ? connectorMerge.connectorCoordinates
      : [currentCoordinate, connectorMerge.routeSlice.snappedCoordinate],
    routeCoordinates: connectorMerge.routeSlice.remainingCoordinates,
    routeProgressSegmentIndex: connectorMerge.routeSlice.progressSegmentIndex,
  } satisfies DriverGuidanceRouteResponse;
}
