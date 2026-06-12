// Live Data Provider - exposes shared trip, route, and vehicle state.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createEmptyDriverSelection } from '@/lib/domain/transport';
import type {
  DriverTerminalSelectionInput,
  LiveDataSnapshot,
  PublishCommuterPresenceInput,
  PublishDriverLocationInput,
  StartTripInput,
} from '@/services/contracts/live-data';
import { liveDataService } from '@/services/live-data';
import { ROUTE_FIXTURES, TERMINAL_FIXTURES } from '@/services/fixtures/routes';

interface LiveDataContextValue {
  snapshot: LiveDataSnapshot;
  isHydrated: boolean;
  selectDriverTerminals: (input: DriverTerminalSelectionInput) => Promise<LiveDataSnapshot>;
  selectCommuterVehicle: (vehicleId: string | null) => Promise<LiveDataSnapshot>;
  setCommuterFareOrigin: (locationId: string | null) => Promise<LiveDataSnapshot>;
  setCommuterFareDestination: (locationId: string | null) => Promise<LiveDataSnapshot>;
  startTrip: (input?: StartTripInput) => Promise<LiveDataSnapshot>;
  endTrip: () => Promise<LiveDataSnapshot>;
  publishDriverLocation: (input: PublishDriverLocationInput) => Promise<LiveDataSnapshot>;
  publishCommuterPresence: (input: PublishCommuterPresenceInput) => Promise<LiveDataSnapshot>;
  clearCommuterPresence: () => Promise<LiveDataSnapshot>;
  reset: () => Promise<LiveDataSnapshot>;
}

const fallbackSnapshot: LiveDataSnapshot = {
  terminals: TERMINAL_FIXTURES.map((terminal) => ({ ...terminal })),
  routes: ROUTE_FIXTURES.map((route) => ({ ...route })),
  activeTrip: null,
  driverGuidance: null,
  commuterPresence: null,
  commuterVisibleVehicles: [],
  driverVisibleCommuters: [],
  vehicles: [],
  commuterRideSelection: {
    selectedVehicleId: null,
    fareOriginLocationId: null,
    fareDestinationLocationId: null,
  },
  driverSelection: createEmptyDriverSelection(),
  notificationsByRole: {
    commuter: [],
    driver: [],
  },
};

const LiveDataContext = createContext<LiveDataContextValue | undefined>(undefined);

// Live Data Provider - hydrates live route/trip state and exposes live-data actions to map screens.
export function LiveDataProvider({ children }: { children: ReactNode }) {
  // Live Snapshot State - stores the current live-data view used by the app screens.
  const [snapshot, setSnapshot] = useState<LiveDataSnapshot>(fallbackSnapshot);
  const [isHydrated, setIsHydrated] = useState(false);

  // Live Data Sync - hydrates the initial snapshot and subscribes to future updates.
  useEffect(() => {
    let mounted = true;

    liveDataService.getSnapshot().then((nextSnapshot) => {
      if (mounted) {
        setSnapshot(nextSnapshot);
        setIsHydrated(true);
      }
    });

    const unsubscribe = liveDataService.subscribe((nextSnapshot) => {
      if (mounted) {
        setSnapshot(nextSnapshot);
        setIsHydrated(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Context Value - exposes the current snapshot together with live-data actions.
  const value = useMemo<LiveDataContextValue>(
    () => ({
      snapshot,
      isHydrated,
      selectDriverTerminals: liveDataService.selectDriverTerminals,
      selectCommuterVehicle: liveDataService.selectCommuterVehicle,
      setCommuterFareOrigin: liveDataService.setCommuterFareOrigin,
      setCommuterFareDestination: liveDataService.setCommuterFareDestination,
      startTrip: liveDataService.startTrip,
      endTrip: liveDataService.endTrip,
      publishDriverLocation: liveDataService.publishDriverLocation,
      publishCommuterPresence: liveDataService.publishCommuterPresence,
      clearCommuterPresence: liveDataService.clearCommuterPresence,
      reset: liveDataService.reset,
    }),
    [isHydrated, snapshot],
  );

  return (
    <LiveDataContext.Provider value={value}>
      {children}
    </LiveDataContext.Provider>
  );
}

// Live Data Hook - reads the shared live-data context for driver and commuter experiences.
export function useLiveData() {
  // Context Guard - ensures live-data consumers are used inside the provider tree.
  const context = useContext(LiveDataContext);

  if (!context) {
    throw new Error('useLiveData must be used within LiveDataProvider.');
  }

  return context;
}
