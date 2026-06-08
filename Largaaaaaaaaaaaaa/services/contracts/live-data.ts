// Live Data Contracts - defines the shared types and service interface for trip state.
import type { NotificationItem } from '@/services/contracts/notifications';
import type {
  CommuterPresenceRecord,
  CommuterReferenceSource,
  CommuterVisibleVehicle,
  DriverVisibleCommuter,
} from '@/lib/domain/commuter-visibility';
import type {
  DriverGuidanceState,
  DriverLocationStatus,
  DriverSelectionState,
  RouteRecord,
  TerminalOption,
  VehicleType,
} from '@/lib/domain/transport';

export interface VehicleMarker {
  id: string;
  type: VehicleType;
  coordinate: [number, number];
  routeId: string;
  routeLabel: string;
  recordedAt: string;
  fare: string;
  speed: string;
  speedKph: number | null;
  distance: string;
  eta: string;
}

export interface ActiveTripState {
  id: string;
  routeId: string;
  routeLabel: string;
  originTerminalId: string;
  destinationTerminalId: string;
  originLocationId: string | null;
  destinationLocationId: string | null;
  vehicleId: string;
  startedAt: string;
  lastLocationRecordedAt: string | null;
  locationStatus: DriverLocationStatus;
  routeProgressSegmentIndex: number | null;
}

export interface DriverTerminalSelectionInput {
  originTerminalId: string | null;
  destinationTerminalId: string | null;
  originLocationId?: string | null;
  destinationLocationId?: string | null;
}

export interface PublishDriverLocationInput {
  routeId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recordedAt?: string;
}

export interface StartTripInput {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recordedAt?: string;
}

export interface PublishCommuterPresenceInput {
  latitude: number;
  longitude: number;
  referenceSource: CommuterReferenceSource;
  recordedAt?: string;
}

export interface LiveDataSnapshot {
  terminals: TerminalOption[];
  routes: RouteRecord[];
  activeTrip: ActiveTripState | null;
  driverGuidance: DriverGuidanceState | null;
  commuterPresence: CommuterPresenceRecord | null;
  commuterVisibleVehicles: CommuterVisibleVehicle[];
  driverVisibleCommuters: DriverVisibleCommuter[];
  vehicles: VehicleMarker[];
  driverSelection: DriverSelectionState;
  notificationsByRole: {
    commuter: NotificationItem[];
    driver: NotificationItem[];
  };
}

export interface LiveDataService {
  getSnapshot(): Promise<LiveDataSnapshot>;
  subscribe(listener: (snapshot: LiveDataSnapshot) => void): () => void;
  selectDriverTerminals(input: DriverTerminalSelectionInput): Promise<LiveDataSnapshot>;
  startTrip(input?: StartTripInput): Promise<LiveDataSnapshot>;
  endTrip(): Promise<LiveDataSnapshot>;
  publishDriverLocation(input: PublishDriverLocationInput): Promise<LiveDataSnapshot>;
  publishCommuterPresence(input: PublishCommuterPresenceInput): Promise<LiveDataSnapshot>;
  clearCommuterPresence(): Promise<LiveDataSnapshot>;
  reset(): Promise<LiveDataSnapshot>;
}
