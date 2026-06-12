import type { VehicleType } from '@/lib/domain/transport';

export type FareMode = 'normal' | 'discounted';
export type FareTariffClass = 'traditional_jeep' | 'aircon_bus';
export type FareDistanceRounding = 'ceil_step';

export interface FareTariffRule {
  tariffClass: FareTariffClass;
  minimumFare: number;
  minimumCoveredDistanceKm: number;
  succeedingDistanceStepKm: number;
  succeedingKilometerRate: number;
  succeedingDistanceRounding: FareDistanceRounding;
}

export interface FareDiscountPolicy {
  percentageOff: number;
}

export interface FareComputationBreakdown {
  distanceKm: number;
  chargeableDistanceKm: number;
  succeedingStepCount: number;
  minimumFare: number;
  succeedingKilometerRate: number;
  addedFare: number;
  baseFare: number;
}

const SUPPORTED_VEHICLE_TYPES = ['jeep', 'bus'] as const;
const SUPPORTED_FARE_MODES = ['normal', 'discounted'] as const;
const SUPPORTED_TARIFF_CLASSES = ['traditional_jeep', 'aircon_bus'] as const;
const SUPPORTED_DISTANCE_ROUNDING = ['ceil_step'] as const;

export const APP_VEHICLE_TARIFF_CLASS = Object.freeze({
  jeep: 'traditional_jeep',
  bus: 'aircon_bus',
} satisfies Record<VehicleType, FareTariffClass>);

export const MVP_DISCOUNT_POLICY = Object.freeze({
  percentageOff: 0.2,
} satisfies FareDiscountPolicy);

function roundDistanceKm(value: number) {
  return Number(value.toFixed(6));
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function assertNonNegativeNumber(value: number, label: string) {
  assertFiniteNumber(value, label);

  if (value < 0) {
    throw new Error(`${label} must be greater than or equal to 0`);
  }
}

function assertPositiveNumber(value: number, label: string) {
  assertFiniteNumber(value, label);

  if (value <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }
}

function assertFareTariffRule(tariff: FareTariffRule) {
  if (!SUPPORTED_TARIFF_CLASSES.includes(tariff.tariffClass)) {
    throw new Error(`Unsupported tariff class: ${String(tariff.tariffClass)}`);
  }

  if (!SUPPORTED_DISTANCE_ROUNDING.includes(tariff.succeedingDistanceRounding)) {
    throw new Error(
      `Unsupported succeedingDistanceRounding: ${String(tariff.succeedingDistanceRounding)}`,
    );
  }

  assertNonNegativeNumber(tariff.minimumFare, 'minimumFare');
  assertNonNegativeNumber(tariff.minimumCoveredDistanceKm, 'minimumCoveredDistanceKm');
  assertPositiveNumber(tariff.succeedingDistanceStepKm, 'succeedingDistanceStepKm');
  assertNonNegativeNumber(tariff.succeedingKilometerRate, 'succeedingKilometerRate');
}

function assertDiscountPolicy(policy: FareDiscountPolicy) {
  assertFiniteNumber(policy.percentageOff, 'percentageOff');

  if (policy.percentageOff < 0 || policy.percentageOff > 1) {
    throw new Error('percentageOff must be between 0 and 1 inclusive');
  }
}

function assertFareMode(fareMode: FareMode) {
  if (!SUPPORTED_FARE_MODES.includes(fareMode)) {
    throw new Error(`Unsupported fare mode: ${String(fareMode)}`);
  }
}

export function resolveFareTariffClass(vehicleType: VehicleType): FareTariffClass {
  if (!SUPPORTED_VEHICLE_TYPES.includes(vehicleType)) {
    throw new Error(`Unsupported vehicle type: ${String(vehicleType)}`);
  }

  return APP_VEHICLE_TARIFF_CLASS[vehicleType];
}

export function computeBaseFare(
  distanceKm: number,
  tariff: FareTariffRule,
): FareComputationBreakdown {
  assertNonNegativeNumber(distanceKm, 'distanceKm');
  assertFareTariffRule(tariff);

  const chargeableDistanceKm = roundDistanceKm(
    Math.max(distanceKm - tariff.minimumCoveredDistanceKm, 0),
  );
  const succeedingStepCount = tariff.succeedingDistanceRounding === 'ceil_step'
    ? Math.ceil(chargeableDistanceKm / tariff.succeedingDistanceStepKm)
    : 0;
  const addedFare = roundCurrency(succeedingStepCount * tariff.succeedingKilometerRate);
  const baseFare = roundCurrency(tariff.minimumFare + addedFare);

  return {
    distanceKm,
    chargeableDistanceKm,
    succeedingStepCount,
    minimumFare: tariff.minimumFare,
    succeedingKilometerRate: tariff.succeedingKilometerRate,
    addedFare,
    baseFare,
  };
}

export function applyDiscount(baseFare: number, policy: FareDiscountPolicy) {
  assertNonNegativeNumber(baseFare, 'baseFare');
  assertDiscountPolicy(policy);

  return Math.max(Math.round(baseFare * (1 - policy.percentageOff)), 0);
}

export function resolveDisplayedFareAmount(
  baseFare: number,
  discountedFare: number,
  fareMode: FareMode = 'normal',
) {
  assertNonNegativeNumber(baseFare, 'baseFare');
  assertNonNegativeNumber(discountedFare, 'discountedFare');
  assertFareMode(fareMode);

  return fareMode === 'discounted' ? discountedFare : baseFare;
}
