import assert from 'node:assert/strict';
import test from 'node:test';

import { getCoordinateDistanceMeters } from '@/lib/domain/route-geometry';
import { TERMINAL_SEED } from '@/lib/seed/transport-catalog';
import {
  ENDPOINT_READY_TRANSPORT_LOCATION_SEED,
  ENDPOINT_READY_TERMINAL_IDS,
  REFERENCE_ROUTE_POINT_SEED,
  ROUTE_TRUTH_TERMINAL_LOCATION_IDS,
  SELECTABLE_TERMINAL_IDS,
  STA_MARIA_PROXIMITY_ANCHOR,
  TRANSPORT_LOCATION_INVENTORY_SEED,
  filterEndpointReadyTerminalOptions,
  filterSelectableTerminalOptions,
  getMaxTerminalEndpointAlignmentDistanceMeters,
  getSelectableInventoryLocationsForTerminalIds,
  getRouteTruthTerminalCoordinate,
  getRouteTruthTerminalMarkerCoordinate,
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
  assert.equal(SELECTABLE_TERMINAL_IDS.has('norzagaray-terminal'), true);
  assert.equal(SELECTABLE_TERMINAL_IDS.has('san-jose-terminal'), true);
  assert.equal(isSelectableTerminalId('halang-terminal'), true);
  assert.equal(isSelectableTerminalId('sta-maria-bayan'), true);
  assert.equal(isSelectableTerminalId('norzagaray-terminal'), true);
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

test('route-truth terminals resolve their shared coordinates from the inventory source', () => {
  TERMINAL_SEED.forEach((terminal) => {
    const mappedLocationId = ROUTE_TRUTH_TERMINAL_LOCATION_IDS[terminal.id as keyof typeof ROUTE_TRUTH_TERMINAL_LOCATION_IDS];

    assert.ok(mappedLocationId, `Expected ${terminal.id} to map to an inventory location`);
    assert.deepEqual(terminal.coordinate, getRouteTruthTerminalMarkerCoordinate(terminal.id));
  });
});

test('route-truth terminal endpoints stay aligned with their displayed marker coordinates', () => {
  TERMINAL_SEED.forEach((terminal) => {
    const endpointCoordinate = getRouteTruthTerminalCoordinate(terminal.id);
    const markerCoordinate = getRouteTruthTerminalMarkerCoordinate(terminal.id);

    assert.equal(
      getCoordinateDistanceMeters(endpointCoordinate, markerCoordinate)
        <= getMaxTerminalEndpointAlignmentDistanceMeters(terminal.id),
      true,
      `Expected ${terminal.id} endpoint and marker to stay within the terminal alignment tolerance`,
    );
  });
});

test('selectable inventory prefers canonical route-truth terminal entries over operational evidence aliases', () => {
  const selectableLocations = getSelectableInventoryLocationsForTerminalIds(
    new Set(['sta-maria-bayan', 'norzagaray-terminal', 'san-jose-terminal']),
  );

  assert.equal(selectableLocations.some((location) => location.id === 'sta-maria-bayan'), true);
  assert.equal(selectableLocations.some((location) => location.id === 'norzagaray-terminal'), true);
  assert.equal(selectableLocations.some((location) => location.id === 'del-carmen-bus-terminal'), false);
  assert.equal(selectableLocations.some((location) => location.id === 'new-santa-maria-jeepney-terminal'), false);
  assert.equal(selectableLocations.some((location) => location.id === 'san-jose-terminal'), true);
  assert.equal(selectableLocations.some((location) => location.id === 'muzon-sta-maria-jeepney-terminal'), true);
});
