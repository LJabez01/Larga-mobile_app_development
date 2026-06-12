import assert from 'node:assert/strict';
import test from 'node:test';

import type { VehicleType } from '@/lib/domain/transport';
import {
  APP_VEHICLE_TARIFF_CLASS,
  MVP_DISCOUNT_POLICY,
  applyDiscount,
  computeBaseFare,
  resolveDisplayedFareAmount,
  resolveFareTariffClass,
  type FareTariffRule,
} from '@/lib/domain/fare';

const TEST_JEEP_TARIFF: FareTariffRule = {
  tariffClass: 'traditional_jeep',
  minimumFare: 14,
  minimumCoveredDistanceKm: 4,
  succeedingDistanceStepKm: 1,
  succeedingKilometerRate: 2,
  succeedingDistanceRounding: 'ceil_step',
};

test('resolveFareTariffClass maps app vehicle types to tariff classes', () => {
  const expectedMappings: Record<VehicleType, 'traditional_jeep' | 'aircon_bus'> = {
    jeep: 'traditional_jeep',
    bus: 'aircon_bus',
  };

  assert.deepEqual(APP_VEHICLE_TARIFF_CLASS, expectedMappings);
  assert.equal(resolveFareTariffClass('jeep'), 'traditional_jeep');
  assert.equal(resolveFareTariffClass('bus'), 'aircon_bus');
});

test('shared fare config exports are frozen to avoid accidental mutation', () => {
  assert.equal(Object.isFrozen(APP_VEHICLE_TARIFF_CLASS), true);
  assert.equal(Object.isFrozen(MVP_DISCOUNT_POLICY), true);
});

test('resolveFareTariffClass fails fast when a bad runtime vehicle type leaks in', () => {
  assert.throws(
    () => resolveFareTariffClass('tricycle' as VehicleType),
    /Unsupported vehicle type: tricycle/,
  );
});

test('computeBaseFare stays at the minimum fare within the covered distance', () => {
  assert.deepEqual(
    computeBaseFare(4, TEST_JEEP_TARIFF),
    {
      distanceKm: 4,
      chargeableDistanceKm: 0,
      succeedingStepCount: 0,
      minimumFare: 14,
      succeedingKilometerRate: 2,
      addedFare: 0,
      baseFare: 14,
    },
  );
});

test('computeBaseFare charges a full succeeding step for partial extra distance', () => {
  assert.deepEqual(
    computeBaseFare(4.1, TEST_JEEP_TARIFF),
    {
      distanceKm: 4.1,
      chargeableDistanceKm: 0.1,
      succeedingStepCount: 1,
      minimumFare: 14,
      succeedingKilometerRate: 2,
      addedFare: 2,
      baseFare: 16,
    },
  );
});

test('computeBaseFare charges multiple succeeding steps when extra distance spans them', () => {
  assert.deepEqual(
    computeBaseFare(6.2, TEST_JEEP_TARIFF),
    {
      distanceKm: 6.2,
      chargeableDistanceKm: 2.2,
      succeedingStepCount: 3,
      minimumFare: 14,
      succeedingKilometerRate: 2,
      addedFare: 6,
      baseFare: 20,
    },
  );
});

test('computeBaseFare rejects invalid trip distance values', () => {
  assert.throws(
    () => computeBaseFare(Number.NaN, TEST_JEEP_TARIFF),
    /distanceKm must be a finite number/,
  );
  assert.throws(
    () => computeBaseFare(Number.POSITIVE_INFINITY, TEST_JEEP_TARIFF),
    /distanceKm must be a finite number/,
  );
  assert.throws(
    () => computeBaseFare(-1, TEST_JEEP_TARIFF),
    /distanceKm must be greater than or equal to 0/,
  );
});

test('computeBaseFare rejects invalid tariff configuration values', () => {
  assert.throws(
    () => computeBaseFare(5, { ...TEST_JEEP_TARIFF, tariffClass: 'modern_jeep' as FareTariffRule['tariffClass'] }),
    /Unsupported tariff class: modern_jeep/,
  );
  assert.throws(
    () => computeBaseFare(5, {
      ...TEST_JEEP_TARIFF,
      succeedingDistanceRounding: 'floor_step' as FareTariffRule['succeedingDistanceRounding'],
    }),
    /Unsupported succeedingDistanceRounding: floor_step/,
  );
  assert.throws(
    () => computeBaseFare(5, { ...TEST_JEEP_TARIFF, minimumFare: -1 }),
    /minimumFare must be greater than or equal to 0/,
  );
  assert.throws(
    () => computeBaseFare(5, { ...TEST_JEEP_TARIFF, minimumCoveredDistanceKm: -1 }),
    /minimumCoveredDistanceKm must be greater than or equal to 0/,
  );
  assert.throws(
    () => computeBaseFare(5, { ...TEST_JEEP_TARIFF, succeedingDistanceStepKm: 0 }),
    /succeedingDistanceStepKm must be greater than 0/,
  );
  assert.throws(
    () => computeBaseFare(5, { ...TEST_JEEP_TARIFF, succeedingKilometerRate: -0.01 }),
    /succeedingKilometerRate must be greater than or equal to 0/,
  );
});

test('applyDiscount uses the current MVP rounding behavior', () => {
  assert.equal(MVP_DISCOUNT_POLICY.percentageOff, 0.2);
  assert.equal(applyDiscount(18, MVP_DISCOUNT_POLICY), 14);
  assert.equal(applyDiscount(0, MVP_DISCOUNT_POLICY), 0);
});

test('applyDiscount rejects invalid base fare and percentageOff values', () => {
  assert.throws(
    () => applyDiscount(-10, MVP_DISCOUNT_POLICY),
    /baseFare must be greater than or equal to 0/,
  );
  assert.throws(
    () => applyDiscount(Number.NaN, MVP_DISCOUNT_POLICY),
    /baseFare must be a finite number/,
  );
  assert.throws(
    () => applyDiscount(18, { percentageOff: -0.01 }),
    /percentageOff must be between 0 and 1 inclusive/,
  );
  assert.throws(
    () => applyDiscount(18, { percentageOff: 1.01 }),
    /percentageOff must be between 0 and 1 inclusive/,
  );
  assert.throws(
    () => applyDiscount(18, { percentageOff: Number.NaN }),
    /percentageOff must be a finite number/,
  );
});

test('resolveDisplayedFareAmount returns base fare for normal mode and discounted fare for discounted mode', () => {
  const baseFare = 18;
  const discountedFare = applyDiscount(baseFare, MVP_DISCOUNT_POLICY);

  assert.equal(resolveDisplayedFareAmount(baseFare, discountedFare, 'normal'), 18);
  assert.equal(resolveDisplayedFareAmount(baseFare, discountedFare, 'discounted'), 14);
});

test('resolveDisplayedFareAmount rejects invalid numeric inputs and unsupported fare modes', () => {
  assert.throws(
    () => resolveDisplayedFareAmount(Number.NaN, 14, 'normal'),
    /baseFare must be a finite number/,
  );
  assert.throws(
    () => resolveDisplayedFareAmount(-1, 14, 'normal'),
    /baseFare must be greater than or equal to 0/,
  );
  assert.throws(
    () => resolveDisplayedFareAmount(18, Number.POSITIVE_INFINITY, 'discounted'),
    /discountedFare must be a finite number/,
  );
  assert.throws(
    () => resolveDisplayedFareAmount(18, -1, 'discounted'),
    /discountedFare must be greater than or equal to 0/,
  );
  assert.throws(
    () => resolveDisplayedFareAmount(18, 14, 'student' as 'normal'),
    /Unsupported fare mode: student/,
  );
});
