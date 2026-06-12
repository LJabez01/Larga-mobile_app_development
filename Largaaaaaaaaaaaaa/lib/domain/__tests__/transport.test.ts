import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendDriverInMotionInteractionTimestamp,
  buildDriverTripMetrics,
  resolveDriverArrivalState,
  resolveDriverActiveWarningMessage,
  resolveDriverGuidanceWarningMessage,
  resolveDriverInMotionSafetyWarningState,
  resolveDriverOffRouteState,
  buildRouteGeometrySignature,
  buildDriverGuidancePathPlan,
  buildGuidanceWaypointPath,
  buildLiveDriverGuidanceState,
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

test('buildDriverGuidancePathPlan prefers the earliest comparable start-corridor rejoin instead of the marginally shortest deeper segment', () => {
  const routeCoordinates = [
    [120.000000, 14.000000],
    [120.001000, 14.000000],
    [120.002000, 14.000000],
    [120.003000, 14.000000],
    [120.004000, 14.000000],
    [120.005000, 14.000000],
    [120.006000, 14.000000],
    [120.007000, 14.000000],
    [120.008000, 14.000000],
    [120.009000, 14.000000],
    [120.010000, 14.000000],
    [120.011000, 14.000000],
    [120.012000, 14.000000],
  ] as [number, number][];

  const guidancePlan = buildDriverGuidancePathPlan(
    [120.010500, 14.001200],
    routeCoordinates,
    routeCoordinates[routeCoordinates.length - 1],
    0,
  );

  assert.deepEqual(guidancePlan.rejoinCoordinate, [120.010000, 14.000000]);
  assert.equal(guidancePlan.rejoinSegmentIndex, 9);
  assert.deepEqual(guidancePlan.remainingRouteCoordinates[0], [120.010000, 14.000000]);
  assert.deepEqual(
    guidancePlan.remainingRouteCoordinates[guidancePlan.remainingRouteCoordinates.length - 1],
    routeCoordinates[routeCoordinates.length - 1],
  );
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

test('resolveDriverArrivalState becomes ready only when live guidance is close to the destination', () => {
  const arrivalState = resolveDriverArrivalState(
    buildLiveDriverGuidanceState(
      [120.000000, 14.000000],
      [120.000500, 14.000000],
      [
        [120.000000, 14.000000],
        [120.000250, 14.000000],
        [120.000500, 14.000000],
      ],
      'route-1',
    ),
    'live',
  );

  assert.equal(arrivalState.isArrivalReady, true);
  assert.ok(arrivalState.directDistanceMeters);
  assert.ok(arrivalState.remainingDistanceMeters);
  assert.ok(arrivalState.directDistanceMeters < 90);
  assert.ok(arrivalState.remainingDistanceMeters < 140);
});

test('resolveDriverArrivalState stays false when the trip location is stale or the route is still far away', () => {
  const nearExitArrivalState = resolveDriverArrivalState(
    buildLiveDriverGuidanceState(
      [120.000000, 14.000000],
      [120.001400, 14.000000],
      [
        [120.000000, 14.000000],
        [120.000700, 14.000000],
        [120.001400, 14.000000],
      ],
      'route-1',
    ),
    'live',
  );
  const farArrivalState = resolveDriverArrivalState(
    buildLiveDriverGuidanceState(
      [120.000000, 14.000000],
      [120.020000, 14.000000],
      [
        [120.000000, 14.000000],
        [120.010000, 14.000000],
        [120.020000, 14.000000],
      ],
      'route-1',
    ),
    'live',
  );
  const staleArrivalState = resolveDriverArrivalState(
    buildLiveDriverGuidanceState(
      [120.000000, 14.000000],
      [120.000500, 14.000000],
      [
        [120.000000, 14.000000],
        [120.000250, 14.000000],
        [120.000500, 14.000000],
      ],
      'route-1',
    ),
    'stale',
  );

  assert.equal(nearExitArrivalState.isArrivalReady, false);
  assert.equal(
    (nearExitArrivalState as { isPromptRearmReady?: boolean }).isPromptRearmReady,
    false,
  );
  assert.equal(farArrivalState.isArrivalReady, false);
  assert.ok((farArrivalState.remainingDistanceMeters ?? 0) > 140);
  assert.equal(
    (farArrivalState as { isPromptRearmReady?: boolean }).isPromptRearmReady,
    true,
  );
  assert.equal(staleArrivalState.isArrivalReady, false);
  assert.equal(staleArrivalState.directDistanceMeters, null);
  assert.equal(staleArrivalState.remainingDistanceMeters, null);
  assert.equal(
    (staleArrivalState as { isPromptRearmReady?: boolean }).isPromptRearmReady,
    false,
  );
});

test('resolveDriverOffRouteState becomes visible when the live driver drifts far from the remaining corridor', () => {
  const offRouteState = resolveDriverOffRouteState(
    buildLiveDriverGuidanceState(
      [120.000000, 14.001000],
      [120.020000, 14.000000],
      [
        [120.000000, 14.000000],
        [120.010000, 14.000000],
        [120.020000, 14.000000],
      ],
      'route-1',
    ),
    'live',
  );

  assert.equal(offRouteState.isWarningVisible, true);
  assert.equal(offRouteState.isWarningClearReady, false);
  assert.ok((offRouteState.routeDistanceMeters ?? 0) >= 80);
  assert.equal(
    offRouteState.warningMessage,
    'You seem to be off route. Rejoin the highlighted corridor when safe.',
  );
});

test('resolveDriverOffRouteState waits for a clear rejoin before dropping the warning state', () => {
  const nearCorridorBufferState = resolveDriverOffRouteState(
    buildLiveDriverGuidanceState(
      [120.000000, 14.000450],
      [120.020000, 14.000000],
      [
        [120.000000, 14.000000],
        [120.010000, 14.000000],
        [120.020000, 14.000000],
      ],
      'route-1',
    ),
    'live',
  );
  const rejoinedCorridorState = resolveDriverOffRouteState(
    buildLiveDriverGuidanceState(
      [120.000000, 14.000100],
      [120.020000, 14.000000],
      [
        [120.000000, 14.000000],
        [120.010000, 14.000000],
        [120.020000, 14.000000],
      ],
      'route-1',
    ),
    'live',
  );
  const staleState = resolveDriverOffRouteState(
    buildLiveDriverGuidanceState(
      [120.000000, 14.001000],
      [120.020000, 14.000000],
      [
        [120.000000, 14.000000],
        [120.010000, 14.000000],
        [120.020000, 14.000000],
      ],
      'route-1',
    ),
    'stale',
  );

  assert.equal(nearCorridorBufferState.isWarningVisible, false);
  assert.equal(nearCorridorBufferState.isWarningClearReady, false);
  assert.ok((nearCorridorBufferState.routeDistanceMeters ?? 0) > 40);
  assert.ok((nearCorridorBufferState.routeDistanceMeters ?? 0) < 80);
  assert.equal(
    nearCorridorBufferState.warningMessage,
    'You seem to be off route. Rejoin the highlighted corridor when safe.',
  );

  assert.equal(rejoinedCorridorState.isWarningVisible, false);
  assert.equal(rejoinedCorridorState.isWarningClearReady, true);
  assert.ok((rejoinedCorridorState.routeDistanceMeters ?? 0) <= 40);
  assert.equal(rejoinedCorridorState.warningMessage, null);

  assert.equal(staleState.isWarningVisible, false);
  assert.equal(staleState.isWarningClearReady, false);
  assert.equal(staleState.routeDistanceMeters, null);
  assert.equal(staleState.warningMessage, null);
});

test('resolveDriverGuidanceWarningMessage falls back to the guidance warning when a latched off-route warning is no longer valid', () => {
  const warningMessage = resolveDriverGuidanceWarningMessage(
    'Route guidance is unavailable right now. Retry when your connection improves.',
    {
      routeDistanceMeters: null,
      isWarningVisible: false,
      isWarningClearReady: false,
      warningMessage: null,
    },
    true,
  );

  assert.equal(
    warningMessage,
    'Route guidance is unavailable right now. Retry when your connection improves.',
  );
});

test('resolveDriverGuidanceWarningMessage keeps a latched off-route warning active through the buffer zone', () => {
  const warningMessage = resolveDriverGuidanceWarningMessage(
    'Route guidance is unavailable right now. Retry when your connection improves.',
    {
      routeDistanceMeters: 55,
      isWarningVisible: false,
      isWarningClearReady: false,
      warningMessage: 'You seem to be off route. Rejoin the highlighted corridor when safe.',
    },
    true,
  );

  assert.equal(
    warningMessage,
    'You seem to be off route. Rejoin the highlighted corridor when safe.',
  );
});

test('appendDriverInMotionInteractionTimestamp ignores repeated touch events from the same gesture', () => {
  const interactionTimestamps = appendDriverInMotionInteractionTimestamp(
    [
      Date.parse('2026-06-12T12:00:00.000Z'),
    ],
    Date.parse('2026-06-12T12:00:00.600Z'),
  );

  assert.deepEqual(interactionTimestamps, [
    Date.parse('2026-06-12T12:00:00.000Z'),
  ]);
});

test('appendDriverInMotionInteractionTimestamp prunes stale entries and appends a later distinct interaction', () => {
  const interactionTimestamps = appendDriverInMotionInteractionTimestamp(
    [
      Date.parse('2026-06-12T11:59:50.000Z'),
      Date.parse('2026-06-12T11:59:54.000Z'),
    ],
    Date.parse('2026-06-12T12:00:00.500Z'),
  );

  assert.deepEqual(interactionTimestamps, [
    Date.parse('2026-06-12T11:59:54.000Z'),
    Date.parse('2026-06-12T12:00:00.500Z'),
  ]);
});

test('resolveDriverInMotionSafetyWarningState triggers when the live driver is moving and keeps tapping the screen', () => {
  const warningState = resolveDriverInMotionSafetyWarningState({
    locationStatus: 'live',
    speedKph: 18,
    interactionTimestamps: [
      Date.parse('2026-06-12T11:59:54.000Z'),
      Date.parse('2026-06-12T11:59:57.000Z'),
      Date.parse('2026-06-12T11:59:59.000Z'),
    ],
    lastWarningAtMs: null,
    now: Date.parse('2026-06-12T12:00:00.000Z'),
  });

  assert.equal(warningState.interactionCount, 3);
  assert.equal(warningState.isInteractionBurst, true);
  assert.equal(warningState.isCooldownActive, false);
  assert.equal(warningState.shouldTriggerWarning, true);
  assert.equal(
    warningState.warningMessage,
    'You are moving. Avoid using the screen until it is safe.',
  );
});

test('resolveDriverInMotionSafetyWarningState keeps the warning visible through its cooldown window', () => {
  const warningState = resolveDriverInMotionSafetyWarningState({
    locationStatus: 'live',
    speedKph: 22,
    interactionTimestamps: [
      Date.parse('2026-06-12T11:59:58.000Z'),
    ],
    lastWarningAtMs: Date.parse('2026-06-12T11:59:52.000Z'),
    now: Date.parse('2026-06-12T12:00:00.000Z'),
  });

  assert.equal(warningState.interactionCount, 1);
  assert.equal(warningState.isInteractionBurst, false);
  assert.equal(warningState.isCooldownActive, true);
  assert.equal(warningState.shouldTriggerWarning, false);
  assert.equal(
    warningState.warningMessage,
    'You are moving. Avoid using the screen until it is safe.',
  );
});

test('resolveDriverInMotionSafetyWarningState clears after the cooldown ends when the rapid interaction burst stops', () => {
  const warningState = resolveDriverInMotionSafetyWarningState({
    locationStatus: 'live',
    speedKph: 21,
    interactionTimestamps: [
      Date.parse('2026-06-12T11:59:42.000Z'),
      Date.parse('2026-06-12T11:59:45.000Z'),
    ],
    lastWarningAtMs: Date.parse('2026-06-12T11:59:40.000Z'),
    now: Date.parse('2026-06-12T12:00:00.000Z'),
  });

  assert.equal(warningState.interactionCount, 0);
  assert.equal(warningState.isInteractionBurst, false);
  assert.equal(warningState.isCooldownActive, false);
  assert.equal(warningState.shouldTriggerWarning, false);
  assert.equal(warningState.warningMessage, null);
});

test('resolveDriverInMotionSafetyWarningState stays quiet when the trip is not live or the driver is moving too slowly', () => {
  const staleWarningState = resolveDriverInMotionSafetyWarningState({
    locationStatus: 'stale',
    speedKph: 24,
    interactionTimestamps: [
      Date.parse('2026-06-12T11:59:54.000Z'),
      Date.parse('2026-06-12T11:59:56.000Z'),
      Date.parse('2026-06-12T11:59:58.000Z'),
    ],
    lastWarningAtMs: null,
    now: Date.parse('2026-06-12T12:00:00.000Z'),
  });
  const slowWarningState = resolveDriverInMotionSafetyWarningState({
    locationStatus: 'live',
    speedKph: 8,
    interactionTimestamps: [
      Date.parse('2026-06-12T11:59:54.000Z'),
      Date.parse('2026-06-12T11:59:56.000Z'),
      Date.parse('2026-06-12T11:59:58.000Z'),
    ],
    lastWarningAtMs: null,
    now: Date.parse('2026-06-12T12:00:00.000Z'),
  });

  assert.equal(staleWarningState.shouldTriggerWarning, false);
  assert.equal(staleWarningState.warningMessage, null);
  assert.equal(slowWarningState.shouldTriggerWarning, false);
  assert.equal(slowWarningState.warningMessage, null);
});

test('resolveDriverActiveWarningMessage gives the in-motion safety warning priority over route guidance copy', () => {
  const warningMessage = resolveDriverActiveWarningMessage(
    'You are moving. Avoid using the screen until it is safe.',
    'Route guidance is unavailable right now. Retry when your connection improves.',
    {
      routeDistanceMeters: 95,
      isWarningVisible: true,
      isWarningClearReady: false,
      warningMessage: 'You seem to be off route. Rejoin the highlighted corridor when safe.',
    },
    true,
  );

  assert.equal(
    warningMessage,
    'You are moving. Avoid using the screen until it is safe.',
  );
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
