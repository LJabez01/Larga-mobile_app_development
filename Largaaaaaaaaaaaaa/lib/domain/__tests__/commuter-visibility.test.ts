import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCommuterPresenceRecord,
  buildCommuterVisibleVehicles,
  buildDriverVisibleCommuters,
  findNearbyRoutesForCommuter,
  isCommuterPresenceFresh,
  type VehicleVisibilityInput,
} from '@/lib/domain/commuter-visibility';
import type { RouteRecord } from '@/lib/domain/transport';

const nowIso = '2026-05-20T12:00:00.000Z';
const nowMs = Date.parse(nowIso);

const mainRoute: RouteRecord = {
  id: 'main-route',
  label: 'Main Route',
  originTerminalId: 'origin',
  destinationTerminalId: 'destination',
  vehicleType: 'jeep',
  coordinates: [
    [120.000000, 14.000000],
    [120.010000, 14.000000],
    [120.020000, 14.000000],
    [120.030000, 14.000000],
  ],
  reconnectAccessCoordinates: null,
  isActive: true,
};

const branchRoute: RouteRecord = {
  ...mainRoute,
  id: 'branch-route',
  label: 'Branch Route',
  coordinates: [
    [120.000000, 14.000000],
    [120.010000, 14.000000],
    [120.020000, 14.004000],
    [120.030000, 14.008000],
  ],
};

const farRoute: RouteRecord = {
  ...mainRoute,
  id: 'far-route',
  label: 'Far Route',
  coordinates: [
    [120.000000, 14.020000],
    [120.010000, 14.020000],
    [120.020000, 14.020000],
  ],
};

// Vehicle Fixture Builder - creates route-visible vehicle inputs with focused test overrides.
function buildVehicle(input: Partial<VehicleVisibilityInput> = {}): VehicleVisibilityInput {
  return {
    id: 'vehicle-1',
    type: 'jeep',
    coordinate: [120.005000, 14.000000],
    routeId: mainRoute.id,
    routeLabel: mainRoute.label,
    recordedAt: nowIso,
    speedKph: 20,
    ...input,
  };
}

test('findNearbyRoutesForCommuter returns active route paths near the commuter point', () => {
  const nearbyRoutes = findNearbyRoutesForCommuter(
    [mainRoute, branchRoute, farRoute],
    [120.010000, 14.000300],
  );

  assert.deepEqual(
    nearbyRoutes.map((route) => route.id),
    ['main-route', 'branch-route'],
  );
});

test('buildCommuterPresenceRecord stores nearby route ids without profile details', () => {
  const presence = buildCommuterPresenceRecord({
    commuterId: 'commuter-1',
    coordinate: [120.010000, 14.000300],
    referenceSource: 'gps',
    routes: [mainRoute, farRoute],
    recordedAt: nowIso,
  });

  assert.deepEqual(presence, {
    id: 'commuter-1',
    coordinate: [120.010000, 14.000300],
    status: 'waiting',
    referenceSource: 'gps',
    nearbyRouteIds: ['main-route'],
    recordedAt: nowIso,
    updatedAt: nowIso,
  });
});

test('buildCommuterVisibleVehicles returns vehicles that can still pass the commuter', () => {
  const visibleVehicles = buildCommuterVisibleVehicles({
    routes: [mainRoute],
    vehicles: [
      buildVehicle({
        id: 'approaching',
        coordinate: [120.005000, 14.000000],
      }),
      buildVehicle({
        id: 'already-passed',
        coordinate: [120.025000, 14.000000],
      }),
    ],
    commuterCoordinate: [120.015000, 14.000000],
    now: nowMs,
  });

  assert.deepEqual(
    visibleVehicles.map((vehicle) => vehicle.id),
    ['approaching'],
  );
  assert.equal((visibleVehicles[0].etaMinutes ?? 0) > 0, true);
  assert.equal(visibleVehicles[0].distanceMeters > 0, true);
});

test('buildCommuterVisibleVehicles hides stale vehicles and leaves ETA unavailable when speed is missing', () => {
  const visibleVehicles = buildCommuterVisibleVehicles({
    routes: [mainRoute],
    vehicles: [
      buildVehicle({
        id: 'stale',
        recordedAt: '2026-05-20T11:56:00.000Z',
      }),
      buildVehicle({
        id: 'missing-speed',
        speedKph: null,
      }),
    ],
    commuterCoordinate: [120.015000, 14.000000],
    now: nowMs,
  });

  assert.deepEqual(
    visibleVehicles.map((vehicle) => vehicle.id),
    ['missing-speed'],
  );
  assert.equal(visibleVehicles[0].etaMinutes, null);
});

test('buildCommuterVisibleVehicles uses the commuter presence route ids as the visibility scope', () => {
  const visibleVehicles = buildCommuterVisibleVehicles({
    routes: [mainRoute, branchRoute],
    vehicles: [
      buildVehicle({ id: 'main', routeId: mainRoute.id, routeLabel: mainRoute.label }),
      buildVehicle({ id: 'branch', routeId: branchRoute.id, routeLabel: branchRoute.label }),
    ],
    commuterCoordinate: [120.010000, 14.000000],
    routeIds: [branchRoute.id],
    now: nowMs,
  });

  assert.deepEqual(
    visibleVehicles.map((vehicle) => vehicle.id),
    ['branch'],
  );
});

test('buildDriverVisibleCommuters exposes only fresh waiting commuters ahead on the active route', () => {
  const commuters = [
    buildCommuterPresenceRecord({
      commuterId: 'ahead',
      coordinate: [120.020000, 14.000000],
      referenceSource: 'gps',
      routes: [mainRoute],
      recordedAt: nowIso,
    }),
    buildCommuterPresenceRecord({
      commuterId: 'behind',
      coordinate: [120.002000, 14.000000],
      referenceSource: 'gps',
      routes: [mainRoute],
      recordedAt: nowIso,
    }),
    {
      ...buildCommuterPresenceRecord({
        commuterId: 'stale',
        coordinate: [120.025000, 14.000000],
        referenceSource: 'manual',
        routes: [mainRoute],
        recordedAt: '2026-05-20T11:56:00.000Z',
      }),
    },
  ];

  const visibleCommuters = buildDriverVisibleCommuters({
    route: mainRoute,
    commuters,
    routeProgressSegmentIndex: 1,
    now: nowMs,
  });

  assert.deepEqual(
    visibleCommuters.map((commuter) => commuter.id),
    ['ahead'],
  );
});

test('isCommuterPresenceFresh accepts current waiting points and rejects old or malformed timestamps', () => {
  assert.equal(isCommuterPresenceFresh('2026-05-20T11:59:00.000Z', nowMs), true);
  assert.equal(isCommuterPresenceFresh('2026-05-20T11:55:00.000Z', nowMs), false);
  assert.equal(isCommuterPresenceFresh('not-a-date', nowMs), false);
});
