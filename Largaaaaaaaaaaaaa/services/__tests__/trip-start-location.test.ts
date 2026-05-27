import assert from 'node:assert/strict';
import test from 'node:test';

import type { RouteRecord } from '@/lib/domain/transport';
import { resolveTripStartLocation } from '@/services/live-data/trip-start-location';

const SAN_JOSE_ROUTE: RouteRecord = {
  id: 'san-jose-sta-maria-bayan',
  label: 'San Jose - Sta. Maria Bayan',
  originTerminalId: 'san-jose-terminal',
  destinationTerminalId: 'sta-maria-bayan',
  vehicleType: 'jeep',
  isActive: true,
  coordinates: [
    [121.055054, 14.854016],
    [121.054586, 14.853610],
    [121.054318, 14.853274],
  ],
};

test('resolveTripStartLocation keeps the live startup coordinate even when GPS accuracy is poor', () => {
  const resolved = resolveTripStartLocation(SAN_JOSE_ROUTE, '2026-05-25T08:00:00.000Z', {
    longitude: 120.9917433,
    latitude: 14.82541,
    heading: 0,
    speed: 0,
    accuracy: 100,
    recordedAt: '2026-05-25T08:00:00.000Z',
  });

  assert.deepEqual(resolved.coordinate, [120.9917433, 14.82541]);
  assert.equal(resolved.usesLiveLocation, true);
});

test('resolveTripStartLocation accepts a nearby startup GPS fix when it is accurate and near the route corridor', () => {
  const resolved = resolveTripStartLocation(SAN_JOSE_ROUTE, '2026-05-25T08:00:00.000Z', {
    longitude: 121.055060,
    latitude: 14.854010,
    heading: 90,
    speed: 2,
    accuracy: 8,
    recordedAt: '2026-05-25T08:00:00.000Z',
  });

  assert.deepEqual(resolved.coordinate, [121.055060, 14.854010]);
  assert.equal(resolved.usesLiveLocation, true);
});
