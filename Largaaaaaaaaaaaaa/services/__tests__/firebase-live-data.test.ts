import assert from 'node:assert/strict';
import test from 'node:test';

import type { ActiveTripState } from '@/services/contracts/live-data';
import {
  buildActiveTripPayload,
  resolveEndedTripDriverSelection,
} from '@/services/live-data/trip-lifecycle';

test('buildActiveTripPayload persists the selected inventory location ids with the active trip record', () => {
  const payload = buildActiveTripPayload('driver-1', {
    id: 'sta-maria-bayan-halang',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'halang-terminal',
  }, '2026-06-12T12:00:00.000Z', {
    originLocationId: 'new-santa-maria-jeepney-terminal',
    destinationLocationId: 'halang-and-santa-maria-to-pandi-angat-baliuag-jeepney-terminal',
  });

  assert.deepEqual(payload, {
    driverId: 'driver-1',
    routeId: 'sta-maria-bayan-halang',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'halang-terminal',
    originLocationId: 'new-santa-maria-jeepney-terminal',
    destinationLocationId: 'halang-and-santa-maria-to-pandi-angat-baliuag-jeepney-terminal',
    routeProgressSegmentIndex: null,
    status: 'active',
    startedAt: '2026-06-12T12:00:00.000Z',
    updatedAt: '2026-06-12T12:00:00.000Z',
  });
});

test('resolveEndedTripDriverSelection rebuilds the reverse selection from persisted trip data after a refresh', () => {
  const selection = resolveEndedTripDriverSelection(null, {
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'halang-terminal',
    originLocationId: 'new-santa-maria-jeepney-terminal',
    destinationLocationId: 'halang-and-santa-maria-to-pandi-angat-baliuag-jeepney-terminal',
  });

  assert.deepEqual(selection, {
    originTerminalId: 'halang-terminal',
    destinationTerminalId: 'sta-maria-bayan',
    originLocationId: 'halang-and-santa-maria-to-pandi-angat-baliuag-jeepney-terminal',
    destinationLocationId: 'new-santa-maria-jeepney-terminal',
    resolvedRouteId: null,
    resolvedRouteLabel: null,
  });
});

test('resolveEndedTripDriverSelection prefers the live active trip data when it is still available', () => {
  const currentActiveTrip: ActiveTripState = {
    id: 'driver-1',
    routeId: 'sta-maria-bayan-halang',
    routeLabel: 'Sta. Maria Bayan - Halang',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'halang-terminal',
    originLocationId: 'live-origin-location',
    destinationLocationId: 'live-destination-location',
    vehicleId: 'driver-1',
    startedAt: '2026-06-12T11:30:00.000Z',
    lastLocationRecordedAt: '2026-06-12T11:45:00.000Z',
    locationStatus: 'live',
    routeProgressSegmentIndex: null,
  };

  const selection = resolveEndedTripDriverSelection(currentActiveTrip, {
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'halang-terminal',
    originLocationId: 'persisted-origin-location',
    destinationLocationId: 'persisted-destination-location',
  });

  assert.deepEqual(selection, {
    originTerminalId: 'halang-terminal',
    destinationTerminalId: 'sta-maria-bayan',
    originLocationId: 'live-destination-location',
    destinationLocationId: 'live-origin-location',
    resolvedRouteId: null,
    resolvedRouteLabel: null,
  });
});
