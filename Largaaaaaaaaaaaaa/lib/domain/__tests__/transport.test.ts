import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDriverTripMetrics,
  buildRouteGeometrySignature,
  buildDriverGuidancePathPlan,
  buildGuidanceWaypointPath,
  mergeRouteCoordinateSegments,
  buildStoredRouteFallbackGuidanceState,
  buildResponsiveRouteCoordinates,
  buildReverseDriverSelection,
  DRIVER_GUIDANCE_MAX_DIRECTIONS_COORDINATES,
  DRIVER_GUIDANCE_MIN_REFRESH_INTERVAL_MS,
  createEmptyDriverSelection,
  findNearestRouteCoordinateIndex,
  getSelectableTerminalIds,
  getPathDistanceMeters,
  isVehicleLocationFresh,
  resolveRouteForTerminals,
  shouldRefreshDriverGuidance,
} from '@/lib/domain/transport';
import { ROUTE_SEED } from '@/lib/seed/transport-catalog';

test('createEmptyDriverSelection starts with no terminal pair', () => {
  assert.deepEqual(createEmptyDriverSelection(), {
    originTerminalId: null,
    destinationTerminalId: null,
    originLocationId: null,
    destinationLocationId: null,
    resolvedRouteId: null,
    resolvedRouteLabel: null,
  });
});

test('resolveRouteForTerminals returns the one active route for a valid terminal pair', () => {
  const route = resolveRouteForTerminals(
    ROUTE_SEED,
    'sta-maria-bayan',
    'halang-terminal',
  );

  assert.equal(route?.id, 'sta-maria-bayan-halang');
});

test('resolveRouteForTerminals resolves reverse-direction route records independently', () => {
  const route = resolveRouteForTerminals(
    ROUTE_SEED,
    'halang-terminal',
    'sta-maria-bayan',
  );

  assert.equal(route?.id, 'halang-sta-maria-bayan');
});

test('resolveRouteForTerminals rejects identical or unknown terminal pairs', () => {
  assert.equal(
    resolveRouteForTerminals(ROUTE_SEED, 'sta-maria-bayan', 'sta-maria-bayan'),
    null,
  );
  assert.equal(
    resolveRouteForTerminals(ROUTE_SEED, 'halang-terminal', 'norzagaray-terminal'),
    null,
  );
});

test('getSelectableTerminalIds limits the picker to route-supported combinations', () => {
  const destinationIds = getSelectableTerminalIds(ROUTE_SEED, 'destination', 'halang-terminal');
  const originIds = getSelectableTerminalIds(ROUTE_SEED, 'origin', 'sta-maria-bayan');

  assert.deepEqual([...destinationIds], ['sta-maria-bayan']);
  assert.deepEqual(
    [...originIds].sort(),
    ['halang-terminal', 'norzagaray-terminal', 'san-jose-terminal'],
  );
});

test('buildReverseDriverSelection swaps the selected terminals for return-trip preparation', () => {
  assert.deepEqual(
    buildReverseDriverSelection('sta-maria-bayan', 'halang-terminal'),
    {
      originTerminalId: 'halang-terminal',
      destinationTerminalId: 'sta-maria-bayan',
      originLocationId: null,
      destinationLocationId: null,
      resolvedRouteId: null,
      resolvedRouteLabel: null,
    },
  );
});

test('buildReverseDriverSelection also swaps the selected inventory location ids', () => {
  assert.deepEqual(
    buildReverseDriverSelection(
      'sta-maria-bayan',
      'halang-terminal',
      'new-santa-maria-jeepney-terminal',
      'halang-and-santa-maria-to-pandi-angat-baliuag-jeepney-terminal',
    ),
    {
      originTerminalId: 'halang-terminal',
      destinationTerminalId: 'sta-maria-bayan',
      originLocationId: 'halang-and-santa-maria-to-pandi-angat-baliuag-jeepney-terminal',
      destinationLocationId: 'new-santa-maria-jeepney-terminal',
      resolvedRouteId: null,
      resolvedRouteLabel: null,
    },
  );
});

test('isVehicleLocationFresh accepts recent timestamps and rejects stale ones', () => {
  const now = Date.parse('2026-05-20T12:00:00.000Z');

  assert.equal(
    isVehicleLocationFresh('2026-05-20T11:58:30.000Z', now),
    true,
  );
  assert.equal(
    isVehicleLocationFresh('2026-05-20T11:56:30.000Z', now),
    false,
  );
  assert.equal(
    isVehicleLocationFresh('not-a-date', now),
    false,
  );
});

