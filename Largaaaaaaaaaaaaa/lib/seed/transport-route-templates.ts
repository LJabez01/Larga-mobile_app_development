import type { RouteCoordinate, RouteRecord } from '@/lib/domain/transport';

export interface BaseRouteTemplate {
  id: string;
  label: string;
  originTerminalId: string;
  destinationTerminalId: string;
  vehicleType: RouteRecord['vehicleType'];
  isActive: boolean;
  waypoints: RouteCoordinate[];
}

export const BASE_ROUTE_TEMPLATE_SEED: BaseRouteTemplate[] = [
  {
    id: 'sta-maria-bayan-norzagaray',
    label: 'Sta. Maria Bayan - Norzagaray',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'norzagaray-terminal',
    vehicleType: 'jeep',
    isActive: true,
    waypoints: [
      [120.9639, 14.8234],
      [120.9897, 14.8488],
      [121.0175, 14.8781],
      [121.0458, 14.9107],
    ],
  },
  {
    id: 'sta-maria-bayan-halang',
    label: 'Sta. Maria Bayan - Halang',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'halang-terminal',
    vehicleType: 'bus',
    isActive: true,
    waypoints: [
      [120.9639, 14.8234],
      [120.9803, 14.8322],
      [120.9954, 14.8429],
      [121.0129, 14.8537],
    ],
  },
  {
    id: 'sta-maria-bayan-san-jose',
    label: 'Sta. Maria Bayan - San Jose',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'san-jose-terminal',
    vehicleType: 'bus',
    isActive: true,
    waypoints: [
      [120.9639, 14.8234],
      [120.9756, 14.8289],
      [120.9869, 14.8335],
      [120.9975, 14.8376],
    ],
  },
];

export function reverseRouteCoordinates(coordinates: RouteRecord['coordinates']): RouteRecord['coordinates'] {
  return [...coordinates]
    .reverse()
    .map(([longitude, latitude]) => [longitude, latitude]);
}

export function buildReverseRouteId(originTerminalId: string, destinationTerminalId: string) {
  return `${destinationTerminalId.replace('-terminal', '')}-${originTerminalId.replace('-terminal', '')}`;
}

export function buildReverseRouteLabel(label: string) {
  const [originLabel, destinationLabel] = label.split(' - ');

  if (!originLabel || !destinationLabel) {
    return label;
  }

  return `${destinationLabel} - ${originLabel}`;
}
