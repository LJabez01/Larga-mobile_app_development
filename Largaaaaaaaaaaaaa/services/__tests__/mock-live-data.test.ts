import test from 'node:test';
import assert from 'node:assert/strict';

import { mockLiveDataStore } from '@/services/live-data/mock-store';

test('mock live data starts a trip for the selected route and exposes one vehicle', () => {
  mockLiveDataStore.reset();
  mockLiveDataStore.selectDriverTerminals('sta-maria-bayan', 'halang-terminal');
  const nextSnapshot = mockLiveDataStore.startTrip();

  assert.equal(nextSnapshot.activeTrip?.routeId, 'sta-maria-bayan-halang');
  assert.equal(nextSnapshot.vehicles.length, 1);
  assert.equal(nextSnapshot.vehicles[0]?.routeId, 'sta-maria-bayan-halang');
});

test('mock live data reset clears active trip state', () => {
  mockLiveDataStore.selectDriverTerminals('sta-maria-bayan', 'norzagaray-terminal');
  mockLiveDataStore.startTrip();

  const resetSnapshot = mockLiveDataStore.reset();

  assert.equal(resetSnapshot.activeTrip, null);
  assert.equal(resetSnapshot.vehicles.length, 0);
  assert.equal(resetSnapshot.driverSelection.resolvedRouteId, null);
});

test('mock live data publishes a new coordinate for the active vehicle', () => {
  mockLiveDataStore.reset();
  mockLiveDataStore.selectDriverTerminals('sta-maria-bayan', 'san-jose-terminal');
  mockLiveDataStore.startTrip();

  const nextSnapshot = mockLiveDataStore.publishDriverLocation({
    routeId: 'sta-maria-bayan-san-jose',
    latitude: 14.8611,
    longitude: 121.0021,
    heading: 90,
    speed: 22,
    accuracy: 8,
  });

  assert.deepEqual(nextSnapshot.vehicles[0]?.coordinate, [121.0021, 14.8611]);
});
