import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DRIVER_GUIDANCE_CONNECTOR_MIN_DISTANCE_METERS,
  buildDriverGuidancePathPlan,
  buildGuidanceWaypointPath,
  getCoordinateDistanceMeters,
  type RouteCoordinate,
} from '@/lib/domain/transport';
import { requestDriverGuidanceRoute } from '@/services/live-data/mapbox-guidance';

// JSON Response Fixture - creates a minimal fetch response for Mapbox guidance tests.
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

test('requestDriverGuidanceRoute constrains the reconnect request with later corridor anchors instead of forcing the first local rejoin point', async () => {
  const routeCoordinates = [
    [120.000000, 14.000000],
    [120.002000, 14.000000],
    [120.004000, 14.000000],
    [120.004000, 14.002000],
    [120.006000, 14.002000],
    [120.008000, 14.000000],
  ] as RouteCoordinate[];
  const currentCoordinate = [120.005100, 14.001300] as RouteCoordinate;
  const destinationCoordinate = routeCoordinates[routeCoordinates.length - 1];
  const waypointPath = buildGuidanceWaypointPath(
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
            [120.004100, 14.001700],
            [120.004000, 14.002000],
            [120.006000, 14.002000],
            destinationCoordinate,
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
      [
        waypointPath[0],
        ...waypointPath.slice(2),
      ]
        .map(([longitude, latitude]) => `${longitude},${latitude}`)
        .join(';'),
    );
    assert.deepEqual(response.routeCoordinates[0], [120.004000, 14.002000]);
    assert.equal(response.routeProgressSegmentIndex, 3);
    assert.deepEqual(response.connectorCoordinates, [
      currentCoordinate,
      [120.004100, 14.001700],
      [120.004000, 14.002000],
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('requestDriverGuidanceRoute clips the dashed reconnect path at the first merge with the official corridor', async () => {
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

  global.fetch = async () => createJsonResponse({
    routes: [{
      geometry: {
        coordinates: [
          currentCoordinate,
          [120.004200, 14.000900],
          [120.004400, 14.000100],
          [120.006000, 14.000000],
          destinationCoordinate,
        ],
      },
    }],
  });

  try {
    const response = await requestDriverGuidanceRoute({
      currentCoordinate,
      destinationCoordinate,
      storedRouteCoordinates: routeCoordinates,
    });

    assert.deepEqual(
      response.connectorCoordinates?.[response.connectorCoordinates.length - 1],
      [120.004400, 14.000000],
    );
    assert.deepEqual(response.routeCoordinates[0], [120.004400, 14.000000]);
    assert.notDeepEqual(
      response.connectorCoordinates?.[response.connectorCoordinates.length - 1],
      destinationCoordinate,
    );
    assert.ok((response.connectorCoordinates?.length ?? 0) < 5);
  } finally {
    global.fetch = originalFetch;
  }
});

test('requestDriverGuidanceRoute uses the stored reconnect access corridor as road-following constraints', async () => {
  const routeCoordinates = [
    [120.960000, 14.818000],
    [120.966000, 14.831700],
    [120.977100, 14.836900],
    [120.985000, 14.842000],
  ] as RouteCoordinate[];
  const reconnectAccessCoordinates = [
    [120.980000, 14.826000],
    [120.975830, 14.826850],
    routeCoordinates[1],
    routeCoordinates[2],
  ] as RouteCoordinate[];
  const currentCoordinate = [120.980500, 14.826200] as RouteCoordinate;
  const destinationCoordinate = routeCoordinates[routeCoordinates.length - 1];
  const originalFetch = global.fetch;
  const fetchCalls: string[] = [];

  global.fetch = async (input) => {
    fetchCalls.push(String(input));

    return createJsonResponse({
      routes: [{
        geometry: {
          coordinates: [
            currentCoordinate,
            [120.979500, 14.826400],
            [120.977500, 14.826600],
            [120.971000, 14.829000],
            reconnectAccessCoordinates[2],
            reconnectAccessCoordinates[3],
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
      reconnectAccessCoordinates,
    });

    assert.equal(fetchCalls.length, 1);
    const requestUrl = new URL(fetchCalls[0]);
    const requestedCoordinates = requestUrl.pathname.split('/').pop();

    assert.equal(
      requestedCoordinates,
      [
        currentCoordinate,
        ...reconnectAccessCoordinates,
      ]
        .map(([longitude, latitude]) => `${longitude},${latitude}`)
        .join(';'),
    );
    assert.deepEqual(response.connectorCoordinates, [
      currentCoordinate,
      [120.979500, 14.826400],
      [120.977500, 14.826600],
      [120.971000, 14.829000],
      reconnectAccessCoordinates[2],
      reconnectAccessCoordinates[3],
    ]);
    assert.deepEqual(response.routeCoordinates[0], routeCoordinates[2]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('requestDriverGuidanceRoute slices the reconnect access corridor from the driver location', async () => {
  const routeCoordinates = [
    [120.000000, 14.000000],
    [120.010000, 14.000000],
    [120.020000, 14.000000],
    [120.030000, 14.000000],
  ] as RouteCoordinate[];
  const reconnectAccessCoordinates = [
    [120.001000, 14.001000],
    [120.005000, 14.001000],
    routeCoordinates[1],
    routeCoordinates[2],
  ] as RouteCoordinate[];
  const currentCoordinate = reconnectAccessCoordinates[1];
  const destinationCoordinate = routeCoordinates[routeCoordinates.length - 1];
  const originalFetch = global.fetch;
  const fetchCalls: string[] = [];

  global.fetch = async (input) => {
    fetchCalls.push(String(input));

    return createJsonResponse({
      routes: [{
        geometry: {
          coordinates: [
            currentCoordinate,
            [120.007000, 14.000800],
            reconnectAccessCoordinates[2],
            reconnectAccessCoordinates[3],
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
      reconnectAccessCoordinates,
    });

    assert.equal(fetchCalls.length, 1);
    const requestUrl = new URL(fetchCalls[0]);
    const requestedCoordinates = requestUrl.pathname.split('/').pop();

    assert.equal(
      requestedCoordinates,
      [
        currentCoordinate,
        reconnectAccessCoordinates[2],
        reconnectAccessCoordinates[3],
      ]
        .map(([longitude, latitude]) => `${longitude},${latitude}`)
        .join(';'),
    );
    assert.ok(
      !requestedCoordinates?.includes(
        `${reconnectAccessCoordinates[0][0]},${reconnectAccessCoordinates[0][1]}`,
      ),
    );
    assert.deepEqual(response.routeCoordinates[0], routeCoordinates[2]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('requestDriverGuidanceRoute ignores reconnect access corridors that are too far from the driver', async () => {
  const routeCoordinates = [
    [120.000000, 14.000000],
    [120.010000, 14.000000],
    [120.020000, 14.000000],
  ] as RouteCoordinate[];
  const reconnectAccessCoordinates = [
    [120.300000, 14.300000],
    [120.310000, 14.300000],
  ] as RouteCoordinate[];
  const currentCoordinate = [120.000000, 14.030000] as RouteCoordinate;
  const destinationCoordinate = routeCoordinates[routeCoordinates.length - 1];
  const originalFetch = global.fetch;
  const fetchCalls: string[] = [];

  global.fetch = async (input) => {
    fetchCalls.push(String(input));

    return createJsonResponse({
      routes: [{
        geometry: {
          coordinates: [
            currentCoordinate,
            [120.001000, 14.015000],
            routeCoordinates[1],
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
      reconnectAccessCoordinates,
    });

    assert.equal(fetchCalls.length, 1);
    const requestUrl = new URL(fetchCalls[0]);
    const requestedCoordinates = requestUrl.pathname.split('/').pop() ?? '';

    assert.ok(!requestedCoordinates.includes('120.3,14.3'));
    assert.deepEqual(response.routeCoordinates[0], routeCoordinates[1]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('requestDriverGuidanceRoute uses the directional access endpoint as the approved official rejoin', async () => {
  const routeCoordinates = [
    [120.000000, 14.000000],
    [120.002000, 14.000000],
    [120.004000, 14.000000],
    [120.006000, 14.000000],
    [120.008000, 14.000000],
  ] as RouteCoordinate[];
  const currentCoordinate = [120.004200, 14.001300] as RouteCoordinate;
  const destinationCoordinate = routeCoordinates[routeCoordinates.length - 1];
  const reconnectAccessCoordinates = [
    [120.004000, 14.001500],
    routeCoordinates[3],
  ] as RouteCoordinate[];
  const originalFetch = global.fetch;
  let requestedUrl: string | null = null;

  global.fetch = async (input) => {
    requestedUrl = String(input);

    return createJsonResponse({
      routes: [{
        geometry: {
          coordinates: [
            currentCoordinate,
            [120.004600, 14.001200],
            [120.005200, 14.000700],
            reconnectAccessCoordinates[1],
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
      reconnectAccessCoordinates,
    });

    assert.ok(requestedUrl);
    assert.deepEqual(response.connectorCoordinates?.[0], currentCoordinate);
    assert.deepEqual(
      response.connectorCoordinates?.[response.connectorCoordinates.length - 1],
      reconnectAccessCoordinates[1],
    );
    assert.ok(
      getCoordinateDistanceMeters(
        response.connectorCoordinates?.[1] ?? currentCoordinate,
        reconnectAccessCoordinates[0],
      ) > 50,
    );
    assert.deepEqual(response.routeCoordinates[0], routeCoordinates[3]);
    assert.notDeepEqual(response.routeCoordinates[0], routeCoordinates[2]);
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
