import assert from 'node:assert/strict';
import test from 'node:test';

import type { CommuterVisibleVehicle } from '@/lib/domain/commuter-visibility';
import {
  createEmptyCommuterRideSelection,
  reconcileCommuterRideSelection,
  resolveSelectedCommuterRideVehicle,
  selectCommuterRideVehicle,
  setCommuterRideFareDestination,
} from '@/services/live-data/commuter-ride-selection';

function buildVisibleVehicle(
  input: Partial<CommuterVisibleVehicle> = {},
): CommuterVisibleVehicle {
  return {
    id: 'vehicle-1',
    type: 'jeep',
    coordinate: [120.9805, 14.8232],
    routeId: 'sta-maria-bayan-norzagaray',
    routeLabel: 'Sta. Maria Bayan - Norzagaray',
    recordedAt: '2026-06-12T12:00:00.000Z',
    speedKph: 18,
    distanceMeters: 1450,
    etaMinutes: 5,
    ...input,
  };
}

test('reconcileCommuterRideSelection stays empty when no vehicle is selected yet', () => {
  const selection = reconcileCommuterRideSelection(
    createEmptyCommuterRideSelection(),
    [
      buildVisibleVehicle({ id: 'vehicle-1' }),
      buildVisibleVehicle({ id: 'vehicle-2', routeId: 'sta-maria-bayan-san-jose' }),
    ],
  );

  assert.deepEqual(selection, {
    selectedVehicleId: null,
    fareOriginLocationId: null,
    fareDestinationLocationId: null,
  });
});

test('resolveSelectedCommuterRideVehicle keeps the explicitly selected vehicle when it is still visible', () => {
  const selectedVehicle = resolveSelectedCommuterRideVehicle([
    buildVisibleVehicle({ id: 'vehicle-1' }),
    buildVisibleVehicle({ id: 'vehicle-2', type: 'bus', routeId: 'sta-maria-bayan-san-jose' }),
  ], 'vehicle-2');

  assert.equal(selectedVehicle?.id, 'vehicle-2');
});

test('resolveSelectedCommuterRideVehicle falls back to the first visible vehicle when the previous selection disappears', () => {
  const selectedVehicle = resolveSelectedCommuterRideVehicle([
    buildVisibleVehicle({ id: 'vehicle-1' }),
    buildVisibleVehicle({ id: 'vehicle-2', routeId: 'sta-maria-bayan-san-jose' }),
  ], 'missing-vehicle');

  assert.equal(selectedVehicle?.id, 'vehicle-1');
});

test('selectCommuterRideVehicle preserves valid fare endpoints when the new vehicle stays on the same route', () => {
  const selection = selectCommuterRideVehicle({
    selectedVehicleId: 'vehicle-1',
    fareOriginLocationId: 'sta-maria-bayan',
    fareDestinationLocationId: 'amber-homes-route-point',
  }, [
    buildVisibleVehicle({ id: 'vehicle-1', routeId: 'sta-maria-bayan-norzagaray' }),
    buildVisibleVehicle({ id: 'vehicle-2', routeId: 'sta-maria-bayan-norzagaray' }),
  ], 'vehicle-2');

  assert.deepEqual(selection, {
    selectedVehicleId: 'vehicle-2',
    fareOriginLocationId: 'sta-maria-bayan',
    fareDestinationLocationId: 'amber-homes-route-point',
  });
});

test('selectCommuterRideVehicle keeps a still-valid origin and clears only the invalid destination when the route changes', () => {
  const selection = selectCommuterRideVehicle({
    selectedVehicleId: 'vehicle-1',
    fareOriginLocationId: 'sta-maria-bayan',
    fareDestinationLocationId: 'amber-homes-route-point',
  }, [
    buildVisibleVehicle({ id: 'vehicle-1', routeId: 'sta-maria-bayan-norzagaray' }),
    buildVisibleVehicle({ id: 'vehicle-2', type: 'bus', routeId: 'sta-maria-bayan-san-jose' }),
  ], 'vehicle-2');

  assert.deepEqual(selection, {
    selectedVehicleId: 'vehicle-2',
    fareOriginLocationId: 'sta-maria-bayan',
    fareDestinationLocationId: null,
  });
});

test('setCommuterRideFareDestination clears an invalid destination that falls behind the current origin', () => {
  const selection = setCommuterRideFareDestination({
    selectedVehicleId: 'vehicle-1',
    fareOriginLocationId: 'amber-homes-route-point',
    fareDestinationLocationId: null,
  }, [
    buildVisibleVehicle({ id: 'vehicle-1', routeId: 'sta-maria-bayan-norzagaray' }),
  ], 'waltermart-sta-maria-sta-clara-route-point');

  assert.deepEqual(selection, {
    selectedVehicleId: 'vehicle-1',
    fareOriginLocationId: 'amber-homes-route-point',
    fareDestinationLocationId: null,
  });
});
