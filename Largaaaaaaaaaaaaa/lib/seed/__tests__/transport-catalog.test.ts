import assert from 'node:assert/strict';
import test from 'node:test';

import { ROUTE_SEED, TERMINAL_SEED } from '@/lib/seed/transport-catalog';
import { BASE_ROUTE_TEMPLATE_SEED } from '@/lib/seed/transport-route-templates';

function getCoordinateDistance(
  left: [number, number],
  right: [number, number],
) {
  const longitudeDistance = left[0] - right[0];
  const latitudeDistance = left[1] - right[1];

  return Math.sqrt((longitudeDistance ** 2) + (latitudeDistance ** 2));
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
