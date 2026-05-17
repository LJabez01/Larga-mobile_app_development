// Live Data Contracts - defines the shared types and service interface for trip state.
import type { NotificationItem } from '@/services/contracts/notifications';
import type { DriverSelectionState, RouteRecord, TerminalOption, VehicleType } from '@/lib/domain/transport';

export interface VehicleMarker {
  id: string;
  type: VehicleType;
  coordinate: [number, number];
  routeId: string;
  routeLabel: string;
  fare: string;
  speed: string;
  distance: string;
  eta: string;
}

export interface ActiveTripState {
  id: string;
  routeId: string;
  routeLabel: string;
  originTerminalId: string;
  destinationTerminalId: string;
  vehicleId: string;
  startedAt: string;
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

export interface LiveDataSnapshot {
  terminals: TerminalOption[];
  routes: RouteRecord[];
  activeTrip: ActiveTripState | null;
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
  selectDriverTerminals(originTerminalId: string | null, destinationTerminalId: string | null): Promise<LiveDataSnapshot>;
  startTrip(): Promise<LiveDataSnapshot>;
  endTrip(): Promise<LiveDataSnapshot>;
  publishDriverLocation(input: PublishDriverLocationInput): Promise<LiveDataSnapshot>;
  reset(): Promise<LiveDataSnapshot>;
}