test('findNearestRouteCoordinateIndex finds the closest stored route point to the live device position', () => {
  const route = ROUTE_SEED.find((item) => item.id === 'sta-maria-bayan-halang');

  assert.ok(route);
  assert.equal(
    findNearestRouteCoordinateIndex(route.coordinates, route.coordinates[2]),
    2,
  );
});

test('buildResponsiveRouteCoordinates snaps the guide line onto the stored route path', () => {
  const responsiveCoordinates = buildResponsiveRouteCoordinates(
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
      [120.020000, 14.000000],
    ],
    [120.015000, 14.002000],
  );

  assert.deepEqual(responsiveCoordinates, [
    [120.015000, 14.000000],
    [120.020000, 14.000000],
  ]);
});

test('buildResponsiveRouteCoordinates keeps an exact stored point when the vehicle is already on the route', () => {
  const route = ROUTE_SEED.find((item) => item.id === 'sta-maria-bayan-halang');

  assert.ok(route);

  const responsiveCoordinates = buildResponsiveRouteCoordinates(
    route.coordinates,
    route.coordinates[1],
  );

  assert.deepEqual(responsiveCoordinates[0], route.coordinates[1]);
  assert.deepEqual(responsiveCoordinates[1], route.coordinates[2]);
});

test('buildGuidanceWaypointPath starts from the live driver position and ends at the destination', () => {
  const waypointPath = buildGuidanceWaypointPath(
    [120.001000, 14.000500],
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
      [120.020000, 14.000000],
      [120.030000, 14.000000],
    ],
    [120.030000, 14.000000],
  );

  assert.deepEqual(waypointPath[0], [120.001000, 14.000500]);
  assert.deepEqual(waypointPath[waypointPath.length - 1], [120.030000, 14.000000]);
});

test('buildGuidanceWaypointPath prefers the forward route entry with the shortest remaining path', () => {
  const waypointPath = buildGuidanceWaypointPath(
    [120.000200, 14.000500],
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
      [120.010000, 14.010000],
      [120.000000, 14.010000],
      [120.000000, 14.001000],
      [120.002000, 14.001000],
    ],
    [120.002000, 14.001000],
  );

  assert.deepEqual(waypointPath[0], [120.000200, 14.000500]);
  assert.deepEqual(waypointPath[1], [120.000200, 14.001000]);
  assert.deepEqual(waypointPath[waypointPath.length - 1], [120.002000, 14.001000]);
});

test('buildGuidanceWaypointPath keeps intermediate corridor anchors and caps directions waypoint count', () => {
  const routeCoordinates = Array.from({ length: 40 }, (_, index) => (
    index < 10
      ? [120.000000 + (index * 0.001000), 14.000000]
      : index < 20
        ? [120.009000, 14.000000 + ((index - 9) * 0.001000)]
        : index < 30
          ? [120.009000 + ((index - 19) * 0.001000), 14.011000]
          : [120.020000, 14.011000 + ((index - 29) * 0.001000)]
  )) as [number, number][];
  const waypointPath = buildGuidanceWaypointPath(
    [120.000500, 14.000300],
    routeCoordinates,
    routeCoordinates[routeCoordinates.length - 1],
  );

  assert.ok(waypointPath.length > 3);
  assert.ok(waypointPath.length <= DRIVER_GUIDANCE_MAX_DIRECTIONS_COORDINATES);
  assert.deepEqual(waypointPath[0], [120.000500, 14.000300]);
  assert.deepEqual(waypointPath[waypointPath.length - 1], routeCoordinates[routeCoordinates.length - 1]);
  assert.ok(waypointPath.some((coordinate) => coordinate[0] === 120.009000 && coordinate[1] > 14.000000));
  assert.ok(waypointPath.some((coordinate) => coordinate[1] === 14.011000 && coordinate[0] > 120.009000));
});

