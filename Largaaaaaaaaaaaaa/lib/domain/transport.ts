export type VehicleType = 'bus' | 'jeep';

export type RouteCoordinate = [number, number];

export interface FirestoreRouteCoordinate {
  longitude: number;
  latitude: number;
}

export interface TerminalOption {
  id: string;
  label: string;
  coordinate: RouteCoordinate;
  isActive: boolean;
}

export interface RouteRecord {
  id: string;
  label: string;
  originTerminalId: string;
  destinationTerminalId: string;
  vehicleType: VehicleType;
  coordinates: RouteCoordinate[];
  isActive: boolean;
}

export interface DriverSelectionState {
  originTerminalId: string | null;
  destinationTerminalId: string | null;
  resolvedRouteId: string | null;
  resolvedRouteLabel: string | null;
}

export type DriverTerminalTarget = 'origin' | 'destination';

export function createEmptyDriverSelection(): DriverSelectionState {
  return {
    originTerminalId: null,
    destinationTerminalId: null,
    resolvedRouteId: null,
    resolvedRouteLabel: null,
  };
}

export function isDistinctTerminalPair(
  originTerminalId: string | null,
  destinationTerminalId: string | null,
): originTerminalId is string {
  return Boolean(originTerminalId && destinationTerminalId && originTerminalId !== destinationTerminalId);
}

export function buildDirectionKey(originTerminalId: string, destinationTerminalId: string) {
  return `${originTerminalId}::${destinationTerminalId}`;
}

export function serializeRouteCoordinates(coordinates: RouteCoordinate[]): FirestoreRouteCoordinate[] {
  return coordinates.map(([longitude, latitude]) => ({
    longitude,
    latitude,
  }));
}

export function deserializeRouteCoordinates(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const coordinates = value.flatMap((item) => {
    if (
      typeof item === 'object'
      && item !== null
      && typeof (item as FirestoreRouteCoordinate).longitude === 'number'
      && Number.isFinite((item as FirestoreRouteCoordinate).longitude)
      && typeof (item as FirestoreRouteCoordinate).latitude === 'number'
      && Number.isFinite((item as FirestoreRouteCoordinate).latitude)
    ) {
      return [[
        (item as FirestoreRouteCoordinate).longitude,
        (item as FirestoreRouteCoordinate).latitude,
      ] as RouteCoordinate];
    }

    return [];
  });

  return coordinates.length >= 2 ? coordinates : null;
}

export function resolveRouteForTerminals(
  routes: RouteRecord[],
  originTerminalId: string | null,
  destinationTerminalId: string | null,
) {
  if (!isDistinctTerminalPair(originTerminalId, destinationTerminalId)) {
    return null;
  }

  const activeMatches = routes.filter(
    (route) =>
      route.isActive
      && route.originTerminalId === originTerminalId
      && route.destinationTerminalId === destinationTerminalId,
  );

  if (activeMatches.length !== 1) {
    return null;
  }

  return activeMatches[0];
}

export function getSelectableTerminalIds(
  routes: RouteRecord[],
  target: DriverTerminalTarget,
  selectedCounterpartTerminalId: string | null,
) {
  const compatibleRouteSet = routes.filter((route) => route.isActive);

  if (target === 'origin') {
    return new Set(
      compatibleRouteSet
        .filter((route) => !selectedCounterpartTerminalId || route.destinationTerminalId === selectedCounterpartTerminalId)
        .map((route) => route.originTerminalId),
    );
  }

  return new Set(
    compatibleRouteSet
      .filter((route) => !selectedCounterpartTerminalId || route.originTerminalId === selectedCounterpartTerminalId)
      .map((route) => route.destinationTerminalId),
  );
}
