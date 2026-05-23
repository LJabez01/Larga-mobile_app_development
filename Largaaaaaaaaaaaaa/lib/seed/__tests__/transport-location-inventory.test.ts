import assert from 'node:assert/strict';
import test from 'node:test';

import { TERMINAL_SEED } from '@/lib/seed/transport-catalog';
import {
  ENDPOINT_READY_TRANSPORT_LOCATION_SEED,
  ENDPOINT_READY_TERMINAL_IDS,
  REFERENCE_ROUTE_POINT_SEED,
  SELECTABLE_TERMINAL_IDS,
  STA_MARIA_PROXIMITY_ANCHOR,
  TRANSPORT_LOCATION_INVENTORY_SEED,
  filterEndpointReadyTerminalOptions,
  filterSelectableTerminalOptions,
  isEndpointReadyTerminalId,
  isSelectableTerminalId,
} from '@/lib/seed/transport-location-inventory';

test('transport location inventory uses unique ids', () => {
  const ids = TRANSPORT_LOCATION_INVENTORY_SEED.map((location) => location.id);

  assert.equal(new Set(ids).size, ids.length);
});

test('endpoint-ready transport locations are operational terminals', () => {
  ENDPOINT_READY_TRANSPORT_LOCATION_SEED.forEach((location) => {
    assert.equal(location.classification, 'operational-terminal');
    assert.equal(location.approximateCoordinate !== null, true);
  });
});

test('reference route points are never endpoint-ready', () => {
  REFERENCE_ROUTE_POINT_SEED.forEach((location) => {
    assert.equal(location.endpointReady, false);
  });
});

test('linked terminal ids point to known operational route-truth terminals', () => {
  const terminalIds = new Set(TERMINAL_SEED.map((terminal) => terminal.id));

  TRANSPORT_LOCATION_INVENTORY_SEED.forEach((location) => {
    if (!location.linkedTerminalId) {
      return;
    }

    assert.equal(terminalIds.has(location.linkedTerminalId), true);
  });
});

test('all operational terminal candidates resolve through a known working terminal', () => {
  const terminalIds = new Set(TERMINAL_SEED.map((terminal) => terminal.id));
  const candidateLocations = TRANSPORT_LOCATION_INVENTORY_SEED.filter(
    (location) => location.classification === 'operational-terminal-candidate',
  );

  candidateLocations.forEach((location) => {
    assert.notEqual(location.linkedTerminalId, null);
    assert.equal(terminalIds.has(location.linkedTerminalId as string), true);
  });
});

test('endpoint-ready inventory resolves the currently trusted terminal ids', () => {
  assert.equal(isEndpointReadyTerminalId('sta-maria-bayan'), true);
  assert.equal(isEndpointReadyTerminalId('norzagaray-terminal'), true);
  assert.equal(isEndpointReadyTerminalId('halang-terminal'), true);
  assert.equal(ENDPOINT_READY_TERMINAL_IDS.has('san-jose-terminal'), true);
  assert.equal(isEndpointReadyTerminalId('san-jose-terminal'), true);
});

test('terminal filtering keeps only endpoint-ready operational terminals', () => {
  const filteredTerminals = filterEndpointReadyTerminalOptions(TERMINAL_SEED);

  assert.deepEqual(
    filteredTerminals.map((terminal) => terminal.id),
    ['sta-maria-bayan', 'norzagaray-terminal', 'halang-terminal', 'san-jose-terminal'],
  );
});

test('selectable inventory resolves candidate-backed route terminals', () => {
  assert.equal(SELECTABLE_TERMINAL_IDS.has('halang-terminal'), true);
  assert.equal(SELECTABLE_TERMINAL_IDS.has('sta-maria-bayan'), true);
  assert.equal(SELECTABLE_TERMINAL_IDS.has('san-jose-terminal'), true);
  assert.equal(isSelectableTerminalId('halang-terminal'), true);
  assert.equal(isSelectableTerminalId('sta-maria-bayan'), true);
  assert.equal(isSelectableTerminalId('san-jose-terminal'), true);
});

test('selectable terminal filtering includes candidate-backed route terminals', () => {
  const filteredTerminals = filterSelectableTerminalOptions(TERMINAL_SEED);

  assert.deepEqual(
    filteredTerminals.map((terminal) => terminal.id),
    ['sta-maria-bayan', 'norzagaray-terminal', 'halang-terminal', 'san-jose-terminal'],
  );
});

test('sta maria proximity anchor remains a valid coordinate tuple', () => {
  assert.equal(STA_MARIA_PROXIMITY_ANCHOR.length, 2);
  assert.equal(Number.isFinite(STA_MARIA_PROXIMITY_ANCHOR[0]), true);
  assert.equal(Number.isFinite(STA_MARIA_PROXIMITY_ANCHOR[1]), true);
});
