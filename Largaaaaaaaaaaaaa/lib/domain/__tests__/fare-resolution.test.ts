import assert from 'node:assert/strict';
import test from 'node:test';

import { MVP_DISCOUNT_POLICY, applyDiscount, computeBaseFare } from '@/lib/domain/fare';
import { resolveRouteFare } from '@/lib/domain/fare-resolution';
import * as transportFareSeed from '@/lib/seed/transport-fare';

test('ready resolution works for a jeep route', () => {
  const routeId = 'sta-maria-bayan-norzagaray';
  const routeFareStops = transportFareSeed.getRouteFareStopsByRouteId(routeId);
  const tariffRule = transportFareSeed.getTariffRuleByVehicleType('jeep');

  assert.ok(routeFareStops, `Expected fare stops for ${routeId}`);
  assert.ok(tariffRule, 'Expected jeep tariff rule');

  const originStop = routeFareStops[0];
  const destinationStop = routeFareStops[2];
  const expectedDistanceKm = Number(
    Math.abs(destinationStop.cumulativeDistanceKm - originStop.cumulativeDistanceKm).toFixed(6),
  );
  const expectedBreakdown = computeBaseFare(expectedDistanceKm, tariffRule);

  assert.deepEqual(
    resolveRouteFare({
      routeId,
      vehicleType: 'jeep',
      fareOriginLocationId: originStop.locationId,
      fareDestinationLocationId: destinationStop.locationId,
    }),
    {
      status: 'ready',
      routeId,
      vehicleType: 'jeep',
      tariffClass: 'traditional_jeep',
      fareOriginLocationId: originStop.locationId,
      fareDestinationLocationId: destinationStop.locationId,
      baseFare: expectedBreakdown.baseFare,
      discountedFare: applyDiscount(expectedBreakdown.baseFare, MVP_DISCOUNT_POLICY),
      breakdown: expectedBreakdown,
    },
  );
});

test('ready resolution works for a bus route', () => {
  const routeId = 'sta-maria-bayan-san-jose';
  const routeFareStops = transportFareSeed.getRouteFareStopsByRouteId(routeId);
  const tariffRule = transportFareSeed.getTariffRuleByVehicleType('bus');

  assert.ok(routeFareStops, `Expected fare stops for ${routeId}`);
  assert.ok(tariffRule, 'Expected bus tariff rule');

  const originStop = routeFareStops[0];
  const destinationStop = routeFareStops[2];
  const expectedDistanceKm = Number(
    Math.abs(destinationStop.cumulativeDistanceKm - originStop.cumulativeDistanceKm).toFixed(6),
  );
  const expectedBreakdown = computeBaseFare(expectedDistanceKm, tariffRule);

  assert.deepEqual(
    resolveRouteFare({
      routeId,
      vehicleType: 'bus',
      fareOriginLocationId: originStop.locationId,
      fareDestinationLocationId: destinationStop.locationId,
    }),
    {
      status: 'ready',
      routeId,
      vehicleType: 'bus',
      tariffClass: 'aircon_bus',
      fareOriginLocationId: originStop.locationId,
      fareDestinationLocationId: destinationStop.locationId,
      baseFare: expectedBreakdown.baseFare,
      discountedFare: applyDiscount(expectedBreakdown.baseFare, MVP_DISCOUNT_POLICY),
      breakdown: expectedBreakdown,
    },
  );
});

test('missing origin returns missing_origin', () => {
  assert.equal(
    resolveRouteFare({
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'jeep',
      fareOriginLocationId: null,
      fareDestinationLocationId: 'amber-homes-route-point',
    }).status,
    'missing_origin',
  );
});

test('missing destination returns missing_destination', () => {
  assert.equal(
    resolveRouteFare({
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'jeep',
      fareOriginLocationId: 'sta-maria-bayan',
      fareDestinationLocationId: null,
    }).status,
    'missing_destination',
  );
});

test('same origin and destination returns same_origin_destination', () => {
  assert.equal(
    resolveRouteFare({
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'jeep',
      fareOriginLocationId: 'amber-homes-route-point',
      fareDestinationLocationId: 'amber-homes-route-point',
    }).status,
    'same_origin_destination',
  );
});

test('destination before origin returns destination_before_origin on a directional route', () => {
  assert.deepEqual(
    resolveRouteFare({
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'jeep',
      fareOriginLocationId: 'amber-homes-route-point',
      fareDestinationLocationId: 'waltermart-sta-maria-sta-clara-route-point',
    }),
    {
      status: 'destination_before_origin',
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'jeep',
      tariffClass: 'traditional_jeep',
      fareOriginLocationId: 'amber-homes-route-point',
      fareDestinationLocationId: 'waltermart-sta-maria-sta-clara-route-point',
      baseFare: null,
      discountedFare: null,
      breakdown: null,
    },
  );
});

test('origin not on route returns origin_not_on_route', () => {
  assert.equal(
    resolveRouteFare({
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'jeep',
      fareOriginLocationId: 'halang-terminal',
      fareDestinationLocationId: 'amber-homes-route-point',
    }).status,
    'origin_not_on_route',
  );
});

test('destination not on route returns destination_not_on_route', () => {
  assert.equal(
    resolveRouteFare({
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'jeep',
      fareOriginLocationId: 'sta-maria-bayan',
      fareDestinationLocationId: 'halang-terminal',
    }).status,
    'destination_not_on_route',
  );
});

test('route not fare enabled returns route_not_fare_enabled', () => {
  assert.equal(
    resolveRouteFare({
      routeId: 'missing-route',
      vehicleType: 'bus',
      fareOriginLocationId: 'sta-maria-bayan',
      fareDestinationLocationId: 'san-jose-terminal',
    }).status,
    'route_not_fare_enabled',
  );
});

test('tariff not configured returns tariff_not_configured', () => {
  assert.deepEqual(
    resolveRouteFare({
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'jeep',
      fareOriginLocationId: 'sta-maria-bayan',
      fareDestinationLocationId: 'amber-homes-route-point',
    }, {
      getTariffRuleByTariffClass: () => null,
    }),
    {
      status: 'tariff_not_configured',
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'jeep',
      tariffClass: 'traditional_jeep',
      fareOriginLocationId: 'sta-maria-bayan',
      fareDestinationLocationId: 'amber-homes-route-point',
      baseFare: null,
      discountedFare: null,
      breakdown: null,
    },
  );
});

test('discounted fare is derived from the ready base fare', () => {
  const resolution = resolveRouteFare({
    routeId: 'sta-maria-bayan-san-jose',
    vehicleType: 'bus',
    fareOriginLocationId: 'sta-maria-bayan',
    fareDestinationLocationId: 'san-jose-terminal',
  });

  assert.equal(resolution.status, 'ready');
  assert.ok(resolution.baseFare !== null);
  assert.equal(
    resolution.discountedFare,
    applyDiscount(resolution.baseFare, MVP_DISCOUNT_POLICY),
  );
});

test('invalid runtime vehicle type returns invalid_vehicle_type without leaking tariffClass', () => {
  assert.deepEqual(
    resolveRouteFare({
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'tricycle' as 'jeep',
      fareOriginLocationId: 'sta-maria-bayan',
      fareDestinationLocationId: 'amber-homes-route-point',
    }),
    {
      status: 'invalid_vehicle_type',
      routeId: 'sta-maria-bayan-norzagaray',
      vehicleType: 'tricycle' as 'jeep',
      tariffClass: null,
      fareOriginLocationId: 'sta-maria-bayan',
      fareDestinationLocationId: 'amber-homes-route-point',
      baseFare: null,
      discountedFare: null,
      breakdown: null,
    },
  );
});