test('buildDriverGuidancePathPlan keeps the remaining route corridor after the best rejoin point', () => {
  const guidancePlan = buildDriverGuidancePathPlan(
    [120.000200, 14.000500],
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
      [120.010000, 14.010000],
      [120.000000, 14.010000],
      [120.000000, 14.001000],
      [120.002000, 14.001000],
    ],
    [120.002000, 14.001000],
  );

  assert.deepEqual(guidancePlan.rejoinCoordinate, [120.000200, 14.001000]);
  assert.ok(guidancePlan.rejoinSegmentIndex !== null);
  assert.ok(guidancePlan.rejoinSegmentIndex! >= 3);
  assert.deepEqual(guidancePlan.remainingRouteCoordinates[0], [120.000200, 14.001000]);
  assert.deepEqual(
    guidancePlan.remainingRouteCoordinates[guidancePlan.remainingRouteCoordinates.length - 1],
    [120.002000, 14.001000],
  );
});

test('buildDriverGuidancePathPlan does not resurrect already-passed route segments when the corridor doubles back nearby', () => {
  const routeCoordinates = [
    [120.000000, 14.000000],
    [120.000000, 14.001000],
    [120.000000, 14.002000],
    [120.000000, 14.003000],
    [120.000000, 14.004000],
    [120.000000, 14.005000],
    [120.001000, 14.005000],
    [120.002000, 14.005000],
    [120.003000, 14.005000],
    [120.004000, 14.005000],
    [120.004000, 14.004000],
    [120.004000, 14.003000],
    [120.004000, 14.002000],
    [120.004000, 14.001000],
    [120.004000, 14.000000],
    [120.003000, 14.000000],
    [120.002000, 14.000000],
    [120.001000, 14.000000],
  ] as [number, number][];

  const guidancePlan = buildDriverGuidancePathPlan(
    [120.000300, 14.001200],
    routeCoordinates,
    routeCoordinates[routeCoordinates.length - 1],
    14,
  );

  assert.ok(guidancePlan.rejoinSegmentIndex !== null);
  assert.ok(guidancePlan.rejoinSegmentIndex! >= 8);
  assert.notDeepEqual(guidancePlan.remainingRouteCoordinates[0], routeCoordinates[0]);
  assert.notDeepEqual(guidancePlan.remainingRouteCoordinates[0], routeCoordinates[1]);
  assert.ok(guidancePlan.remainingRouteCoordinates.length < routeCoordinates.length);
});

test('mergeRouteCoordinateSegments stitches connector and stored route segments without duplicate joins', () => {
  const mergedCoordinates = mergeRouteCoordinateSegments(
    [
      [120.000000, 14.000000],
      [120.001000, 14.000000],
      [120.002000, 14.000000],
    ],
    [
      [120.002000, 14.000000],
      [120.003000, 14.000000],
    ],
  );

  assert.deepEqual(mergedCoordinates, [
    [120.000000, 14.000000],
    [120.001000, 14.000000],
    [120.002000, 14.000000],
    [120.003000, 14.000000],
  ]);
});

test('getPathDistanceMeters sums the full route path distance', () => {
  const totalDistanceMeters = getPathDistanceMeters([
    [120.000000, 14.000000],
    [120.010000, 14.000000],
    [120.020000, 14.000000],
  ]);

  assert.ok(totalDistanceMeters > 2000);
});

test('buildStoredRouteFallbackGuidanceState does not invent a straight connector when live road guidance fails', () => {
  const fallbackGuidance = buildStoredRouteFallbackGuidanceState(
    [120.015000, 14.002000],
    [120.030000, 14.000000],
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
      [120.020000, 14.000000],
      [120.030000, 14.000000],
    ],
    'sta-maria-bayan-test',
    '2026-05-22T09:00:00.000Z',
  );

  assert.equal(fallbackGuidance.mode, 'stored-route-fallback');
  assert.equal(fallbackGuidance.connectorCoordinates, null);
});

test('buildDriverTripMetrics derives remaining distance and ETA from live guidance', () => {
  const guidance = buildStoredRouteFallbackGuidanceState(
    [120.000000, 14.000000],
    [120.020000, 14.000000],
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
      [120.020000, 14.000000],
    ],
    'sta-maria-bayan-test',
    '2026-05-22T09:00:00.000Z',
  );

  const tripMetrics = buildDriverTripMetrics(
    {
      ...guidance,
      mode: 'live-guidance',
      connectorCoordinates: null,
    },
    30,
    'live',
  );

  assert.ok(tripMetrics.distanceMeters);
  assert.ok(tripMetrics.distanceMeters > 2000);
  assert.equal(tripMetrics.etaMinutes, 5);
});

