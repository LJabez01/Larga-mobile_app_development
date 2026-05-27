import type { RouteCoordinate, TerminalOption } from '@/lib/domain/transport';

export type TransportLocationClassification =
  | 'operational-terminal'
  | 'operational-terminal-candidate'
  | 'reference-route-point';

export type TransportLocationCoordinatePrecision =
  | 'web_verified_candidate'
  | 'approximate'
  | 'needs_field_validation';

export type TransportLocationConfidence =
  | 'confirmed'
  | 'likely'
  | 'needs_verification';

export type TransportLocationVehicleService =
  | 'bus'
  | 'jeep'
  | 'p2p'
  | 'uv'
  | 'mixed';

export interface TransportLocationSeed {
  id: string;
  label: string;
  classification: TransportLocationClassification;
  endpointReady: boolean;
  isActive: boolean;
  vehicleServices: TransportLocationVehicleService[];
  approximateCoordinate: RouteCoordinate | null;
  routeEndpointCoordinate?: RouteCoordinate | null;
  recommendedMapboxQuery: string;
  coordinatePrecision: TransportLocationCoordinatePrecision;
  confidence: TransportLocationConfidence;
  notes: string;
  sourceLabel: string;
  sourceUrl: string;
  linkedTerminalId: string | null;
}

export const ROUTE_TRUTH_TERMINAL_LOCATION_IDS = {
  'sta-maria-bayan': 'sta-maria-bayan',
  'norzagaray-terminal': 'norzagaray-terminal',
  'halang-terminal': 'halang-terminal',
  'san-jose-terminal': 'san-jose-terminal',
} as const satisfies Record<string, string>;

export const STA_MARIA_PROXIMITY_ANCHOR: RouteCoordinate = [120.9590, 14.8180];

