import { getRouteFareStopOptions } from '@/lib/domain/commuter-fare';
import type { CommuterVisibleVehicle } from '@/lib/domain/commuter-visibility';
import type { CommuterRideSelectionState } from '@/services/contracts/live-data';

function getResolvedSelectedVehicle(
  selectedVehicleId: string | null,
  visibleVehicles: ReadonlyArray<CommuterVisibleVehicle>,
) {
  if (!selectedVehicleId) {
    return null;
  }

  return visibleVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;
}

export function resolveSelectedCommuterRideVehicle(
  visibleVehicles: ReadonlyArray<CommuterVisibleVehicle>,
  selectedVehicleId: string | null,
) {
  return getResolvedSelectedVehicle(selectedVehicleId, visibleVehicles)
    ?? visibleVehicles[0]
    ?? null;
}

function normalizeFareSelectionForRoute(
  selection: CommuterRideSelectionState,
  routeId: string,
): CommuterRideSelectionState {
  const fareStopOptions = getRouteFareStopOptions(routeId);

  if (fareStopOptions.length === 0) {
    return {
      selectedVehicleId: selection.selectedVehicleId,
      fareOriginLocationId: null,
      fareDestinationLocationId: null,
    };
  }

  const fareStopOrderByLocationId = new Map(
    fareStopOptions.map((option) => [option.locationId, option.orderIndex]),
  );

  const fareOriginLocationId = selection.fareOriginLocationId
    && fareStopOrderByLocationId.has(selection.fareOriginLocationId)
    ? selection.fareOriginLocationId
    : null;
  let fareDestinationLocationId = selection.fareDestinationLocationId
    && fareStopOrderByLocationId.has(selection.fareDestinationLocationId)
    ? selection.fareDestinationLocationId
    : null;

  if (fareOriginLocationId && fareDestinationLocationId) {
    const fareOriginOrder = fareStopOrderByLocationId.get(fareOriginLocationId) ?? null;
    const fareDestinationOrder = fareStopOrderByLocationId.get(fareDestinationLocationId) ?? null;

    if (
      fareOriginOrder === null
      || fareDestinationOrder === null
      || fareOriginOrder >= fareDestinationOrder
    ) {
      fareDestinationLocationId = null;
    }
  }

  return {
    selectedVehicleId: selection.selectedVehicleId,
    fareOriginLocationId,
    fareDestinationLocationId,
  };
}

export function createEmptyCommuterRideSelection(): CommuterRideSelectionState {
  return {
    selectedVehicleId: null,
    fareOriginLocationId: null,
    fareDestinationLocationId: null,
  };
}

export function reconcileCommuterRideSelection(
  selection: CommuterRideSelectionState,
  visibleVehicles: ReadonlyArray<CommuterVisibleVehicle>,
): CommuterRideSelectionState {
  const selectedVehicle = getResolvedSelectedVehicle(selection.selectedVehicleId, visibleVehicles);

  if (!selectedVehicle) {
    return createEmptyCommuterRideSelection();
  }

  return normalizeFareSelectionForRoute({
    ...selection,
    selectedVehicleId: selectedVehicle.id,
  }, selectedVehicle.routeId);
}

export function selectCommuterRideVehicle(
  selection: CommuterRideSelectionState,
  visibleVehicles: ReadonlyArray<CommuterVisibleVehicle>,
  selectedVehicleId: string | null,
): CommuterRideSelectionState {
  if (selectedVehicleId === null) {
    return createEmptyCommuterRideSelection();
  }

  return reconcileCommuterRideSelection({
    ...selection,
    selectedVehicleId,
  }, visibleVehicles);
}

export function setCommuterRideFareOrigin(
  selection: CommuterRideSelectionState,
  visibleVehicles: ReadonlyArray<CommuterVisibleVehicle>,
  fareOriginLocationId: string | null,
): CommuterRideSelectionState {
  return reconcileCommuterRideSelection({
    ...selection,
    fareOriginLocationId,
  }, visibleVehicles);
}

export function setCommuterRideFareDestination(
  selection: CommuterRideSelectionState,
  visibleVehicles: ReadonlyArray<CommuterVisibleVehicle>,
  fareDestinationLocationId: string | null,
): CommuterRideSelectionState {
  return reconcileCommuterRideSelection({
    ...selection,
    fareDestinationLocationId,
  }, visibleVehicles);
}
