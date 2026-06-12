import {
  buildReverseDriverSelection,
  createEmptyDriverSelection,
  type DriverSelectionState,
  type RouteRecord,
} from '@/lib/domain/transport';
import type { ActiveTripState } from '@/services/contracts/live-data';

export interface PersistedActiveTripRecord {
  driverId?: unknown;
  routeId?: unknown;
  originTerminalId?: unknown;
  destinationTerminalId?: unknown;
  originLocationId?: unknown;
  destinationLocationId?: unknown;
  routeProgressSegmentIndex?: unknown;
  status?: unknown;
  startedAt?: unknown;
  updatedAt?: unknown;
}

interface DriverSelectionLocationState {
  originLocationId: string | null;
  destinationLocationId: string | null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function buildActiveTripPayload(
  driverId: string,
  route: Pick<RouteRecord, 'id' | 'originTerminalId' | 'destinationTerminalId'>,
  startedAt: string,
  selection: DriverSelectionLocationState,
) {
  return {
    driverId,
    routeId: route.id,
    originTerminalId: route.originTerminalId,
    destinationTerminalId: route.destinationTerminalId,
    originLocationId: selection.originLocationId,
    destinationLocationId: selection.destinationLocationId,
    routeProgressSegmentIndex: null,
    status: 'active' as const,
    startedAt,
    updatedAt: startedAt,
  };
}

export function resolveEndedTripDriverSelection(
  currentActiveTrip: Pick<
    ActiveTripState,
    'originTerminalId' | 'destinationTerminalId' | 'originLocationId' | 'destinationLocationId'
  > | null,
  tripRecord: Pick<
    PersistedActiveTripRecord,
    'originTerminalId' | 'destinationTerminalId' | 'originLocationId' | 'destinationLocationId'
  >,
): DriverSelectionState {
  const endedOriginTerminalId = currentActiveTrip?.originTerminalId
    ?? readOptionalString(tripRecord.originTerminalId);
  const endedDestinationTerminalId = currentActiveTrip?.destinationTerminalId
    ?? readOptionalString(tripRecord.destinationTerminalId);

  if (!endedOriginTerminalId || !endedDestinationTerminalId) {
    return createEmptyDriverSelection();
  }

  const endedOriginLocationId = currentActiveTrip?.originLocationId
    ?? readOptionalString(tripRecord.originLocationId);
  const endedDestinationLocationId = currentActiveTrip?.destinationLocationId
    ?? readOptionalString(tripRecord.destinationLocationId);

  return buildReverseDriverSelection(
    endedOriginTerminalId,
    endedDestinationTerminalId,
    endedOriginLocationId,
    endedDestinationLocationId,
  );
}