test('buildDriverTripMetrics suppresses ETA when the live speed is unavailable or paused', () => {
  const guidance = buildStoredRouteFallbackGuidanceState(
    [120.000000, 14.000000],
    [120.020000, 14.000000],
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
      [120.020000, 14.000000],
    ],
    'sta-maria-bayan-test',
    '2026-05-22T09:00:00.000Z',
  );

  const tripMetrics = buildDriverTripMetrics(
    {
      ...guidance,
      mode: 'live-guidance',
      connectorCoordinates: null,
    },
    null,
    'missing',
  );

  assert.ok(tripMetrics.distanceMeters);
  assert.equal(tripMetrics.etaMinutes, null);
});

test('shouldRefreshDriverGuidance ignores minor movement along the same guidance path', () => {
  const guidance = buildStoredRouteFallbackGuidanceState(
    [120.000000, 14.000000],
    [120.030000, 14.000000],
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
      [120.020000, 14.000000],
      [120.030000, 14.000000],
    ],
    'sta-maria-bayan-test',
    '2026-05-22T09:00:00.000Z',
  );

  assert.equal(shouldRefreshDriverGuidance({
    guidance: {
      ...guidance,
      mode: 'live-guidance',
      routeCoordinates: [
        [120.000000, 14.000000],
        [120.010000, 14.000000],
        [120.020000, 14.000000],
        [120.030000, 14.000000],
      ],
    },
    currentCoordinate: [120.000400, 14.000000],
    destinationCoordinate: [120.030000, 14.000000],
    sourceRouteId: 'sta-maria-bayan-test',
    now: Date.parse('2026-05-22T09:00:05.000Z'),
  }), false);
});

test('shouldRefreshDriverGuidance reroutes after meaningful movement beyond the refresh threshold', () => {
  const guidance = buildStoredRouteFallbackGuidanceState(
    [120.000000, 14.000000],
    [120.030000, 14.000000],
    [
      [120.000000, 14.000000],
      [120.010000, 14.000000],
      [120.020000, 14.000000],
      [120.030000, 14.000000],
    ],
    'sta-maria-bayan-test',
    '2026-05-22T09:00:00.000Z',
  );

  assert.equal(shouldRefreshDriverGuidance({
    guidance: {
      ...guidance,
      mode: 'live-guidance',
      routeCoordinates: [
        [120.000000, 14.000000],
        [120.010000, 14.000000],
        [120.020000, 14.000000],
        [120.030000, 14.000000],
      ],
    },
    currentCoordinate: [120.001200, 14.000000],
    destinationCoordinate: [120.030000, 14.000000],
    sourceRouteId: 'sta-maria-bayan-test',
    now: Date.parse('2026-05-22T09:00:00.000Z') + DRIVER_GUIDANCE_MIN_REFRESH_INTERVAL_MS + 1000,
  }), true);
});

test('shouldRefreshDriverGuidance refreshes immediately when the source route geometry changes under the same route id', () => {
  const originalRouteCoordinates = [
    [120.000000, 14.000000],
    [120.010000, 14.000000],
    [120.020000, 14.000000],
    [120.030000, 14.000000],
  ] as [number, number][];
  const updatedRouteCoordinates = [
    [120.000000, 14.000000],
    [120.012000, 14.000000],
    [120.022000, 14.000000],
    [120.030000, 14.000000],
  ] as [number, number][];
  const guidance = buildStoredRouteFallbackGuidanceState(
    [120.000000, 14.000000],
    [120.030000, 14.000000],
    originalRouteCoordinates,
    'sta-maria-bayan-test',
    '2026-05-22T09:00:00.000Z',
    'Live road guidance unavailable. Showing the remaining assigned route only.',
    null,
    buildRouteGeometrySignature(originalRouteCoordinates),
  );

  assert.equal(shouldRefreshDriverGuidance({
    guidance: {
      ...guidance,
      mode: 'live-guidance',
      routeCoordinates: originalRouteCoordinates,
    },
    currentCoordinate: [120.000400, 14.000000],
    destinationCoordinate: [120.030000, 14.000000],
    sourceRouteId: 'sta-maria-bayan-test',
    sourceRouteGeometrySignature: buildRouteGeometrySignature(updatedRouteCoordinates),
    now: Date.parse('2026-05-22T09:00:05.000Z'),
  }), true);
});
