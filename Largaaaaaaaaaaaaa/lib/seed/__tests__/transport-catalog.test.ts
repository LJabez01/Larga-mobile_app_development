import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findSelfReturningLoopRanges,
  findShortBranchRanges,
  getCoordinateDistanceMeters,
} from '@/lib/domain/route-geometry';
import { ROUTE_SEED, TERMINAL_SEED } from '@/lib/seed/transport-catalog';
import {
  getMaxTerminalEndpointAlignmentDistanceMeters,
  getRouteTruthTerminalCoordinate,
  getRouteTruthTerminalMarkerCoordinate,
} from '@/lib/seed/transport-location-inventory';
import {
  BASE_ROUTE_TEMPLATE_SEED,
  buildReverseRouteId,
  reverseRouteCoordinates,
} from '@/lib/seed/transport-route-templates';

function getCoordinateDistance(
  left: [number, number],
  right: [number, number],
) {
  const longitudeDistance = left[0] - right[0];
  const latitudeDistance = left[1] - right[1];

  return Math.sqrt((longitudeDistance ** 2) + (latitudeDistance ** 2));
}

function findCoordinateIndex(
  coordinates: Array<[number, number]>,
  target: [number, number],
) {
  return coordinates.findIndex((coordinate) => (
    coordinate[0] === target[0] && coordinate[1] === target[1]
  ));
}

test('all routes reference known terminals', () => {
  const terminalIds = new Set(TERMINAL_SEED.map((terminal) => terminal.id));

  ROUTE_SEED.forEach((route) => {
    assert.equal(terminalIds.has(route.originTerminalId), true);
    assert.equal(terminalIds.has(route.destinationTerminalId), true);
  });
});

test('each route contains at least two coordinates', () => {
  ROUTE_SEED.forEach((route) => {
    assert.equal(route.coordinates.length >= 2, true);
  });
});

test('forward routes are generated from dense road-following geometry', () => {
  BASE_ROUTE_TEMPLATE_SEED.forEach((routeTemplate) => {
    const route = ROUTE_SEED.find((item) => item.id === routeTemplate.id);

    assert.ok(route, `Expected route ${routeTemplate.id} to exist`);
    assert.equal(route.coordinates.length > routeTemplate.waypoints.length, true);
    assert.equal(getCoordinateDistance(route.coordinates[0], routeTemplate.waypoints[0]) < 0.001, true);
    assert.equal(
      getCoordinateDistance(
        route.coordinates[route.coordinates.length - 1],
        routeTemplate.waypoints[routeTemplate.waypoints.length - 1],
      ) < 0.001,
      true,
    );
  });
});

test('route catalog includes both directions for each terminal branch', () => {
  const routeIds = new Set(ROUTE_SEED.map((route) => route.id));

  assert.equal(routeIds.has('sta-maria-bayan-halang'), true);
  assert.equal(routeIds.has('halang-sta-maria-bayan'), true);
  assert.equal(routeIds.has('sta-maria-bayan-norzagaray'), true);
  assert.equal(routeIds.has('norzagaray-sta-maria-bayan'), true);
  assert.equal(routeIds.has('sta-maria-bayan-san-jose'), true);
  assert.equal(routeIds.has('san-jose-sta-maria-bayan'), true);
});

test('route templates start and end at the shared route-truth terminal coordinates', () => {
  BASE_ROUTE_TEMPLATE_SEED.forEach((routeTemplate) => {
    assert.deepEqual(
      routeTemplate.waypoints[0],
      getRouteTruthTerminalCoordinate(routeTemplate.originTerminalId),
    );
    assert.deepEqual(
      routeTemplate.waypoints[routeTemplate.waypoints.length - 1],
      getRouteTruthTerminalCoordinate(routeTemplate.destinationTerminalId),
    );
  });
});

test('route catalog terminal markers stay aligned with the official route endpoint coordinates', () => {
  TERMINAL_SEED.forEach((terminal) => {
    assert.equal(
      getCoordinateDistanceMeters(
        terminal.coordinate,
        getRouteTruthTerminalCoordinate(terminal.id),
      ) <= getMaxTerminalEndpointAlignmentDistanceMeters(terminal.id),
      true,
      `Expected ${terminal.id} marker and route endpoint to stay aligned`,
    );
    assert.deepEqual(
      terminal.coordinate,
      getRouteTruthTerminalMarkerCoordinate(terminal.id),
    );
  });
});

test('route templates are explicitly classified into the expected corridor families', () => {
  const corridorFamiliesByRoute = new Map(
    BASE_ROUTE_TEMPLATE_SEED.map((routeTemplate) => [routeTemplate.id, routeTemplate.corridorFamilyId]),
  );

  assert.equal(
    corridorFamiliesByRoute.get('sta-maria-bayan-san-jose'),
    'sta-maria-sjdm-corridor',
  );
  assert.equal(
    corridorFamiliesByRoute.get('sta-maria-bayan-halang'),
    'sta-maria-sjdm-corridor',
  );
  assert.equal(
    corridorFamiliesByRoute.get('sta-maria-bayan-norzagaray'),
    'sta-maria-norzagaray-corridor',
  );
});

test('reverse route records are derived from the same cleaned forward corridor spine', () => {
  BASE_ROUTE_TEMPLATE_SEED.forEach((routeTemplate) => {
    const forwardRoute = ROUTE_SEED.find((route) => route.id === routeTemplate.id);
    const reverseRoute = ROUTE_SEED.find(
      (route) => route.id === buildReverseRouteId(
        routeTemplate.originTerminalId,
        routeTemplate.destinationTerminalId,
      ),
    );

    assert.ok(forwardRoute, `Expected forward route ${routeTemplate.id} to exist`);
    assert.ok(reverseRoute, `Expected reverse route for ${routeTemplate.id} to exist`);
    assert.equal(reverseRoute.originTerminalId, routeTemplate.destinationTerminalId);
    assert.equal(reverseRoute.destinationTerminalId, routeTemplate.originTerminalId);
    assert.deepEqual(reverseRoute.coordinates, reverseRouteCoordinates(forwardRoute.coordinates));
  });
});

