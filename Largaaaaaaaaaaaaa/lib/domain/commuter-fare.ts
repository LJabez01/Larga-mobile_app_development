import { getRouteFareStopsByRouteId } from '@/lib/seed/transport-fare';
import { getTransportLocationById } from '@/lib/seed/transport-location-inventory';

export interface FareStopOption {
  locationId: string;
  label: string;
  orderIndex: number;
  cumulativeDistanceKm: number;
}

const EMPTY_FARE_STOP_OPTIONS: readonly FareStopOption[] = Object.freeze([]);

const fareStopOptionsCache = new Map<string, readonly FareStopOption[]>();

export function getRouteFareStopOptions(routeId: string | null) {
  if (!routeId) {
    return EMPTY_FARE_STOP_OPTIONS;
  }

  const cachedOptions = fareStopOptionsCache.get(routeId);

  if (cachedOptions) {
    return cachedOptions;
  }

  const routeFareStops = getRouteFareStopsByRouteId(routeId);

  if (!routeFareStops) {
    return EMPTY_FARE_STOP_OPTIONS;
  }

  const fareStopOptions = Object.freeze(routeFareStops.map((stop) => {
    const location = getTransportLocationById(stop.locationId);

    if (!location) {
      throw new Error(`Missing transport location label for fare stop ${stop.locationId} on ${routeId}.`);
    }

    return Object.freeze({
      locationId: stop.locationId,
      label: location.label,
      orderIndex: stop.orderIndex,
      cumulativeDistanceKm: stop.cumulativeDistanceKm,
    } satisfies FareStopOption);
  }));

  fareStopOptionsCache.set(routeId, fareStopOptions);

  return fareStopOptions;
}
