import type { RouteCoordinate, RouteRecord } from '@/lib/domain/transport';
import { getRouteTruthTerminalCoordinate } from '@/lib/seed/transport-location-inventory';

export type RouteCorridorFamilyId =
  | 'sta-maria-sjdm-corridor'
  | 'sta-maria-norzagaray-corridor';

export type RouteCorridorClassification = 'official-corridor-spine';

export type ReverseRouteDerivation = 'shared-corridor-reverse';

const SHARED_SJDM_SHELL_PATAG_MAIN_ROAD_WAYPOINT: RouteCoordinate = [120.981249, 14.826195];

export interface BaseRouteTemplate {
  id: string;
  label: string;
  originTerminalId: string;
  destinationTerminalId: string;
  vehicleType: RouteRecord['vehicleType'];
  isActive: boolean;
  corridorFamilyId: RouteCorridorFamilyId;
  corridorClassification: RouteCorridorClassification;
  reverseRouteDerivation: ReverseRouteDerivation;
  majorRoadGuide: readonly string[];
  avoidRoadGuide: readonly string[];
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
    corridorFamilyId: 'sta-maria-norzagaray-corridor',
    corridorClassification: 'official-corridor-spine',
    reverseRouteDerivation: 'shared-corridor-reverse',
    majorRoadGuide: [
      'Sta. Maria Bayan connector',
      'Santa Maria Bypass Road',
      'Guyong junction',
      'Norzagaray-Santa Maria Road',
      'Pulong Buhangin / Balasing / Catmon corridor',
      'Del Carmen corridor-side terminal area',
    ],
    avoidRoadGuide: [
      'Santa Maria-Tungkong Mangga Road',
      'MacArthur Highway',
      'NLEX',
      'Pandi-Angat-Baliuag branch roads',
      'residential shortcuts off Norzagaray-Santa Maria Road',
    ],
    waypoints: [
      getRouteTruthTerminalCoordinate('sta-maria-bayan'),
      getRouteTruthTerminalCoordinate('norzagaray-terminal'),
    ],
  },
  {
    id: 'sta-maria-bayan-halang',
    label: 'Sta. Maria Bayan - Halang',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'halang-terminal',
    vehicleType: 'bus',
    isActive: true,
    corridorFamilyId: 'sta-maria-sjdm-corridor',
    corridorClassification: 'official-corridor-spine',
    reverseRouteDerivation: 'shared-corridor-reverse',
    majorRoadGuide: [
      'Sta. Maria Public Market / New Santa Maria Jeepney Terminal area',
      'M. De Leon / C. De Jesus connector',
      'R. Mercado Street',
      'Santa Maria-Tungkong Mangga Road / Gov. F. Halili Avenue',
      'Halang terminal area',
    ],
    avoidRoadGuide: [
      'Norzagaray-Santa Maria Road',
      'Santa Maria Bypass Road',
      'WalterMart / Sta. Clara / Guyong corridor',
      'MacArthur Highway',
      'Pandi-Angat-Baliuag branch roads',
    ],
    waypoints: [
      getRouteTruthTerminalCoordinate('sta-maria-bayan'),
      [120.9803, 14.8322],
      [120.9954, 14.8429],
      getRouteTruthTerminalCoordinate('halang-terminal'),
    ],
  },
  {
    id: 'sta-maria-bayan-san-jose',
    label: 'Sta. Maria Bayan - San Jose',
    originTerminalId: 'sta-maria-bayan',
    destinationTerminalId: 'san-jose-terminal',
    vehicleType: 'bus',
    isActive: true,
    corridorFamilyId: 'sta-maria-sjdm-corridor',
    corridorClassification: 'official-corridor-spine',
    reverseRouteDerivation: 'shared-corridor-reverse',
    majorRoadGuide: [
      'Sta. Maria Public Market / New Santa Maria Jeepney Terminal area',
      'M. De Leon Street',
      'R. Mercado Street',
      'Santa Maria-Tungkong Mangga Road / Gov. F. Halili Avenue',
      'San Jose del Monte-Marilao Road',
      'Sapang Palay-Muzon Road',
      'Dr. Eduardo V. Roquero Sr. Avenue side terminal approach',
    ],
    avoidRoadGuide: [
      'Norzagaray-Santa Maria Road',
      'Santa Maria Bypass Road',
      'WalterMart / Sta. Clara / Guyong corridor',
      'MacArthur Highway',
      'random subdivision shortcuts in SJDM',
    ],
    waypoints: [
      getRouteTruthTerminalCoordinate('sta-maria-bayan'),
      [120.9756, 14.8289],
      SHARED_SJDM_SHELL_PATAG_MAIN_ROAD_WAYPOINT,
      getRouteTruthTerminalCoordinate('san-jose-terminal'),
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
