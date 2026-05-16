import assert from 'node:assert/strict';
import test from 'node:test';

import { ROUTE_SEED, TERMINAL_SEED } from '@/lib/seed/transport-catalog';

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

test('route catalog includes both directions for each terminal branch', () => {
  const routeIds = new Set(ROUTE_SEED.map((route) => route.id));

  assert.equal(routeIds.has('sta-maria-bayan-halang'), true);
  assert.equal(routeIds.has('halang-sta-maria-bayan'), true);
  assert.equal(routeIds.has('sta-maria-bayan-norzagaray'), true);
  assert.equal(routeIds.has('norzagaray-sta-maria-bayan'), true);
  assert.equal(routeIds.has('sta-maria-bayan-san-jose'), true);
  assert.equal(routeIds.has('san-jose-sta-maria-bayan'), true);
});
