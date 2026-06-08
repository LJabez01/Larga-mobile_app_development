// Transport Catalog - defines the coded route-truth subset for terminals and route records.
// Use TRANSPORT_LOCATION_INVENTORY_SEED for the broader Sta. Maria terminal and route-point inventory.
import type { RouteRecord, TerminalOption } from '@/lib/domain/transport';

import { GENERATED_ROUTE_GEOMETRIES } from '@/lib/seed/generated/transport-route-geometries';
import {
  getRouteTruthTerminalCoordinate,
  getRouteTruthTerminalMarkerCoordinate,
} from '@/lib/seed/transport-location-inventory';
import {
  BASE_ROUTE_TEMPLATE_SEED,
  buildReverseRouteId,
  buildReverseRouteLabel,
  reverseRouteCoordinates,
} from '@/lib/seed/transport-route-templates';

export const TERMINAL_SEED: TerminalOption[] = [
  {
    id: 'sta-maria-bayan',
    label: 'Sta. Maria Bayan Terminal',
    coordinate: getRouteTruthTerminalMarkerCoordinate('sta-maria-bayan'),
    isActive: true,
  },
  {
    id: 'norzagaray-terminal',
    label: 'Norzagaray Terminal',
    coordinate: getRouteTruthTerminalMarkerCoordinate('norzagaray-terminal'),
    isActive: true,
  },
  {
    id: 'halang-terminal',
    label: 'Halang Terminal',
    coordinate: getRouteTruthTerminalMarkerCoordinate('halang-terminal'),
    isActive: true,
  },
  {
    id: 'san-jose-terminal',
    label: 'San Jose Terminal',
    coordinate: getRouteTruthTerminalMarkerCoordinate('san-jose-terminal'),
    isActive: true,
  },
];

// Generated Route Coordinate Loader - retrieves checked-in Mapbox geometry for a route seed.
function getGeneratedRouteCoordinates(routeId: string): RouteRecord['coordinates'] {
  const coordinates = GENERATED_ROUTE_GEOMETRIES[routeId];

  if (!coordinates || coordinates.length < 2) {
    throw new Error(`Missing generated route geometry for ${routeId}. Run npm.cmd run seed:transport:refresh-geometry.`);
  }

  return coordinates.map(([longitude, latitude]) => [longitude, latitude]);
}

// Reverse Route Record Builder - derives an active return route from a shared corridor template.
function buildReverseRouteRecord(
  route: (typeof BASE_ROUTE_TEMPLATE_SEED)[number],
  coordinates: RouteRecord['coordinates'],
): RouteRecord {
  switch (route.reverseRouteDerivation) {
    case 'shared-corridor-reverse':
      return {
        id: buildReverseRouteId(route.originTerminalId, route.destinationTerminalId),
        label: buildReverseRouteLabel(route.label),
        originTerminalId: route.destinationTerminalId,
        destinationTerminalId: route.originTerminalId,
        vehicleType: route.vehicleType,
        isActive: true,
        coordinates: reverseRouteCoordinates(coordinates),
        reconnectAccessCoordinates: route.reverseReconnectAccessCoordinates
          ? route.reverseReconnectAccessCoordinates.map(([longitude, latitude]) => [longitude, latitude])
          : null,
      };
    default:
      throw new Error(`Unsupported reverse route derivation for ${route.id}`);
  }
}

export const ROUTE_SEED: RouteRecord[] = BASE_ROUTE_TEMPLATE_SEED.flatMap((route) => {
  const coordinates = getGeneratedRouteCoordinates(route.id);

  return [
    {
      id: route.id,
      label: route.label,
      originTerminalId: route.originTerminalId,
      destinationTerminalId: route.destinationTerminalId,
      vehicleType: route.vehicleType,
      coordinates,
      reconnectAccessCoordinates: route.forwardReconnectAccessCoordinates
        ? route.forwardReconnectAccessCoordinates.map(([longitude, latitude]) => [longitude, latitude])
        : null,
      isActive: true,
    },
    buildReverseRouteRecord(route, coordinates),
  ];
});
