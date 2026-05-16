import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createEmptyDriverSelection } from '@/lib/domain/transport';
import type { LiveDataSnapshot, PublishDriverLocationInput } from '@/services/contracts/live-data';
import { liveDataService } from '@/services/live-data';
import { ROUTE_FIXTURES, TERMINAL_FIXTURES } from '@/services/fixtures/routes';

interface LiveDataContextValue {
  snapshot: LiveDataSnapshot;
  selectDriverTerminals: (originTerminalId: string | null, destinationTerminalId: string | null) => Promise<LiveDataSnapshot>;
  startTrip: () => Promise<LiveDataSnapshot>;
  endTrip: () => Promise<LiveDataSnapshot>;
  publishDriverLocation: (input: PublishDriverLocationInput) => Promise<LiveDataSnapshot>;
  reset: () => Promise<LiveDataSnapshot>;
}

const fallbackSnapshot: LiveDataSnapshot = {
  terminals: TERMINAL_FIXTURES.map((terminal) => ({ ...terminal })),
  routes: ROUTE_FIXTURES.map((route) => ({ ...route })),
  activeTrip: null,
  vehicles: [],
  driverSelection: createEmptyDriverSelection(),
  notificationsByRole: {
    commuter: [],
    driver: [],
  },
};

const LiveDataContext = createContext<LiveDataContextValue | undefined>(undefined);

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LiveDataSnapshot>(fallbackSnapshot);

  useEffect(() => {
    let mounted = true;

    liveDataService.getSnapshot().then((nextSnapshot) => {
      if (mounted) {
        setSnapshot(nextSnapshot);
      }
    });

    const unsubscribe = liveDataService.subscribe((nextSnapshot) => {
      if (mounted) {
        setSnapshot(nextSnapshot);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<LiveDataContextValue>(
    () => ({
      snapshot,
      selectDriverTerminals: liveDataService.selectDriverTerminals,
      startTrip: liveDataService.startTrip,
      endTrip: liveDataService.endTrip,
      publishDriverLocation: liveDataService.publishDriverLocation,
      reset: liveDataService.reset,
    }),
    [snapshot],
  );

  return (
    <LiveDataContext.Provider value={value}>
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData() {
  const context = useContext(LiveDataContext);

  if (!context) {
    throw new Error('useLiveData must be used within LiveDataProvider.');
  }

  return context;
}