// Comprehensive Sta. Maria-connected transport inventory based on the revised
// terminal research document. This keeps all currently known points in one
// typed seed while preserving the existing TERMINAL_SEED as the operational
// route-truth subset used by the current MVP.
export const TRANSPORT_LOCATION_INVENTORY_SEED: TransportLocationSeed[] = [
  {
    id: 'sta-maria-bayan',
    label: 'Sta. Maria Bayan Terminal',
    classification: 'operational-terminal',
    endpointReady: true,
    isActive: true,
    vehicleServices: ['jeep'],
    approximateCoordinate: [120.9588, 14.8178],
    routeEndpointCoordinate: [120.9588, 14.8178],
    recommendedMapboxQuery: 'New Santa Maria Jeepney Terminal, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'confirmed',
    notes: 'Canonical route-truth Sta. Maria endpoint used by the MVP route set. The New Santa Maria Jeepney Terminal evidence anchor resolves into this terminal.',
    sourceLabel: 'Waze, New Santa Maria Jeepney Terminal',
    sourceUrl: 'https://www.waze.com/live-map/directions/ph/central-luzon/santa-maria/new-santa-maria-jeepney-terminal?to=place.ChIJebRBcbStlzMRZ8LZIhqjJ4s',
    linkedTerminalId: 'sta-maria-bayan',
  },
  {
    id: 'norzagaray-terminal',
    label: 'Norzagaray Terminal',
    classification: 'operational-terminal',
    endpointReady: true,
    isActive: true,
    vehicleServices: ['bus'],
    approximateCoordinate: [121.0144, 14.8839],
    routeEndpointCoordinate: [121.0144, 14.8839],
    recommendedMapboxQuery: 'Del Carmen Bus Terminal, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'confirmed',
    notes: 'Canonical route-truth Norzagaray-side endpoint used by the MVP route set. The current operational anchor is the Del Carmen corridor-side terminal area.',
    sourceLabel: 'Waze, Del Carmen Bus Terminal',
    sourceUrl: 'https://www.waze.com/live-map/directions/ph/central-luzon/santa-maria/del-carmen-bus-terminal?to=place.ChIJu262QxKplzMR3YrcxCZ2OeE',
    linkedTerminalId: 'norzagaray-terminal',
  },
  {
    id: 'del-carmen-bus-terminal',
    label: 'Del Carmen Bus Terminal',
    classification: 'operational-terminal',
    endpointReady: true,
    isActive: true,
    vehicleServices: ['bus'],
    approximateCoordinate: [121.0144, 14.8839],
    routeEndpointCoordinate: [121.0144, 14.8839],
    recommendedMapboxQuery: 'Del Carmen Bus Terminal, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'confirmed',
    notes: 'Strong Norzagaray-side bus anchor. Verify exact loading side on Norzagaray-Santa Maria Road.',
    sourceLabel: 'Waze, Del Carmen Bus Terminal',
    sourceUrl: 'https://www.waze.com/live-map/directions/ph/central-luzon/santa-maria/del-carmen-bus-terminal?to=place.ChIJu262QxKplzMR3YrcxCZ2OeE',
    linkedTerminalId: 'norzagaray-terminal',
  },
  {
    id: 'norzagaray-santa-maria-bulacan-bus-route-point',
    label: 'Norzagaray-Santa Maria Bulacan Bus Route Point',
    classification: 'reference-route-point',
    endpointReady: false,
    isActive: true,
    vehicleServices: ['bus'],
    approximateCoordinate: null,
    recommendedMapboxQuery: 'Norzagaray Santa Maria bus stop, Pulong Buhangin, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'approximate',
    confidence: 'confirmed',
    notes: 'Keep as a corridor or route reference unless a distinct stop or terminal point is confirmed.',
    sourceLabel: 'Moovit, Norzagaray-Santa Maria Bulacan Bus Route',
    sourceUrl: 'https://moovitapp.com/index/en/public_transit-line-bus-Manila-1022-9969-7637623-1',
    linkedTerminalId: null,
  },
  {
    id: 'caypombo-p2p-bus-terminal',
    label: 'Caypombo P2P Bus Terminal',
    classification: 'operational-terminal',
    endpointReady: true,
    isActive: true,
    vehicleServices: ['bus', 'p2p'],
    approximateCoordinate: [120.9813, 14.8485],
    recommendedMapboxQuery: 'Caypombo P2P Bus Terminal, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'confirmed',
    notes: 'Good operational endpoint. Verify exact bay or roadside loading edge.',
    sourceLabel: 'P2P Bus Philippines, Caypombo Bulacan to Trinoma',
    sourceUrl: 'https://www.p2pbus.ph/schedules/caypombo-bulacan-trinoma',
    linkedTerminalId: null,
  },
  {
    id: 'precious-grace-transport-caypombo-terminal',
    label: 'Precious Grace Transport, Caypombo Terminal',
    classification: 'operational-terminal',
    endpointReady: true,
    isActive: true,
    vehicleServices: ['bus', 'p2p'],
    approximateCoordinate: [120.9812, 14.8484],
    recommendedMapboxQuery: 'Precious Grace Transport P2P Bus Terminal, Caypombo, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'confirmed',
    notes: 'Likely overlaps with Caypombo P2P terminal area. Keep separate until operator-side confirmation says otherwise.',
    sourceLabel: 'P2P Bus Philippines, Caypombo Bulacan to Trinoma',
    sourceUrl: 'https://www.p2pbus.ph/schedules/caypombo-bulacan-trinoma',
    linkedTerminalId: null,
  },
  {
    id: 'p2p-sta-clara-waltermart-sta-maria',
    label: 'P2P Sta. Clara / WalterMart Sta. Maria',
    classification: 'operational-terminal-candidate',
    endpointReady: false,
    isActive: true,
    vehicleServices: ['bus', 'p2p'],
    approximateCoordinate: [120.9546, 14.8242],
    recommendedMapboxQuery: 'WalterMart Sta. Maria, Sta. Clara, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'approximate',
    confidence: 'likely',
    notes: 'Treat as an active pickup area for now. Until a distinct route branch is seeded, resolve it through the Sta. Maria Bayan operational corridor.',
    sourceLabel: 'CommuteTour, Precious Grace Transport',
    sourceUrl: 'https://ph.commutetour.com/travel/transport/bus/precious-grace-transport/',
    linkedTerminalId: 'sta-maria-bayan',
  },
  {
    id: 'new-santa-maria-jeepney-terminal',
    label: 'New Santa Maria Jeepney Terminal',
    classification: 'operational-terminal',
    endpointReady: true,
    isActive: true,
    vehicleServices: ['jeep'],
    approximateCoordinate: [120.9588, 14.8178],
    routeEndpointCoordinate: [120.9588, 14.8178],
    recommendedMapboxQuery: 'New Santa Maria Jeepney Terminal, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'confirmed',
    notes: 'Best current Sta. Maria proper jeepney endpoint anchor.',
    sourceLabel: 'Waze, New Santa Maria Jeepney Terminal',
    sourceUrl: 'https://www.waze.com/live-map/directions/ph/central-luzon/santa-maria/new-santa-maria-jeepney-terminal?to=place.ChIJebRBcbStlzMRZ8LZIhqjJ4s',
    linkedTerminalId: 'sta-maria-bayan',
  },
  {
    id: 'santa-maria-municipal-hall-public-market-route-point',
    label: 'Santa Maria Municipal Hall / Sta. Maria Public Market Route Point',
    classification: 'reference-route-point',
    endpointReady: false,
    isActive: true,
    vehicleServices: ['jeep'],
    approximateCoordinate: [120.9590, 14.8180],
    recommendedMapboxQuery: 'Santa Maria Municipal Hall, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'confirmed',
    notes: 'Strong town proper route anchor and transfer context point, but better treated as a route point than a formal terminal.',
    sourceLabel: 'Moovit, Sta. Maria to Malinta Jeep Route',
    sourceUrl: 'https://moovitapp.com/index/en/public_transit-line-jeep-Manila-1022-9969-7638328-0',
    linkedTerminalId: null,
  },
  {
    id: 'santa-maria-municipal-hall-to-monumento-caloocan-route-point',
    label: 'Santa Maria Municipal Hall to Monumento / Caloocan Route Point',
    classification: 'reference-route-point',
    endpointReady: false,
    isActive: true,
    vehicleServices: ['jeep'],
    approximateCoordinate: [120.9590, 14.8180],
    recommendedMapboxQuery: 'Santa Maria Municipal Hall, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'confirmed',
    notes: 'Same town proper anchor, but route-specific rather than a separate terminal.',
    sourceLabel: 'Moovit, Sta. Maria to Caloocan Jeep Route',
    sourceUrl: 'https://moovitapp.com/index/en/public_transit-line-jeep-Manila-1022-9969-7638245-0',
    linkedTerminalId: null,
  },
  {
    id: 'sta-maria-public-market-to-san-jose-del-monte-route-point',
    label: 'Sta. Maria Public Market to San Jose del Monte Route Point',
    classification: 'reference-route-point',
    endpointReady: false,
    isActive: true,
    vehicleServices: ['jeep'],
    approximateCoordinate: [120.9590, 14.8175],
    recommendedMapboxQuery: 'Sta. Maria Public Market, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'confirmed',
    notes: 'Useful route anchor for SJDM-bound flow, but should not become a standalone endpoint unless locally validated as a dispatch point.',
    sourceLabel: 'Moovit, Sta. Maria to SJDM Jeep Route',
    sourceUrl: 'https://moovitapp.com/index/en/public_transit-line-jeep-Manila-1022-9969-7638100-1',
    linkedTerminalId: null,
  },
  {
    id: 'halang-and-santa-maria-to-pandi-angat-baliuag-jeepney-terminal',
    label: 'Halang and Santa Maria to Pandi, Angat, Baliuag Jeepney Terminal',
    classification: 'operational-terminal-candidate',
    endpointReady: false,
    isActive: true,
    vehicleServices: ['jeep'],
    approximateCoordinate: [120.9594, 14.8218],
    recommendedMapboxQuery: 'Halang and Santa Maria to Pandi Angat Baliuag Jeepney Terminal, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'needs_field_validation',
    confidence: 'likely',
    notes: 'Promising candidate, but the exact active dispatch or loading point still needs stronger validation.',
    sourceLabel: 'Waze, Halang and Santa Maria to Pandi-Angat-Baliuag Jeepney Terminal',
    sourceUrl: 'https://www.waze.com/live-map/directions/ph/central-luzon/santa-maria/halang-and-santa-maria-to-pandi-angat-baliuag-jeepney-terminal?to=place.ChIJ3R02NgCtlzMRFg5IJpsBGM0',
    linkedTerminalId: 'halang-terminal',
  },
  {
    id: 'halang-terminal',
    label: 'Halang Terminal',
    classification: 'operational-terminal',
    endpointReady: true,
    isActive: true,
    vehicleServices: ['jeep'],
    approximateCoordinate: [120.9978, 14.8459],
    routeEndpointCoordinate: [120.9978, 14.8459],
    recommendedMapboxQuery: 'Halang Terminal, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'needs_field_validation',
    confidence: 'likely',
    notes: 'Current route-truth Halang endpoint used by the MVP route set. Candidate aliases can resolve through this terminal without losing a stable operational endpoint.',
    sourceLabel: 'LARGA route truth terminal seed',
    sourceUrl: 'internal://transport-catalog/halang-terminal',
    linkedTerminalId: 'halang-terminal',
  },
  {
    id: 'muzon-sta-maria-jeepney-terminal',
    label: 'Muzon-Sta. Maria Jeepney Terminal',
    classification: 'operational-terminal-candidate',
    endpointReady: false,
    isActive: true,
    vehicleServices: ['jeep'],
    approximateCoordinate: [121.03288, 14.8029],
    recommendedMapboxQuery: 'Muzon Sta. Maria Jeepney Terminal, San Jose del Monte, Bulacan, Philippines',
    coordinatePrecision: 'needs_field_validation',
    confidence: 'needs_verification',
    notes: 'Candidate external endpoint for the San Jose del Monte-side jeepney flow. Until a distinct Muzon route branch is seeded, resolve it through the San Jose operational corridor.',
    sourceLabel: 'Geoview, Muzon-Sta. Maria Jeepney Terminal',
    sourceUrl: 'https://ph.geoview.info/muzonsta_maria_jeepney_terminal%2C2091205724n',
    linkedTerminalId: 'san-jose-terminal',
  },
  {
    id: 'sapang-palay-sta-maria-jeep-terminal',
    label: 'Sapang Palay-Sta. Maria Jeep Terminal',
    classification: 'operational-terminal-candidate',
    endpointReady: false,
    isActive: true,
    vehicleServices: ['jeep'],
    approximateCoordinate: [121.050994, 14.849314],
    routeEndpointCoordinate: [121.050994, 14.849314],
    recommendedMapboxQuery: 'Victory Town Center Mall, Matiyaga Street, San Jose del Monte, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'likely',
    notes: 'Likely San Jose del Monte-side external endpoint that should share the same route-truth endpoint and visible terminal marker near Victory Town Center.',
    sourceLabel: 'Victory Town Center San Jose Bulacan, Matiyaga Street',
    sourceUrl: 'https://philippines.worldplaces.me/shopping-malls-in-san-jose-del-monte/52138547-victory-town-center-san-jose-bulacan.html',
    linkedTerminalId: 'san-jose-terminal',
  },
  {
    id: 'san-jose-terminal',
    label: 'San Jose Terminal',
    classification: 'operational-terminal',
    endpointReady: true,
    isActive: true,
    vehicleServices: ['jeep'],
    approximateCoordinate: [121.050994, 14.849314],
    routeEndpointCoordinate: [121.050994, 14.849314],
    recommendedMapboxQuery: 'Victory Town Center Mall, Matiyaga Street, San Jose del Monte, Bulacan, Philippines',
    coordinatePrecision: 'web_verified_candidate',
    confidence: 'likely',
    notes: 'Current route-truth San Jose endpoint used by the MVP route set. The road-following corridor should stay on the main road near Shell Patag and continue all the way to the terminal marker.',
    sourceLabel: 'Victory Town Center San Jose Bulacan, Matiyaga Street',
    sourceUrl: 'https://philippines.worldplaces.me/shopping-malls-in-san-jose-del-monte/52138547-victory-town-center-san-jose-bulacan.html',
    linkedTerminalId: 'san-jose-terminal',
  },
  {
    id: 'waltermart-sta-maria-sta-clara-route-point',
    label: 'WalterMart Sta. Maria / Sta. Clara Route Point',
    classification: 'reference-route-point',
    endpointReady: false,
    isActive: true,
    vehicleServices: ['mixed', 'jeep', 'bus', 'p2p'],
    approximateCoordinate: [120.9546, 14.8242],
    recommendedMapboxQuery: 'WalterMart Sta. Maria, Sta. Clara, Santa Maria, Bulacan, Philippines',
    coordinatePrecision: 'approximate',
    confidence: 'likely',
    notes: 'Good pickup and drop-off plus route context point. Keep out of route-truth endpoint logic until formal terminal status is validated.',
    sourceLabel: 'CommuteTour, WalterMart Sta. Maria Bulacan Terminal',
    sourceUrl: 'https://ph.commutetour.com/ph/terminal/waltermart-sta-maria-bulacan/',
    linkedTerminalId: null,
  },
  {
    id: 'truo-fx-terminal-bocaue',
    label: 'Truo FX Terminal, Bocaue',
    classification: 'operational-terminal-candidate',
    endpointReady: false,
    isActive: true,
    vehicleServices: ['uv', 'bus', 'jeep'],
    approximateCoordinate: null,
    recommendedMapboxQuery: 'Truo FX Terminal, Bocaue, Bulacan, Philippines',
    coordinatePrecision: 'approximate',
    confidence: 'likely',
    notes: 'Bocaue-side candidate anchor. Until a distinct Bocaue route branch is seeded, resolve it through the Sta. Maria Bayan operational corridor so the candidate remains usable without inventing a fake branch.',
    sourceLabel: 'Moovit, Sta. Maria-Bocaue Road Nearby Stations',
    sourceUrl: 'https://moovitapp.com/index/en/public_transit-Sta_Maria_Bocaue_Road-Manila-site_29503828-1022',
    linkedTerminalId: 'sta-maria-bayan',
  },
];

