import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DRIVER_GUIDANCE_CONNECTOR_MIN_DISTANCE_METERS,
  buildDriverGuidancePathPlan,
  type RouteCoordinate,
} from '@/lib/domain/transport';
import { requestDriverGuidanceRoute } from '@/services/live-data/mapbox-guidance';

function createJsonResponse(payload: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    async json() {
      return payload;
    },
  } as Response;
}

test('requestDriverGuidanceRoute skips Mapbox when the driver is already close to the forward rejoin point', async () => {
  const routeCoordinates = [
    [120.000000, 14.000000],
    [120.001000, 14.000000],
    [120.002000, 14.000000],
  ] as RouteCoordinate[];
  const currentCoordinate = [120.001050, 14.000000] as RouteCoordinate;
  const destinationCoordinate = routeCoordinates[routeCoordinates.length - 1];
  const originalFetch = global.fetch;
  let fetchCalled = false;

  global.fetch = async () => {
    fetchCalled = true;
    throw new Error('Mapbox should not be called for near-route guidance.');
  };

  try {
    const response = await requestDriverGuidanceRoute({
      currentCoordinate,
      destinationCoordinate,
      storedRouteCoordinates: routeCoordinates,
    });

    assert.equal(fetchCalled, false);
    assert.equal(response.connectorCoordinates, null);
    assert.deepEqual(response.routeCoordinates[response.routeCoordinates.length - 1], destinationCoordinate);

    const guidancePlan = buildDriverGuidancePathPlan(
      currentCoordinate,
      routeCoordinates,
      destinationCoordinate,
    );

    assert.ok(guidancePlan.offRouteDistanceMeters < DRIVER_GUIDANCE_CONNECTOR_MIN_DISTANCE_METERS);
    assert.deepEqual(response.routeCoordinates, guidancePlan.remainingRouteCoordinates);
    assert.equal(response.routeProgressSegmentIndex, guidancePlan.rejoinSegmentIndex);
  } finally {
    global.fetch = originalFetch;
  }
});

test('requestDriverGuidanceRoute uses Mapbox only for the road-following reconnect path and preserves the stored remaining corridor', async () => {
  const routeCoordinates = [
    [120.000000, 14.000000],
    [120.002000, 14.000000],
    [120.004000, 14.000000],
    [120.006000, 14.000000],
    [120.008000, 14.000000],
  ] as RouteCoordinate[];
  const currentCoordinate = [120.004000, 14.001300] as RouteCoordinate;
  const destinationCoordinate = routeCoordinates[routeCoordinates.length - 1];
  const guidancePlan = buildDriverGuidancePathPlan(
    currentCoordinate,
    routeCoordinates,
    destinationCoordinate,
  );
  const originalFetch = global.fetch;
  const fetchCalls: string[] = [];

  global.fetch = async (input) => {
    fetchCalls.push(String(input));

    return createJsonResponse({
      routes: [{
        geometry: {
          coordinates: [
            currentCoordinate,
            [120.004200, 14.000900],
            guidancePlan.rejoinCoordinate,
          ],
        },
      }],
    });
  };

  try {
    const response = await requestDriverGuidanceRoute({
      currentCoordinate,
      destinationCoordinate,
      storedRouteCoordinates: routeCoordinates,
    });

    assert.equal(fetchCalls.length, 1);

    const requestUrl = new URL(fetchCalls[0]);
    const requestedCoordinates = requestUrl.pathname.split('/').pop();

    assert.equal(
      requestedCoordinates,
      `${currentCoordinate[0]},${currentCoordinate[1]};${guidancePlan.rejoinCoordinate[0]},${guidancePlan.rejoinCoordinate[1]}`,
    );
    assert.deepEqual(response.routeCoordinates, guidancePlan.remainingRouteCoordinates);
    assert.equal(response.routeProgressSegmentIndex, guidancePlan.rejoinSegmentIndex);
    assert.deepEqual(response.connectorCoordinates, [
      currentCoordinate,
      [120.004200, 14.000900],
      guidancePlan.rejoinCoordinate,
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('requestDriverGuidanceRoute rejects invalid Mapbox geometry instead of reshaping the official corridor', async () => {
  const routeCoordinates = [
    [120.000000, 14.000000],
    [120.002000, 14.000000],
    [120.004000, 14.000000],
  ] as RouteCoordinate[];
  const currentCoordinate = [120.002000, 14.001400] as RouteCoordinate;
  const destinationCoordinate = routeCoordinates[routeCoordinates.length - 1];
  const originalFetch = global.fetch;

  global.fetch = async () => createJsonResponse({
    routes: [{
      geometry: {
        coordinates: [['bad', 'geometry']],
      },
    }],
  });

  try {
    await assert.rejects(
      requestDriverGuidanceRoute({
        currentCoordinate,
        destinationCoordinate,
        storedRouteCoordinates: routeCoordinates,
      }),
      /invalid geometry/i,
    );
  } finally {
    global.fetch = originalFetch;
  }
});
