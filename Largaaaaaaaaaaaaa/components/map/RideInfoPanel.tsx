// Ride Info Panel - shows live selected vehicle details beneath the commuter map.
import React, { useMemo, useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { FareStopOption } from '@/lib/domain/commuter-fare';
import type {
  CommuterReferenceSource,
  CommuterVisibleVehicle,
} from '@/lib/domain/commuter-visibility';
import type { FareResolution } from '@/lib/domain/fare-resolution';
import { styles } from './ride-info-panel.styles';

export type VehicleTypeFilter = 'all' | 'bus' | 'jeep';
type FareMode = 'normal' | 'discounted';

type RideInfoPanelProps = {
  vehicle: CommuterVisibleVehicle | null;
  fareStopOptions: readonly FareStopOption[];
  fareOriginLocationId: string | null;
  fareDestinationLocationId: string | null;
  onFareOriginChange: (locationId: string | null) => void;
  onFareDestinationChange: (locationId: string | null) => void;
  fareResolution: FareResolution | null;
  vehicleTypeFilter: VehicleTypeFilter;
  onVehicleTypeFilterChange: (filter: VehicleTypeFilter) => void;
  isCollapsed: boolean;
  onCollapsedChange: (isCollapsed: boolean) => void;
  routeContextLabel: string | null;
  vehicleCount: number;
  totalVehicleCount: number;
  hasCommuterPresence: boolean;
  isPresenceLoading: boolean;
  statusMessage: string;
  referenceSource: CommuterReferenceSource | null;
  showReferenceAction: boolean;
  onReferenceActionPress: () => void;
  referenceActionDisabled: boolean;
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const FILTER_OPTIONS: Array<{ label: string; value: VehicleTypeFilter; icon: IoniconName }> = [
  { label: 'All', value: 'all', icon: 'layers-outline' },
  { label: 'Bus', value: 'bus', icon: 'bus-outline' },
  { label: 'Jeep', value: 'jeep', icon: 'car-sport-outline' },
];

function formatFare(amount: number | null) {
  if (amount === null) {
    return 'Updating';
  }

  return `PHP ${amount.toFixed(2)}`;
}

function formatSpeed(speedKph: number | null) {
  if (speedKph === null || !Number.isFinite(speedKph)) {
    return 'Updating';
  }

  return `${Math.round(speedKph)} km/h`;
}

function formatDistance(distanceMeters: number | null | undefined) {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
    return 'Updating';
  }

  if (distanceMeters < 1000) {
    return `${Math.max(Math.round(distanceMeters), 0)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatEta(etaMinutes: number | null | undefined) {
  if (typeof etaMinutes !== 'number' || !Number.isFinite(etaMinutes)) {
    return 'Updating';
  }

  return `${Math.max(Math.round(etaMinutes), 1)} mins`;
}

function getVehicleLabel(vehicle: CommuterVisibleVehicle | null) {
  if (!vehicle) {
    return 'No vehicle selected';
  }

  return vehicle.type === 'bus' ? 'Bus' : 'Jeep';
}

function getSelectedFareAmount(
  fareResolution: FareResolution | null,
  fareMode: FareMode,
) {
  if (!fareResolution || fareResolution.status !== 'ready') {
    return null;
  }

  return fareMode === 'discounted'
    ? fareResolution.discountedFare
    : fareResolution.baseFare;
}

function getFareStatusLabel(
  vehicle: CommuterVisibleVehicle | null,
  fareStopOptions: readonly FareStopOption[],
  fareResolution: FareResolution | null,
) {
  if (!vehicle) {
    return 'Select a live vehicle';
  }

  if (fareStopOptions.length === 0) {
    return 'Fare unavailable';
  }

  switch (fareResolution?.status) {
    case 'ready':
      return null;
    case 'missing_destination':
      return 'Select destination';
    case 'same_origin_destination':
      return 'Choose different stops';
    case 'destination_before_origin':
      return 'Destination must be ahead';
    case 'origin_not_on_route':
    case 'destination_not_on_route':
      return 'Refresh fare stops';
    case 'route_not_fare_enabled':
    case 'tariff_not_configured':
    case 'invalid_vehicle_type':
      return 'Fare unavailable';
    case 'missing_origin':
    default:
      return 'Select origin';
  }
}

function getFareSupportText(
  vehicle: CommuterVisibleVehicle | null,
  fareStopOptions: readonly FareStopOption[],
  fareResolution: FareResolution | null,
) {
  if (!vehicle) {
    return 'Fare starts after you choose a live bus or jeep.';
  }

  if (fareStopOptions.length === 0) {
    return 'This route does not have seeded fare stops yet.';
  }

  switch (fareResolution?.status) {
    case 'ready':
      return 'Computed from the selected route direction and fare stops.';
    case 'missing_destination':
      return 'Choose where you plan to get off.';
    case 'same_origin_destination':
      return 'Your boarding and drop-off points should not match.';
    case 'destination_before_origin':
      return 'Pick a destination that comes after your boarding point.';
    case 'origin_not_on_route':
    case 'destination_not_on_route':
      return 'Your previous fare stop selection is no longer valid for this route.';
    case 'route_not_fare_enabled':
    case 'tariff_not_configured':
    case 'invalid_vehicle_type':
      return 'Fare computation is not available for this vehicle right now.';
    case 'missing_origin':
    default:
      return 'Choose your boarding and drop-off points.';
  }
}

// Ride Info Panel - displays selected live vehicle data and route/type controls.
export default function RideInfoPanel({
  vehicle,
  fareStopOptions,
  fareOriginLocationId,
  fareDestinationLocationId,
  onFareOriginChange,
  onFareDestinationChange,
  fareResolution,
  vehicleTypeFilter,
  onVehicleTypeFilterChange,
  isCollapsed,
  onCollapsedChange,
  routeContextLabel,
  vehicleCount,
  totalVehicleCount,
  hasCommuterPresence,
  isPresenceLoading,
  statusMessage,
  referenceSource,
  showReferenceAction,
  onReferenceActionPress,
  referenceActionDisabled,
}: RideInfoPanelProps) {
  const [fareMode, setFareMode] = useState<FareMode>('normal');
  const fareStopOrderByLocationId = useMemo(
    () => new Map(fareStopOptions.map((option) => [option.locationId, option.orderIndex])),
    [fareStopOptions],
  );
  const currentFare = getSelectedFareAmount(fareResolution, fareMode);
  const fareStatusLabel = getFareStatusLabel(vehicle, fareStopOptions, fareResolution);
  const fareSupportText = getFareSupportText(vehicle, fareStopOptions, fareResolution);
  const routeLabel = vehicle?.routeLabel ?? routeContextLabel ?? 'Set your pickup point';
  const vehicleLabel = getVehicleLabel(vehicle);
  const isAvailable = Boolean(vehicle);
  const availabilityLabel = isPresenceLoading
    ? 'Updating'
    : isAvailable
      ? 'Available'
      : hasCommuterPresence
        ? 'Waiting'
        : 'Set point';
  const referenceActionLabel = referenceSource === 'manual'
    ? 'Use live'
    : 'Set point';
  const referenceActionIcon: IoniconName = referenceSource === 'manual'
    ? 'navigate-outline'
    : 'locate-outline';

  if (isCollapsed) {
    return (
      <View style={[styles.panel, styles.panelCollapsed]}>
        <Pressable
          style={styles.panelHandleButton}
          onPress={() => onCollapsedChange(false)}
          accessibilityRole="button"
          accessibilityLabel="Expand ride information panel"
        >
          <View style={styles.handle} />
          <View style={styles.collapsedPanelRow}>
            <View style={styles.collapsedIconWrap}>
              <Ionicons name={vehicle?.type === 'bus' ? 'bus-outline' : 'car-sport-outline'} size={18} color="#10b981" />
            </View>
            <View style={styles.collapsedTextBlock}>
              <Text style={styles.collapsedEyebrow} numberOfLines={1}>
                {vehicle ? vehicleLabel : availabilityLabel}
              </Text>
              <Text style={styles.collapsedRouteLabel} numberOfLines={1}>
                {routeLabel}
              </Text>
            </View>
            <View style={styles.collapsedMetricBlock}>
              <Text style={styles.collapsedMetricValue}>{formatEta(vehicle?.etaMinutes)}</Text>
              <Text style={styles.collapsedMetricLabel}>ETA</Text>
            </View>
            <Ionicons name="chevron-up" size={18} color="#94a3b8" />
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Pressable
        style={styles.panelHandleButton}
        onPress={() => onCollapsedChange(true)}
        accessibilityRole="button"
        accessibilityLabel="Collapse ride information panel"
      >
        <View style={styles.handle} />
        <View style={styles.panelHandleLabelRow}>
          <Text style={styles.panelHandleLabel}>Minimize</Text>
          <Ionicons name="chevron-down" size={15} color="#94a3b8" />
        </View>
      </Pressable>

      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((option) => {
          const active = vehicleTypeFilter === option.value;

          return (
            <Pressable
              key={option.value}
              style={[styles.filterButton, active && styles.filterButtonActive]}
              onPress={() => onVehicleTypeFilterChange(option.value)}
            >
              <Ionicons
                name={option.icon}
                size={15}
                color={active ? '#ffffff' : '#10b981'}
              />
              <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.headerRow}>
        <View style={styles.routeIconWrap}>
          <Ionicons name="location-outline" size={28} color="#10b981" />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>
            {vehicle ? vehicleLabel : 'ROUTE'}
          </Text>
          <Text style={styles.routeLabel} numberOfLines={1}>
            {routeLabel}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <View style={[styles.availabilityPill, !isAvailable && styles.availabilityPillMuted]}>
            <View style={[styles.availabilityDot, !isAvailable && styles.availabilityDotMuted]} />
            <Text style={[styles.availabilityText, !isAvailable && styles.availabilityTextMuted]}>
              {availabilityLabel}
            </Text>
          </View>
          {showReferenceAction ? (
            <Pressable
              style={[
                styles.referenceActionButton,
                referenceActionDisabled && styles.referenceActionButtonDisabled,
              ]}
              onPress={onReferenceActionPress}
              disabled={referenceActionDisabled}
              accessibilityRole="button"
              accessibilityLabel={referenceActionLabel}
            >
              <Ionicons
                name={referenceActionIcon}
                size={13}
                color={referenceActionDisabled ? '#94a3b8' : '#10b981'}
              />
              <Text
                style={[
                  styles.referenceActionText,
                  referenceActionDisabled && styles.referenceActionTextDisabled,
                ]}
              >
                {referenceActionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.metricGrid}>
        <View style={styles.metricItem}>
          <Ionicons name="flash-outline" size={25} color="#10b981" />
          <Text style={styles.metricValue}>{formatSpeed(vehicle?.speedKph ?? null)}</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Ionicons name="navigate-outline" size={25} color="#10b981" />
          <Text style={styles.metricValue}>{formatDistance(vehicle?.distanceMeters)}</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Ionicons name="time-outline" size={25} color="#10b981" />
          <Text style={styles.metricValue}>{formatEta(vehicle?.etaMinutes)}</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusText} numberOfLines={2}>
          {statusMessage}
        </Text>
        <Text style={styles.countText}>
          {vehicleCount}/{totalVehicleCount}
        </Text>
      </View>

      <View style={styles.fareSelectionCard}>
        <View style={styles.fareSelectionRow}>
          <Text style={styles.fareSelectionLabel}>Boarding point</Text>
          <View style={styles.fareStopButtonGrid}>
            {fareStopOptions.length > 0 ? fareStopOptions.map((option) => {
              const destinationOrder = fareDestinationLocationId
                ? fareStopOrderByLocationId.get(fareDestinationLocationId) ?? null
                : null;
              const disabled = destinationOrder !== null && option.orderIndex >= destinationOrder;
              const active = fareOriginLocationId === option.locationId;

              return (
                <Pressable
                  key={`origin-${option.locationId}`}
                  style={[
                    styles.fareStopButton,
                    active && styles.fareStopButtonActive,
                    disabled && styles.fareStopButtonDisabled,
                  ]}
                  onPress={() => onFareOriginChange(active ? null : option.locationId)}
                  disabled={disabled}
                >
                  <Text
                    style={[
                      styles.fareStopButtonText,
                      active && styles.fareStopButtonTextActive,
                      disabled && styles.fareStopButtonTextDisabled,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            }) : (
              <Text style={styles.fareSelectionEmptyText}>Select a live vehicle to load stops.</Text>
            )}
          </View>
        </View>

        <View style={styles.fareSelectionRow}>
          <Text style={styles.fareSelectionLabel}>Drop-off point</Text>
          <View style={styles.fareStopButtonGrid}>
            {fareStopOptions.length > 0 ? fareStopOptions.map((option) => {
              const originOrder = fareOriginLocationId
                ? fareStopOrderByLocationId.get(fareOriginLocationId) ?? null
                : null;
              const disabled = originOrder !== null && option.orderIndex <= originOrder;
              const active = fareDestinationLocationId === option.locationId;

              return (
                <Pressable
                  key={`destination-${option.locationId}`}
                  style={[
                    styles.fareStopButton,
                    active && styles.fareStopButtonActive,
                    disabled && styles.fareStopButtonDisabled,
                  ]}
                  onPress={() => onFareDestinationChange(active ? null : option.locationId)}
                  disabled={disabled}
                >
                  <Text
                    style={[
                      styles.fareStopButtonText,
                      active && styles.fareStopButtonTextActive,
                      disabled && styles.fareStopButtonTextDisabled,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            }) : (
              <Text style={styles.fareSelectionEmptyText}>Fare stops will appear here for the selected route.</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.fareCard}>
        <View style={styles.fareTextBlock}>
          <Text style={styles.fareLabel}>Estimated fare</Text>
          <Text style={currentFare === null ? styles.fareAmountPending : styles.fareAmount}>
            {currentFare === null ? fareStatusLabel : formatFare(currentFare)}
          </Text>
          <Text style={styles.fareSupportText}>{fareSupportText}</Text>
        </View>

        <View style={styles.fareToggleRow}>
          <Pressable
            style={[styles.fareToggle, fareMode === 'normal' && styles.fareToggleActive]}
            onPress={() => setFareMode('normal')}
          >
            <Text style={[styles.fareToggleText, fareMode === 'normal' && styles.fareToggleTextActive]}>
              Normal
            </Text>
          </Pressable>
          <Pressable
            style={[styles.fareToggle, fareMode === 'discounted' && styles.fareToggleActive]}
            onPress={() => setFareMode('discounted')}
          >
            <Text style={[styles.fareToggleText, fareMode === 'discounted' && styles.fareToggleTextActive]}>
              Discounted
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