export const ENDPOINT_READY_TRANSPORT_LOCATION_SEED = TRANSPORT_LOCATION_INVENTORY_SEED.filter(
  (location) => location.endpointReady,
);

export function getTransportLocationById(locationId: string) {
  return TRANSPORT_LOCATION_INVENTORY_SEED.find((location) => location.id === locationId) ?? null;
}

function getRouteTruthTerminalLocation(terminalId: string) {
  const locationId = ROUTE_TRUTH_TERMINAL_LOCATION_IDS[terminalId as keyof typeof ROUTE_TRUTH_TERMINAL_LOCATION_IDS];

  if (!locationId) {
    throw new Error(`Missing route-truth terminal location mapping for ${terminalId}.`);
  }

  const location = getTransportLocationById(locationId);

  if (!location) {
    throw new Error(`Missing route-truth terminal location record for ${terminalId}.`);
  }

  return location;
}

export function getRouteTruthTerminalMarkerCoordinate(terminalId: string): RouteCoordinate {
  const location = getRouteTruthTerminalLocation(terminalId);

  if (!location.approximateCoordinate) {
    throw new Error(`Missing route-truth terminal marker coordinate for ${terminalId}.`);
  }

  return [...location.approximateCoordinate];
}

export function getRouteTruthTerminalCoordinate(terminalId: string): RouteCoordinate {
  const location = getRouteTruthTerminalLocation(terminalId);
  const coordinate = location.routeEndpointCoordinate ?? location.approximateCoordinate;

  if (!coordinate) {
    throw new Error(`Missing route-truth terminal endpoint coordinate for ${terminalId}.`);
  }

  return [...coordinate];
}

