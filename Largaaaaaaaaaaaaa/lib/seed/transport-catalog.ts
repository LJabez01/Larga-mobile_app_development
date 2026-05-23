// Transport Catalog - defines the coded route-truth subset for terminals and route records.
// Use TRANSPORT_LOCATION_INVENTORY_SEED for the broader Sta. Maria terminal and route-point inventory.
import type { RouteRecord, TerminalOption } from '@/lib/domain/transport';

import { GENERATED_ROUTE_GEOMETRIES } from '@/lib/seed/generated/transport-route-geometries';
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
    coordinate: [120.9639, 14.8234],
    isActive: true,
  },
  {
    id: 'norzagaray-terminal',
    label: 'Norzagaray Terminal',
    coordinate: [121.0458, 14.9107],
    isActive: true,
  },
  {
    id: 'halang-terminal',
    label: 'Halang Terminal',
    coordinate: [121.0129, 14.8537],
    isActive: true,
  },
  {
    id: 'san-jose-terminal',
    label: 'San Jose Terminal',
    coordinate: [120.9975, 14.8376],
    isActive: true,
  },
];

function getGeneratedRouteCoordinates(routeId: string): RouteRecord['coordinates'] {
  const coordinates = GENERATED_ROUTE_GEOMETRIES[routeId];

  if (!coordinates || coordinates.length < 2) {
    throw new Error(`Missing generated route geometry for ${routeId}. Run npm.cmd run seed:transport:refresh-geometry.`);
  }

  return coordinates.map(([longitude, latitude]) => [longitude, latitude]);
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
      isActive: true,
    },
    {
      id: buildReverseRouteId(route.originTerminalId, route.destinationTerminalId),
      label: buildReverseRouteLabel(route.label),
      originTerminalId: route.destinationTerminalId,
      destinationTerminalId: route.originTerminalId,
      vehicleType: route.vehicleType,
      isActive: true,
      coordinates: reverseRouteCoordinates(coordinates),
    },
  ];
});
