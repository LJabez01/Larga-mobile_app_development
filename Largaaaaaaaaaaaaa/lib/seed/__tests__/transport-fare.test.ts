import assert from 'node:assert/strict';
import test from 'node:test';

import { findNearestRouteProjection } from '@/lib/domain/transport';
import { ROUTE_SEED } from '@/lib/seed/transport-catalog';
import { getTransportLocationCoordinate } from '@/lib/seed/transport-location-inventory';
import {
  FARE_ENABLED_ROUTE_IDS,
  ROUTE_FARE_STOP_LOCATION_IDS_BY_ROUTE,
  ROUTE_FARE_STOP_PROJECTION_TOLERANCE_METERS,
  getRouteFareStopsByRouteId,
  getTariffRuleByTariffClass,
  getTariffRuleByVehicleType,
} from '@/lib/seed/transport-fare';

type FareEnabledRouteId = keyof typeof ROUTE_FARE_STOP_LOCATION_IDS_BY_ROUTE;

test('tariff rule lookup returns the expected jeep and bus rules', () => {
  assert.deepEqual(
    getTariffRuleByTariffClass('traditional_jeep'),
    {
      tariffClass: 'traditional_jeep',
      minimumFare: 14,
      minimumCoveredDistanceKm: 4,
      succeedingDistanceStepKm: 1,
      succeedingKilometerRate: 2,
      succeedingDistanceRounding: 'ceil_step',
    },
  );
  assert.deepEqual(
    getTariffRuleByTariffClass('aircon_bus'),
    {
      tariffClass: 'aircon_bus',
      minimumFare: 18,
      minimumCoveredDistanceKm: 5,
      succeedingDistanceStepKm: 1,
      succeedingKilometerRate: 2.98,
      succeedingDistanceRounding: 'ceil_step',
    },
  );
  assert.deepEqual(
    getTariffRuleByVehicleType('jeep'),
    getTariffRuleByTariffClass('traditional_jeep'),
  );
  assert.deepEqual(
    getTariffRuleByVehicleType('bus'),
    getTariffRuleByTariffClass('aircon_bus'),
  );
});

test('each fare-enabled route returns ordered fare stops', () => {
  (FARE_ENABLED_ROUTE_IDS as readonly FareEnabledRouteId[]).forEach((routeId) => {
    const routeFareStops = getRouteFareStopsByRouteId(routeId);
    const expectedLocationIds = ROUTE_FARE_STOP_LOCATION_IDS_BY_ROUTE[routeId];

    assert.ok(routeFareStops, `Expected fare stops for ${routeId}`);
    assert.equal(routeFareStops.length, expectedLocationIds.length);
    assert.deepEqual(
      routeFareStops.map((stop) => stop.locationId),
      expectedLocationIds,
    );
    assert.deepEqual(
      routeFareStops.map((stop) => stop.orderIndex),
      expectedLocationIds.map((_: string, index: number) => index),
    );
    assert.equal(routeFareStops.every((stop) => stop.routeId === routeId), true);
  });
});

test('cumulative distances are strictly increasing per route', () => {
  (FARE_ENABLED_ROUTE_IDS as readonly FareEnabledRouteId[]).forEach((routeId) => {
    const routeFareStops = getRouteFareStopsByRouteId(routeId);

    assert.ok(routeFareStops, `Expected fare stops for ${routeId}`);

    for (let index = 1; index < routeFareStops.length; index += 1) {
      assert.ok(
        routeFareStops[index].cumulativeDistanceKm > routeFareStops[index - 1].cumulativeDistanceKm,
        `Expected ${routeId} stop ${routeFareStops[index].locationId} to stay after ${routeFareStops[index - 1].locationId}`,
      );
    }
  });
});

test('representative seeded cumulative distances stay fixed for key fare stops', () => {
  assert.deepEqual(
    getRouteFareStopsByRouteId('sta-maria-bayan-norzagaray')?.map((stop) => ({
      locationId: stop.locationId,
      cumulativeDistanceKm: stop.cumulativeDistanceKm,
    })),
    [
      { locationId: 'sta-maria-bayan', cumulativeDistanceKm: 0 },
      { locationId: 'waltermart-sta-maria-sta-clara-route-point', cumulativeDistanceKm: 1.388918 },
      { locationId: 'amber-homes-route-point', cumulativeDistanceKm: 2.901277 },
      { locationId: 'norzagaray-terminal', cumulativeDistanceKm: 11.150608 },
    ],
  );

  assert.deepEqual(
    getRouteFareStopsByRouteId('sta-maria-bayan-san-jose')?.map((stop) => ({
      locationId: stop.locationId,
      cumulativeDistanceKm: stop.cumulativeDistanceKm,
    })),
    [
      { locationId: 'sta-maria-bayan', cumulativeDistanceKm: 0 },
      { locationId: 'burgundy-homes-route-point', cumulativeDistanceKm: 2.385623 },
      { locationId: 'san-jose-terminal', cumulativeDistanceKm: 12.235438 },
    ],
  );

  assert.deepEqual(
    getRouteFareStopsByRouteId('sta-maria-bayan-halang')?.map((stop) => ({
      locationId: stop.locationId,
      cumulativeDistanceKm: stop.cumulativeDistanceKm,
    })),
    [
      { locationId: 'sta-maria-bayan', cumulativeDistanceKm: 0 },
      { locationId: 'halang-terminal', cumulativeDistanceKm: 10.234869 },
    ],
  );
});

test('seeded fare stops stay within the configured projection tolerance', () => {
  (FARE_ENABLED_ROUTE_IDS as readonly FareEnabledRouteId[]).forEach((routeId) => {
    const route = ROUTE_SEED.find((item) => item.id === routeId);
    const routeFareStops = getRouteFareStopsByRouteId(routeId);

    assert.ok(route, `Expected route ${routeId} to exist`);
    assert.ok(routeFareStops, `Expected fare stops for ${routeId}`);

    routeFareStops.forEach((stop) => {
      const locationCoordinate = getTransportLocationCoordinate(stop.locationId);
      const projection = findNearestRouteProjection(route.coordinates, locationCoordinate);

      assert.ok(projection, `Expected ${stop.locationId} to project onto ${routeId}`);
      assert.ok(
        projection.distanceMeters <= ROUTE_FARE_STOP_PROJECTION_TOLERANCE_METERS,
        `Expected ${stop.locationId} on ${routeId} to stay within ${ROUTE_FARE_STOP_PROJECTION_TOLERANCE_METERS}m but saw ${projection.distanceMeters.toFixed(2)}m`,
      );
    });
  });
});