export const MAX_TERMINAL_ENDPOINT_ALIGNMENT_DISTANCE_METERS = 75;

export function getMaxTerminalEndpointAlignmentDistanceMeters(terminalId: string) {
  return MAX_TERMINAL_ENDPOINT_ALIGNMENT_DISTANCE_METERS;
}

export const REFERENCE_ROUTE_POINT_SEED = TRANSPORT_LOCATION_INVENTORY_SEED.filter(
  (location) => location.classification === 'reference-route-point',
);

export const ENDPOINT_READY_TERMINAL_IDS = new Set(
  TRANSPORT_LOCATION_INVENTORY_SEED.flatMap((location) => (
    location.endpointReady && location.linkedTerminalId ? [location.linkedTerminalId] : []
  )),
);

export const SELECTABLE_TERMINAL_IDS = new Set(
  TRANSPORT_LOCATION_INVENTORY_SEED.flatMap((location) => (
    location.classification !== 'reference-route-point' && location.linkedTerminalId
      ? [location.linkedTerminalId]
      : []
  )),
);

const INVENTORY_LINKED_TERMINAL_IDS = new Set(
  TRANSPORT_LOCATION_INVENTORY_SEED.flatMap((location) => (
    location.linkedTerminalId ? [location.linkedTerminalId] : []
  )),
);

