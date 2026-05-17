// Mock Live Data Store - keeps in-memory trip, route, and vehicle state for mock mode.
import { DRIVER_NOTIFICATIONS, COMMUTER_NOTIFICATIONS } from '@/services/fixtures/notifications';
import { ROUTE_FIXTURES, TERMINAL_FIXTURES } from '@/services/fixtures/routes';
import { VEHICLE_FIXTURES } from '@/services/fixtures/vehicles';
import { createEmptyDriverSelection, resolveRouteForTerminals } from '@/lib/domain/transport';
import type { ActiveTripState, LiveDataSnapshot, PublishDriverLocationInput, VehicleMarker } from '@/services/contracts/live-data';

const listeners = new Set<(snapshot: LiveDataSnapshot) => void>();

// Default Snapshot Builder - creates the initial mock route, vehicle, and notification state.
function buildDefaultSnapshot(): LiveDataSnapshot {
  return {
    terminals: TERMINAL_FIXTURES.map((terminal) => ({ ...terminal })),
    routes: ROUTE_FIXTURES.map((route) => ({ ...route })),
    activeTrip: null,
    vehicles: [],
    driverSelection: createEmptyDriverSelection(),
    notificationsByRole: {
      commuter: COMMUTER_NOTIFICATIONS.map((notification) => ({ ...notification })),
      driver: DRIVER_NOTIFICATIONS.map((notification) => ({ ...notification })),
    },
  };
}

let currentSnapshot = buildDefaultSnapshot();

// Snapshot Broadcast - sends the latest mock snapshot to all live-data subscribers.
function notify() {
  listeners.forEach((listener) => listener(currentSnapshot));
}

function updateSnapshot(nextSnapshot: LiveDataSnapshot): LiveDataSnapshot {
  currentSnapshot = nextSnapshot;
  notify();
  return currentSnapshot;
}

// Vehicle Fixture Helper - clones the route-specific mock vehicle before mutations.
function cloneVehicle(routeId: string): VehicleMarker {
  const vehicle = VEHICLE_FIXTURES[routeId];

  if (!vehicle) {
    throw new Error('No mock vehicle fixture exists for the selected route.');
  }

  return {
    ...vehicle,
    coordinate: [...vehicle.coordinate] as [number, number],
  };
}

// Mock Live Data Adapter - exposes route selection, trip control, and reset helpers.
export const mockLiveDataStore = {
  getSnapshot(): LiveDataSnapshot {
    return currentSnapshot;
  },

  subscribe(listener: (snapshot: LiveDataSnapshot) => void) {
    listeners.add(listener);
    listener(currentSnapshot);

    return () => {
      listeners.delete(listener);
    };
  },

  selectDriverTerminals(originTerminalId: string | null, destinationTerminalId: string | null) {
    const route = resolveRouteForTerminals(currentSnapshot.routes, originTerminalId, destinationTerminalId);

    return updateSnapshot({
      ...currentSnapshot,
      driverSelection: {
        originTerminalId,
        destinationTerminalId,
        resolvedRouteId: route?.id ?? null,
        resolvedRouteLabel: route?.label ?? null,
      },
    });
  },

  startTrip() {
    const route = resolveRouteForTerminals(
      currentSnapshot.routes,
      currentSnapshot.driverSelection.originTerminalId,
      currentSnapshot.driverSelection.destinationTerminalId,
    );

    if (!route) {
      throw new Error('Select two different terminals with a supported route before starting a trip.');
    }

    const vehicle = cloneVehicle(route.id);
    const nextTrip: ActiveTripState = {
      id: `mock-trip-${route.id}`,
      routeId: route.id,
      routeLabel: route.label,
      originTerminalId: route.originTerminalId,
      destinationTerminalId: route.destinationTerminalId,
      vehicleId: vehicle.id,
      startedAt: new Date().toISOString(),
    };

    return updateSnapshot({
      ...currentSnapshot,
      driverSelection: {
        originTerminalId: route.originTerminalId,
        destinationTerminalId: route.destinationTerminalId,
        resolvedRouteId: route.id,
        resolvedRouteLabel: route.label,
      },
      activeTrip: nextTrip,
      vehicles: [vehicle],
    });
  },

  endTrip() {
    return updateSnapshot({
      ...currentSnapshot,
      activeTrip: null,
      vehicles: [],
    });
  },

  publishDriverLocation(input: PublishDriverLocationInput) {
    const activeTrip = currentSnapshot.activeTrip;

    if (!activeTrip) {
      throw new Error('Start a mock trip before publishing a location update.');
    }

    if (input.routeId !== activeTrip.routeId) {
      throw new Error('Location updates must match the active route.');
    }

    const vehicle = VEHICLE_FIXTURES[activeTrip.routeId];

    if (!vehicle) {
      throw new Error('No mock vehicle fixture exists for the active route.');
    }

    return updateSnapshot({
      ...currentSnapshot,
      vehicles: [
        {
          ...vehicle,
          coordinate: [input.longitude, input.latitude],
        },
      ],
    });
  },

  reset() {
    return updateSnapshot(buildDefaultSnapshot());
  },
};