test('forward corridor spines no longer contain obvious branch stubs or self-returning loops', () => {
  BASE_ROUTE_TEMPLATE_SEED.forEach((routeTemplate) => {
    const route = ROUTE_SEED.find((item) => item.id === routeTemplate.id);

    assert.ok(route, `Expected route ${routeTemplate.id} to exist`);
    assert.deepEqual(
      findShortBranchRanges(route.coordinates),
      [],
      `Expected ${route.id} to be free of short branch stubs`,
    );
    assert.deepEqual(
      findSelfReturningLoopRanges(route.coordinates),
      [],
      `Expected ${route.id} to be free of self-returning loops`,
    );
  });
});

test('sta maria sjdm corridor routes start from the shared main-road rejoin point instead of the local terminal-side stub', () => {
  const halangRoute = ROUTE_SEED.find((route) => route.id === 'sta-maria-bayan-halang');
  const sanJoseRoute = ROUTE_SEED.find((route) => route.id === 'sta-maria-bayan-san-jose');
  const staMariaWaypoint = BASE_ROUTE_TEMPLATE_SEED.find((route) => route.id === 'sta-maria-bayan-san-jose')?.waypoints[0];

  assert.ok(halangRoute, 'Expected sta-maria-bayan-halang to exist');
  assert.ok(sanJoseRoute, 'Expected sta-maria-bayan-san-jose to exist');
  assert.ok(staMariaWaypoint, 'Expected shared Sta. Maria waypoint to exist');
  assert.deepEqual(halangRoute.coordinates[0], sanJoseRoute.coordinates[0]);
  assert.equal(getCoordinateDistance(halangRoute.coordinates[0], staMariaWaypoint) < 0.001, true);
});

test('san jose corridor ends at the San Jose terminal marker and the reverse route starts from that same point', () => {
  const forwardRoute = ROUTE_SEED.find((route) => route.id === 'sta-maria-bayan-san-jose');
  const reverseRoute = ROUTE_SEED.find((route) => route.id === 'san-jose-sta-maria-bayan');
  const sanJoseRouteTruthEndpoint = getRouteTruthTerminalCoordinate('san-jose-terminal');
  const sanJoseMarkerCoordinate = getRouteTruthTerminalMarkerCoordinate('san-jose-terminal');

  assert.ok(forwardRoute, 'Expected sta-maria-bayan-san-jose to exist');
  assert.ok(reverseRoute, 'Expected san-jose-sta-maria-bayan to exist');
  assert.deepEqual(sanJoseRouteTruthEndpoint, sanJoseMarkerCoordinate);
  assert.deepEqual(forwardRoute.coordinates[forwardRoute.coordinates.length - 1], sanJoseRouteTruthEndpoint);
  assert.deepEqual(reverseRoute.coordinates[0], sanJoseRouteTruthEndpoint);
});

test('sta maria san jose corridor keeps the Shell Patag segment on the main road without the local side turn', () => {
  const sanJoseRoute = ROUTE_SEED.find((route) => route.id === 'sta-maria-bayan-san-jose');
  const localTurnCoordinate: [number, number] = [120.981458, 14.827047];
  const shellMainRoadCoordinate: [number, number] = [120.981249, 14.826195];
  const shellApproachCoordinate: [number, number] = [120.980850, 14.826279];
  const shellRejoinCoordinate: [number, number] = [120.982102, 14.826351];

  assert.ok(sanJoseRoute, 'Expected sta-maria-bayan-san-jose to exist');
  assert.equal(findCoordinateIndex(sanJoseRoute.coordinates, localTurnCoordinate), -1);
  const approachIndex = findCoordinateIndex(sanJoseRoute.coordinates, shellApproachCoordinate);
  const mainRoadIndex = findCoordinateIndex(sanJoseRoute.coordinates, shellMainRoadCoordinate);
  const rejoinIndex = findCoordinateIndex(sanJoseRoute.coordinates, shellRejoinCoordinate);

  assert.equal(mainRoadIndex > approachIndex, true, 'Expected San Jose route to include the Shell main-road waypoint');
  assert.equal(rejoinIndex > mainRoadIndex, true, 'Expected San Jose route to rejoin the corridor after the Shell main-road waypoint');
});

test('sta maria norzagaray corridor stays on Norzagaray-Sta. Maria Road instead of the Puntong Bato-Landicho detour', () => {
  const norzagarayRoute = ROUTE_SEED.find((route) => route.id === 'sta-maria-bayan-norzagaray');
  const eastDetourCoordinate: [number, number] = [120.989695, 14.848899];
  const eastDetourLoopCoordinate: [number, number] = [120.989511, 14.848889];
  const mainRoadCoordinate: [number, number] = [120.980732, 14.847170];

  assert.ok(norzagarayRoute, 'Expected sta-maria-bayan-norzagaray to exist');
  assert.equal(findCoordinateIndex(norzagarayRoute.coordinates, eastDetourCoordinate), -1);
  assert.equal(findCoordinateIndex(norzagarayRoute.coordinates, eastDetourLoopCoordinate), -1);
  assert.notEqual(findCoordinateIndex(norzagarayRoute.coordinates, mainRoadCoordinate), -1);
});
