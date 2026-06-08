// Ride Info Panel - shows live selected vehicle details beneath the commuter map.
import React, { useMemo, useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CommuterVisibleVehicle } from '@/lib/domain/commuter-visibility';
import { styles } from './ride-info-panel.styles';

export type VehicleTypeFilter = 'all' | 'bus' | 'jeep';
type FareMode = 'normal' | 'discounted';

type RideInfoPanelProps = {
  vehicle: CommuterVisibleVehicle | null;
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
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const FILTER_OPTIONS: Array<{ label: string; value: VehicleTypeFilter; icon: IoniconName }> = [
  { label: 'All', value: 'all', icon: 'layers-outline' },
  { label: 'Bus', value: 'bus', icon: 'bus-outline' },
  { label: 'Jeep', value: 'jeep', icon: 'car-sport-outline' },
];

// Number Parser - converts the live marker fare string into a usable peso amount.
function parseFareAmount(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const amount = Number.parseFloat(value.replace(/[^\d.]/g, ''));

  return Number.isFinite(amount) ? amount : null;
}

// Fare Calculator - applies the MVP discount toggle to the selected vehicle's base fare.
function getFareAmount(baseFare: number | null, fareMode: FareMode) {
  if (baseFare === null) {
    return null;
  }

  if (fareMode === 'discounted') {
    return Math.max(Math.round(baseFare * 0.8), 0);
  }

  return baseFare;
}

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

// Ride Info Panel - displays selected live vehicle data and route/type controls.
export default function RideInfoPanel({
  vehicle,
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
}: RideInfoPanelProps) {
  const [fareMode, setFareMode] = useState<FareMode>('normal');
  const baseFare = useMemo(() => parseFareAmount(vehicle?.fare), [vehicle?.fare]);
  const currentFare = getFareAmount(baseFare, fareMode);
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

      <View style={styles.fareCard}>
        <View style={styles.fareTextBlock}>
          <Text style={styles.fareLabel}>Estimated fare</Text>
          <Text style={styles.fareAmount}>{formatFare(currentFare)}</Text>
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
