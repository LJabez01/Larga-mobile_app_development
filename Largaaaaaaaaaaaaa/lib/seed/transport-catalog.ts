import type { RouteRecord, TerminalOption } from '@/lib/domain/transport';

interface BaseRouteSeed {
  id: string;
  label: string;
  originTerminalId: string;
  destinationTerminalId: string;
  vehicleType: RouteRecord['vehicleType'];
  isActive: boolean;
  coordinates: RouteRecord['coordinates'];
}

export const TERMINAL_SEED: TerminalOption[] = [
  {
    id: 'sta-maria-bayan',
    label: 'Sta. Maria Bayan Terminal',
    coordinate: [120.9588, 14.8189],
    isActive: true,
  },
  {
    id: 'norzagaray-terminal',
    label: 'Norzagaray Terminal',
    coordinate: [121.0445, 14.9104],
    isActive: true,
  },
  {
    id: 'halang-terminal',
    label: 'Halang Terminal',
    coordinate: [120.9978, 14.8459],
    isActive: true,
  },
  {
    id: 'san-jose-terminal',
    label: 'San Jose Terminal',
    coordinate: [121.0142, 14.8741],
    isActive: true,
  },
];

const BASE_ROUTE_SEED: BaseRouteSeed[] = [
  {
    id: 'sta-maria-bayan-norzagaray',
    label: 'Sta. Maria Bayan - Norzagaray',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'norzagaray-terminal',
    vehicleType: 'jeep',
    isActive: true,
    coordinates: [
      [120.9588, 14.8189],
      [120.9725, 14.8381],
      [120.9964, 14.8627],
      [121.0188, 14.8862],
      [121.0445, 14.9104],
    ],
  },
  {
    id: 'sta-maria-bayan-halang',
    label: 'Sta. Maria Bayan - Halang',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'halang-terminal',
    vehicleType: 'bus',
    isActive: true,
    coordinates: [
      [120.9588, 14.8189],
      [120.9714, 14.8277],
      [120.9842, 14.8362],
      [120.9914, 14.8415],
      [120.9978, 14.8459],
    ],
  },
  {
    id: 'sta-maria-bayan-san-jose',
    label: 'Sta. Maria Bayan - San Jose',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'san-jose-terminal',
    vehicleType: 'bus',
    isActive: true,
    coordinates: [
      [120.9588, 14.8189],
      [120.9731, 14.8328],
      [120.9876, 14.8473],
      [121.0013, 14.8606],
      [121.0142, 14.8741],
    ],
  },
];

function reverseRouteCoordinates(coordinates: RouteRecord['coordinates']): RouteRecord['coordinates'] {
  return [...coordinates]
    .reverse()
    .map(([longitude, latitude]) => [longitude, latitude]);
}

function buildReverseRouteId(originTerminalId: string, destinationTerminalId: string) {
  return `${destinationTerminalId.replace('-terminal', '')}-${originTerminalId.replace('-terminal', '')}`;
}

function buildReverseRouteLabel(label: string) {
  const [originLabel, destinationLabel] = label.split(' - ');

  if (!originLabel || !destinationLabel) {
    return label;
  }

  return `${destinationLabel} - ${originLabel}`;
}

export const ROUTE_SEED: RouteRecord[] = BASE_ROUTE_SEED.flatMap((route) => [
  {
    ...route,
    isActive: true,
  },
  {
    id: buildReverseRouteId(route.originTerminalId, route.destinationTerminalId),
    label: buildReverseRouteLabel(route.label),
    originTerminalId: route.destinationTerminalId,
    destinationTerminalId: route.originTerminalId,
    vehicleType: route.vehicleType,
    isActive: true,
    coordinates: reverseRouteCoordinates(route.coordinates),
  },
]);