const CANONICAL_ROUTE_TRUTH_LOCATION_IDS = new Set<string>(
  Object.values(ROUTE_TRUTH_TERMINAL_LOCATION_IDS),
);

export function isEndpointReadyTerminalId(terminalId: string) {
  if (!INVENTORY_LINKED_TERMINAL_IDS.has(terminalId)) {
    return true;
  }

  return ENDPOINT_READY_TERMINAL_IDS.has(terminalId);
}

export function isSelectableTerminalId(terminalId: string) {
  if (!INVENTORY_LINKED_TERMINAL_IDS.has(terminalId)) {
    return true;
  }

  return SELECTABLE_TERMINAL_IDS.has(terminalId);
}

export function filterEndpointReadyTerminalOptions(terminals: TerminalOption[]) {
  return terminals.filter((terminal) => isEndpointReadyTerminalId(terminal.id));
}

export function filterSelectableTerminalOptions(terminals: TerminalOption[]) {
  return terminals.filter((terminal) => isSelectableTerminalId(terminal.id));
}

export function getSelectableInventoryLocationsForTerminalIds(terminalIds: Set<string>) {
  return TRANSPORT_LOCATION_INVENTORY_SEED.filter((location) => (
    location.classification !== 'reference-route-point'
    && location.linkedTerminalId !== null
    && terminalIds.has(location.linkedTerminalId)
    && (
      location.classification === 'operational-terminal-candidate'
      || !CANONICAL_ROUTE_TRUTH_LOCATION_IDS.has(location.linkedTerminalId)
      || location.id === location.linkedTerminalId
    )
  ));
}
