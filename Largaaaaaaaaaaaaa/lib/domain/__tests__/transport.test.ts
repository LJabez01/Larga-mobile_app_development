import assert from 'node:assert/strict';
import test from 'node:test';

import { createEmptyDriverSelection, getSelectableTerminalIds, resolveRouteForTerminals } from '@/lib/domain/transport';
import { ROUTE_SEED } from '@/lib/seed/transport-catalog';

test('createEmptyDriverSelection starts with no terminal pair', () => {
  assert.deepEqual(createEmptyDriverSelection(), {
    originTerminalId: null,
    destinationTerminalId: null,
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
