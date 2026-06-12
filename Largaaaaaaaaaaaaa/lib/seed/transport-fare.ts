import {
  APP_VEHICLE_TARIFF_CLASS,
  type FareTariffClass,
  type FareTariffRule,
} from '@/lib/domain/fare';
import {
  findNearestRouteProjection,
  getCoordinateDistanceMeters,
  type RouteRecord,
  type VehicleType,
} from '@/lib/domain/transport';
import { ROUTE_SEED } from '@/lib/seed/transport-catalog';
import { getTransportLocationCoordinate } from '@/lib/seed/transport-location-inventory';

export interface RouteFareStop {
  routeId: string;
  locationId: string;
  orderIndex: number;
  cumulativeDistanceKm: number;
}

export const ROUTE_FARE_STOP_PROJECTION_TOLERANCE_METERS = 120;

export const TARIFF_RULES_BY_CLASS = Object.freeze({
  traditional_jeep: Object.freeze({
    tariffClass: 'traditional_jeep',
    minimumFare: 14,
    minimumCoveredDistanceKm: 4,
    succeedingDistanceStepKm: 1,
    succeedingKilometerRate: 2,
    succeedingDistanceRounding: 'ceil_step',
  } satisfies FareTariffRule),
  aircon_bus: Object.freeze({
    tariffClass: 'aircon_bus',
    minimumFare: 18,
    minimumCoveredDistanceKm: 5,
    succeedingDistanceStepKm: 1,
    succeedingKilometerRate: 2.98,
    succeedingDistanceRounding: 'ceil_step',
  } satisfies FareTariffRule),
} satisfies Record<FareTariffClass, FareTariffRule>);

export const ROUTE_FARE_STOP_LOCATION_IDS_BY_ROUTE = Object.freeze({
  'sta-maria-bayan-norzagaray': Object.freeze([
    'sta-maria-bayan',
    'waltermart-sta-maria-sta-clara-route-point',
    'amber-homes-route-point',
    'norzagaray-terminal',
  ]),
  'norzagaray-sta-maria-bayan': Object.freeze([
    'norzagaray-terminal',
    'amber-homes-route-point',
    'waltermart-sta-maria-sta-clara-route-point',
    'sta-maria-bayan',
  ]),
  'sta-maria-bayan-halang': Object.freeze([
    'sta-maria-bayan',
    'halang-terminal',
  ]),
  'halang-sta-maria-bayan': Object.freeze([
    'halang-terminal',
    'sta-maria-bayan',
  ]),
  'sta-maria-bayan-san-jose': Object.freeze([
    'sta-maria-bayan',
    'burgundy-homes-route-point',
    'san-jose-terminal',
  ]),
  'san-jose-sta-maria-bayan': Object.freeze([
    'san-jose-terminal',
    'burgundy-homes-route-point',
    'sta-maria-bayan',
  ]),
} satisfies Record<string, readonly string[]>);

function buildRouteSeedMap(routes: readonly RouteRecord[]) {
  const routeById = new Map<string, RouteRecord>();

  routes.forEach((route) => {
    if (routeById.has(route.id)) {
      throw new Error(`Duplicate route seed id detected while building fare data: ${route.id}.`);
    }

    routeById.set(route.id, route);
  });

  return routeById;
}

const ROUTE_BY_ID = buildRouteSeedMap(ROUTE_SEED);

function roundDistanceKm(distanceMeters: number) {
  return Number((distanceMeters / 1000).toFixed(6));
}

function getRouteById(routeId: string): RouteRecord {
  const route = ROUTE_BY_ID.get(routeId);

  if (!route) {
    throw new Error(`Missing route seed for fare-enabled route ${routeId}.`);
  }

  return route;
}

function getCumulativeDistanceMetersForProjection(route: RouteRecord, segmentIndex: number, projectedCoordinate: [number, number]) {
  let cumulativeDistanceMeters = 0;

  for (let index = 0; index < segmentIndex; index += 1) {
    cumulativeDistanceMeters += getCoordinateDistanceMeters(
      route.coordinates[index],
      route.coordinates[index + 1],
    );
  }

  cumulativeDistanceMeters += getCoordinateDistanceMeters(
    route.coordinates[segmentIndex],
    projectedCoordinate,
  );

  return cumulativeDistanceMeters;
}

function buildRouteFareStops(routeId: string, locationIds: readonly string[]): readonly RouteFareStop[] {
  const route = getRouteById(routeId);
  let previousCumulativeDistanceKm = Number.NEGATIVE_INFINITY;

  return Object.freeze(locationIds.map((locationId, orderIndex) => {
    let locationCoordinate: [number, number];

    try {
      locationCoordinate = getTransportLocationCoordinate(locationId);
    } catch (error) {
      throw new Error(
        `Missing fare-stop coordinate for ${locationId} on ${routeId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const projection = findNearestRouteProjection(route.coordinates, locationCoordinate);

    if (!projection) {
      throw new Error(`Unable to project fare stop ${locationId} onto route ${routeId}.`);
    }

    if (projection.distanceMeters > ROUTE_FARE_STOP_PROJECTION_TOLERANCE_METERS) {
      throw new Error(
        `Fare stop ${locationId} projects ${projection.distanceMeters.toFixed(2)}m from route ${routeId}, exceeding the ${ROUTE_FARE_STOP_PROJECTION_TOLERANCE_METERS}m tolerance.`,
      );
    }

    const cumulativeDistanceKm = roundDistanceKm(
      getCumulativeDistanceMetersForProjection(
        route,
        projection.segmentIndex,
        projection.coordinate,
      ),
    );

    if (cumulativeDistanceKm <= previousCumulativeDistanceKm) {
      throw new Error(
        `Fare stops for ${routeId} must increase strictly in cumulative distance. ${locationId} resolved to ${cumulativeDistanceKm}km after ${previousCumulativeDistanceKm}km.`,
      );
    }

    previousCumulativeDistanceKm = cumulativeDistanceKm;

    return Object.freeze({
      routeId,
      locationId,
      orderIndex,
      cumulativeDistanceKm,
    } satisfies RouteFareStop);
  }));
}

const ROUTE_FARE_STOPS_BY_ROUTE = new Map(
  Object.entries(ROUTE_FARE_STOP_LOCATION_IDS_BY_ROUTE).map(([routeId, locationIds]) => [
    routeId,
    buildRouteFareStops(routeId, locationIds),
  ] as const),
);

export const FARE_ENABLED_ROUTE_IDS = Object.freeze(
  Array.from(ROUTE_FARE_STOPS_BY_ROUTE.keys()),
);

export function isRouteFareEnabled(routeId: string) {
  return ROUTE_FARE_STOPS_BY_ROUTE.has(routeId);
}

export function getTariffRuleByTariffClass(tariffClass: FareTariffClass): FareTariffRule | null {
  return TARIFF_RULES_BY_CLASS[tariffClass] ?? null;
}

export function getTariffRuleByVehicleType(vehicleType: VehicleType): FareTariffRule | null {
  const tariffClass = APP_VEHICLE_TARIFF_CLASS[vehicleType];

  return tariffClass ? getTariffRuleByTariffClass(tariffClass) : null;
}

export function getRouteFareStopsByRouteId(routeId: string) {
  return ROUTE_FARE_STOPS_BY_ROUTE.get(routeId) ?? null;
}
