import {
  MVP_DISCOUNT_POLICY,
  applyDiscount,
  computeBaseFare,
  resolveFareTariffClass,
  type FareComputationBreakdown,
  type FareTariffClass,
} from '@/lib/domain/fare';
import type { VehicleType } from '@/lib/domain/transport';
import * as transportFareSeed from '@/lib/seed/transport-fare';

export type FareResolutionStatus =
  | 'ready'
  | 'missing_origin'
  | 'missing_destination'
  | 'same_origin_destination'
  | 'destination_before_origin'
  | 'origin_not_on_route'
  | 'destination_not_on_route'
  | 'route_not_fare_enabled'
  | 'invalid_vehicle_type'
  | 'tariff_not_configured';

export interface ResolveFareInput {
  routeId: string;
  vehicleType: VehicleType;
  fareOriginLocationId: string | null;
  fareDestinationLocationId: string | null;
}

export interface FareResolution {
  status: FareResolutionStatus;
  routeId: string;
  vehicleType: VehicleType;
  tariffClass: FareTariffClass | null;
  fareOriginLocationId: string | null;
  fareDestinationLocationId: string | null;
  baseFare: number | null;
  discountedFare: number | null;
  breakdown: FareComputationBreakdown | null;
}

interface FareResolutionDependencies {
  getTariffRuleByTariffClass?: typeof transportFareSeed.getTariffRuleByTariffClass;
}

function createFareResolution(
  input: ResolveFareInput,
  status: FareResolutionStatus,
  tariffClass: FareTariffClass | null,
  baseFare: number | null = null,
  discountedFare: number | null = null,
  breakdown: FareComputationBreakdown | null = null,
): FareResolution {
  return {
    status,
    routeId: input.routeId,
    vehicleType: input.vehicleType,
    tariffClass,
    fareOriginLocationId: input.fareOriginLocationId,
    fareDestinationLocationId: input.fareDestinationLocationId,
    baseFare,
    discountedFare,
    breakdown,
  };
}

function resolveTariffClassSafely(vehicleType: VehicleType) {
  try {
    return resolveFareTariffClass(vehicleType);
  } catch {
    return null;
  }
}

export function resolveRouteFare(
  input: ResolveFareInput,
  dependencies: FareResolutionDependencies = {},
): FareResolution {
  if (!transportFareSeed.isRouteFareEnabled(input.routeId)) {
    return createFareResolution(input, 'route_not_fare_enabled', null);
  }

  const tariffClass = resolveTariffClassSafely(input.vehicleType);

  if (!tariffClass) {
    return createFareResolution(input, 'invalid_vehicle_type', null);
  }

  if (!input.fareOriginLocationId) {
    return createFareResolution(input, 'missing_origin', tariffClass);
  }

  if (!input.fareDestinationLocationId) {
    return createFareResolution(input, 'missing_destination', tariffClass);
  }

  if (input.fareOriginLocationId === input.fareDestinationLocationId) {
    return createFareResolution(input, 'same_origin_destination', tariffClass);
  }

  const routeFareStops = transportFareSeed.getRouteFareStopsByRouteId(input.routeId);

  if (!routeFareStops) {
    return createFareResolution(input, 'route_not_fare_enabled', tariffClass);
  }

  const originStop = routeFareStops.find((stop) => stop.locationId === input.fareOriginLocationId) ?? null;

  if (!originStop) {
    return createFareResolution(input, 'origin_not_on_route', tariffClass);
  }

  const destinationStop = routeFareStops.find((stop) => stop.locationId === input.fareDestinationLocationId) ?? null;

  if (!destinationStop) {
    return createFareResolution(input, 'destination_not_on_route', tariffClass);
  }

  const distanceKm = Number(
    (destinationStop.cumulativeDistanceKm - originStop.cumulativeDistanceKm).toFixed(6),
  );

  if (distanceKm < 0) {
    return createFareResolution(input, 'destination_before_origin', tariffClass);
  }

  const getTariffRuleByTariffClass = dependencies.getTariffRuleByTariffClass
    ?? transportFareSeed.getTariffRuleByTariffClass;
  const tariffRule = getTariffRuleByTariffClass(tariffClass);

  if (!tariffRule) {
    return createFareResolution(input, 'tariff_not_configured', tariffClass);
  }

  const breakdown = computeBaseFare(distanceKm, tariffRule);
  const baseFare = breakdown.baseFare;
  const discountedFare = applyDiscount(baseFare, MVP_DISCOUNT_POLICY);

  return createFareResolution(
    input,
    'ready',
    tariffClass,
    baseFare,
    discountedFare,
    breakdown,
  );
}
