import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVehicleLocationSubscriptionPlan,
  MAX_VEHICLE_LOCATION_ROUTE_IDS_PER_QUERY,
} from '@/services/live-data/vehicle-location-subscriptions';

test('buildVehicleLocationSubscriptionPlan omits the own vehicle subscription when no active trip exists', () => {
  const plan = buildVehicleLocationSubscriptionPlan({
    activeVehicleId: null,
    commuterNearbyRouteIds: [],
  });

  assert.deepEqual(plan, {
    ownVehicleDocId: null,
    routeQueryChunks: [],
    subscriptionKey: 'no-active-vehicle|',
  });
});

test('buildVehicleLocationSubscriptionPlan deduplicates and sorts commuter route ids', () => {
  const plan = buildVehicleLocationSubscriptionPlan({
    activeVehicleId: 'driver-1',
    commuterNearbyRouteIds: [
      'sta-maria-bayan-halang',
      'san-jose-sta-maria-bayan',
      'sta-maria-bayan-halang',
      '  halang-sta-maria-bayan  ',
    ],
  });

  assert.deepEqual(plan, {
    ownVehicleDocId: 'driver-1',
    routeQueryChunks: [[
      'halang-sta-maria-bayan',
      'san-jose-sta-maria-bayan',
      'sta-maria-bayan-halang',
    ]],
    subscriptionKey: 'driver-1|halang-sta-maria-bayan,san-jose-sta-maria-bayan,sta-maria-bayan-halang',
  });
});

test('buildVehicleLocationSubscriptionPlan chunks route ids to the Firestore in-query limit', () => {
  const commuterNearbyRouteIds = Array.from(
    { length: MAX_VEHICLE_LOCATION_ROUTE_IDS_PER_QUERY + 2 },
    (_, index) => `route-${index.toString().padStart(2, '0')}`,
  );

  const plan = buildVehicleLocationSubscriptionPlan({
    activeVehicleId: 'driver-2',
    commuterNearbyRouteIds,
  });

  assert.equal(plan.routeQueryChunks.length, 2);
  assert.deepEqual(plan.routeQueryChunks[0], commuterNearbyRouteIds.slice(0, MAX_VEHICLE_LOCATION_ROUTE_IDS_PER_QUERY));
  assert.deepEqual(plan.routeQueryChunks[1], commuterNearbyRouteIds.slice(MAX_VEHICLE_LOCATION_ROUTE_IDS_PER_QUERY));
});
