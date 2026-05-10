import test from 'node:test';
import assert from 'node:assert/strict';

import type { RouteRecord } from '@/lib/domain/routes';
import terminals from '@/lib/seed/terminals.json';
import routes from '@/lib/seed/routes.json';
import { validateSeedData } from '@/lib/seed/validateSeedData';

test('all routes reference known terminal ids', () => {
  const result = validateSeedData({ terminals, routes });
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('each route has at least two coordinates and a stable id', () => {
  const result = validateSeedData({ terminals, routes });
  assert.equal(result.routeCount, 6);
  assert.equal(result.terminalCount, 4);
});

test('validator reports malformed route data', () => {
  const malformedRoute: RouteRecord = {
    ...routes[0],
    id: 'jeepney__missing-terminal__short-route',
    originTerminalId: 'missing-terminal',
    coordinates: [[120.9639, 14.8234]],
  };

  const result = validateSeedData({
    terminals,
    routes: [malformedRoute],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    'Unknown origin terminal: missing-terminal',
    'Route jeepney__missing-terminal__short-route must have at least two coordinates',
  ]);
});
