import type { DriverGuidanceMode, DriverGuidanceState, RouteCoordinate } from '@/lib/domain/transport';

export interface DriverRouteRenderModel {
  routeId: string | null;
  guidanceMode: DriverGuidanceMode | null;
  mainRouteCoordinates: RouteCoordinate[] | null;
  reconnectCoordinates: RouteCoordinate[] | null;
  boundsCoordinates: RouteCoordinate[];
}

interface BuildDriverRouteRenderModelInput {
  activeRouteId: string | null;
  guidance: DriverGuidanceState | null;
  vehicleCoordinate: RouteCoordinate | null;
  destinationCoordinate: RouteCoordinate | null;
}

// Renderable Coordinate Normalizer - hides route lines that do not have enough points to draw.
function normalizeRenderableCoordinates(coordinates: RouteCoordinate[] | null | undefined) {
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  return coordinates;
}

// Driver Route Render Model - prepares active route, connector, and bounds data for the map layers.
export function buildDriverRouteRenderModel({
  activeRouteId,
  guidance,
  vehicleCoordinate,
  destinationCoordinate,
}: BuildDriverRouteRenderModelInput): DriverRouteRenderModel {
  const mainRouteCoordinates = normalizeRenderableCoordinates(guidance?.routeCoordinates);
  const reconnectCoordinates = normalizeRenderableCoordinates(guidance?.connectorCoordinates);
  const boundsCoordinates: RouteCoordinate[] = [];

  if (mainRouteCoordinates) {
    boundsCoordinates.push(...mainRouteCoordinates);
  }

  if (reconnectCoordinates) {
    boundsCoordinates.push(...reconnectCoordinates);
  }

  if (vehicleCoordinate) {
    boundsCoordinates.push(vehicleCoordinate);
  }

  if (destinationCoordinate) {
    boundsCoordinates.push(destinationCoordinate);
  }

  return {
    routeId: activeRouteId,
    guidanceMode: guidance?.mode ?? null,
    mainRouteCoordinates,
    reconnectCoordinates,
    boundsCoordinates,
  };
}
