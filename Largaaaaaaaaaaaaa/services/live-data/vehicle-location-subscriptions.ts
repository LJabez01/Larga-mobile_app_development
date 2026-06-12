export const MAX_VEHICLE_LOCATION_ROUTE_IDS_PER_QUERY = 10;

export interface VehicleLocationSubscriptionPlanInput {
  activeVehicleId: string | null;
  commuterNearbyRouteIds: readonly string[];
}

export interface VehicleLocationSubscriptionPlan {
  ownVehicleDocId: string | null;
  routeQueryChunks: string[][];
  subscriptionKey: string;
}

function normalizeRouteIds(routeIds: readonly string[]) {
  return [...new Set(
    routeIds
      .filter((routeId) => typeof routeId === 'string')
      .map((routeId) => routeId.trim())
      .filter((routeId) => routeId.length > 0),
  )].sort((left, right) => left.localeCompare(right));
}

export function buildVehicleLocationSubscriptionPlan({
  activeVehicleId,
  commuterNearbyRouteIds,
}: VehicleLocationSubscriptionPlanInput): VehicleLocationSubscriptionPlan {
  const normalizedRouteIds = normalizeRouteIds(commuterNearbyRouteIds);
  const routeQueryChunks: string[][] = [];

  for (let index = 0; index < normalizedRouteIds.length; index += MAX_VEHICLE_LOCATION_ROUTE_IDS_PER_QUERY) {
    routeQueryChunks.push(
      normalizedRouteIds.slice(index, index + MAX_VEHICLE_LOCATION_ROUTE_IDS_PER_QUERY),
    );
  }

  return {
    ownVehicleDocId: activeVehicleId,
    routeQueryChunks,
    subscriptionKey: [
      activeVehicleId ?? 'no-active-vehicle',
      normalizedRouteIds.join(','),
    ].join('|'),
  };
}
