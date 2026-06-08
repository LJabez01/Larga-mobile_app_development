// Commuter Map Screen - renders the route-aware commuter map and overlays.
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { commuterStyles as styles } from './commuter-map.styles';
import {
  getMapbox,
  ensureMapboxConfigured,
  MAP_STYLE_URL,
  INITIAL_CENTER_COORDINATE,
  STA_MARIA_BOUNDS,
  MAP_ZOOM,
  MAP_PITCH,
} from '../shared/mapbox.utils';
import MapFallback from '../shared/MapFallback';
import MapMarkerIcon from '../shared/MapMarkerIcon';
import SettingsDrawer from '../../settings';
import RideInfoPanel, { type VehicleTypeFilter } from '../RideInfoPanel';
import { useLiveData } from '@/components/providers/LiveDataProvider';
import { getCurrentDeviceLocation, watchDeviceLocation, type DeviceLocationSnapshot } from '../shared/device-location';
import type { CommuterReferenceSource } from '@/lib/domain/commuter-visibility';

const COMMUTER_LOCATION_FOCUS_ZOOM = 14.4;
const COMMUTER_LOCATION_FOCUS_DURATION_MS = 650;
const AUTO_RECENTER_IDLE_DELAY_MS = 5000;

function formatVehicleTypeCount(filter: VehicleTypeFilter, count: number) {
  if (filter === 'bus') {
    return count === 1 ? 'bus' : 'buses';
  }

  if (filter === 'jeep') {
    return count === 1 ? 'jeep' : 'jeeps';
  }

  return count === 1 ? 'vehicle' : 'vehicles';
}

function formatVehicleTypeEmptyLabel(filter: VehicleTypeFilter) {
  if (filter === 'all') {
    return 'active vehicles';
  }

  return `active ${formatVehicleTypeCount(filter, 2)}`;
}

function formatRouteContextLabel(routeLabels: string[]) {
  if (routeLabels.length === 0) {
    return null;
  }

  if (routeLabels.length === 1) {
    return routeLabels[0];
  }

  return `${routeLabels.length} nearby routes`;
}

function isPermissionDeniedError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : null;
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return code === 'permission-denied' || message.includes('missing or insufficient permissions');
}

function getPresenceErrorMessage(error: unknown) {
  if (isPermissionDeniedError(error)) {
    return 'Unable to update your commuter location. Check that this account has approved commuter access and that the latest Firestore rules are active.';
  }

  return error instanceof Error ? error.message : 'Unable to update your commuter location.';
}

// Commuter Map Screen - renders route-aware commuter tracking and vehicle visibility.
export default function CommuterMapScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleTypeFilter>('all');
  const [isRidePanelCollapsed, setIsRidePanelCollapsed] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isPresenceLoading, setIsPresenceLoading] = useState(false);
  const [hasMapLoadingError, setHasMapLoadingError] = useState(false);
  const [isMapboxReady, setIsMapboxReady] = useState(false);
  const locationWatchRef = useRef<{ remove: () => void } | null>(null);
  const publishInFlightRef = useRef(false);
  const presencePermissionBlockedRef = useRef(false);
  const cameraRef = useRef<any>(null);
  const lastCenteredCommuterCoordinateRef = useRef<string | null>(null);
  const latestCommuterCoordinateRef = useRef<[number, number] | null>(null);
  const autoRecenterPausedRef = useRef(false);
  const autoRecenterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { snapshot, publishCommuterPresence } = useLiveData();
  const Mapbox = getMapbox();

  useEffect(() => {
    let isCancelled = false;

    if (!Mapbox) {
      return () => {
        isCancelled = true;
      };
    }

    ensureMapboxConfigured().then((configuredMapbox) => {
      if (isCancelled) {
        return;
      }

      if (!configuredMapbox) {
        setHasMapLoadingError(true);
        return;
      }

      setIsMapboxReady(true);
      setHasMapLoadingError(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [Mapbox]);

  // Commuter Camera Focus - moves the map camera to the commuter's current reference point.
  function focusCameraOnCommuter(coordinate: [number, number]) {
    if (!cameraRef.current?.setCamera) {
      return;
    }

    cameraRef.current.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: COMMUTER_LOCATION_FOCUS_ZOOM,
      animationMode: 'flyTo',
      animationDuration: COMMUTER_LOCATION_FOCUS_DURATION_MS,
    });
  }

  // Coordinate Key Builder - deduplicates automatic camera recenter updates.
  function getCoordinateKey(coordinate: [number, number]) {
    return `${coordinate[0].toFixed(6)}:${coordinate[1].toFixed(6)}`;
  }

  // Auto-Recenter Timer Cleanup - cancels any pending idle recenter action.
  function clearAutoRecenterTimeout() {
    if (autoRecenterTimeoutRef.current) {
      clearTimeout(autoRecenterTimeoutRef.current);
      autoRecenterTimeoutRef.current = null;
    }
  }

  // Idle Auto-Recenter Resume - restarts map following after five seconds without touch input.
  function resumeAutoRecenterAfterIdle() {
    clearAutoRecenterTimeout();

    autoRecenterTimeoutRef.current = setTimeout(() => {
      autoRecenterPausedRef.current = false;

      if (latestCommuterCoordinateRef.current) {
        lastCenteredCommuterCoordinateRef.current = getCoordinateKey(latestCommuterCoordinateRef.current);
        focusCameraOnCommuter(latestCommuterCoordinateRef.current);
      }

      autoRecenterTimeoutRef.current = null;
    }, AUTO_RECENTER_IDLE_DELAY_MS);
  }

  // Map Touch Start - pauses automatic camera following while the user explores the map.
  function handleMapTouchStart() {
    autoRecenterPausedRef.current = true;
    clearAutoRecenterTimeout();
  }

  // Map Touch End - schedules automatic camera following to resume after idle time.
  function handleMapTouchEnd() {
    resumeAutoRecenterAfterIdle();
  }

  // Presence Publisher - sends GPS or manual commuter reference data into live-data visibility.
  async function publishPresenceFromLocation(
    location: DeviceLocationSnapshot,
    referenceSource: CommuterReferenceSource,
  ) {
    if (presencePermissionBlockedRef.current) {
      return;
    }

    await publishCommuterPresence({
      latitude: location.latitude,
      longitude: location.longitude,
      referenceSource,
      recordedAt: location.recordedAt,
    });
  }

  useEffect(() => {
    let cancelled = false;
    presencePermissionBlockedRef.current = false;

    // Location Sync Bootstrap - loads the first device location and starts commuter presence.
    async function beginLocationSync() {
      setIsPresenceLoading(true);
      setLocationError(null);

      try {
        const currentLocation = await getCurrentDeviceLocation();

        if (cancelled) {
          return;
        }

        await publishPresenceFromLocation(currentLocation, 'gps');
        const subscription = await watchDeviceLocation(async (location) => {
          if (cancelled || publishInFlightRef.current || presencePermissionBlockedRef.current) {
            return;
          }

          publishInFlightRef.current = true;

          try {
            await publishPresenceFromLocation(location, 'gps');
            setLocationError(null);
          } catch (error) {
            if (!cancelled) {
              setLocationError(getPresenceErrorMessage(error));

              if (isPermissionDeniedError(error)) {
                presencePermissionBlockedRef.current = true;
                subscription.remove();
                locationWatchRef.current = null;
              }
            }
          } finally {
            publishInFlightRef.current = false;
          }
        });

        if (cancelled) {
          subscription.remove();
          return;
        }

        locationWatchRef.current = subscription;
      } catch (error) {
        if (!cancelled) {
          setLocationError(getPresenceErrorMessage(error));

          if (isPermissionDeniedError(error)) {
            presencePermissionBlockedRef.current = true;
          }
        }
      } finally {
        if (!cancelled) {
          setIsPresenceLoading(false);
        }
      }
    }

    beginLocationSync();

    return () => {
      cancelled = true;

      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
    };
  }, [publishCommuterPresence]);

  const nearbyRouteIds = snapshot.commuterPresence?.nearbyRouteIds ?? [];
  const nearbyRouteOptions = nearbyRouteIds.length > 0
    ? snapshot.routes.filter((route) => nearbyRouteIds.includes(route.id))
    : [];
  const routeContextLabel = formatRouteContextLabel(nearbyRouteOptions.map((route) => route.label));
  const visibleVehicles = snapshot.commuterVisibleVehicles;
  const sortedVisibleVehicles = useMemo(
    () => [...visibleVehicles].sort((left, right) => (
      left.etaMinutes - right.etaMinutes
      || left.type.localeCompare(right.type)
      || left.routeLabel.localeCompare(right.routeLabel)
    )),
    [visibleVehicles],
  );
  const filteredVisibleVehicles = useMemo(
    () => sortedVisibleVehicles.filter((vehicle) => (
      vehicleTypeFilter === 'all' || vehicle.type === vehicleTypeFilter
    )),
    [sortedVisibleVehicles, vehicleTypeFilter],
  );
  const selectedVehicle = useMemo(
    () => (
      filteredVisibleVehicles.find((vehicle) => vehicle.id === selectedVehicleId)
      ?? filteredVisibleVehicles[0]
      ?? null
    ),
    [filteredVisibleVehicles, selectedVehicleId],
  );
  const unreadCount = snapshot.notificationsByRole.commuter.filter((notification) => !notification.read).length;
  const rideStatusMessage = snapshot.commuterPresence
    ? locationError
      ? locationError
      : filteredVisibleVehicles.length > 0
        ? `${filteredVisibleVehicles.length} ${formatVehicleTypeCount(vehicleTypeFilter, filteredVisibleVehicles.length)} can still pass your current point.`
        : nearbyRouteOptions.length > 0
          ? `No ${formatVehicleTypeEmptyLabel(vehicleTypeFilter)} can still pass your current point right now.`
          : 'No supported route is near your current point.'
    : locationError ?? 'Waiting for your current location.';

  useEffect(() => {
    if (
      selectedVehicleId
      && !filteredVisibleVehicles.some((vehicle) => vehicle.id === selectedVehicleId)
    ) {
      setSelectedVehicleId(filteredVisibleVehicles[0]?.id ?? null);
    }
  }, [filteredVisibleVehicles, selectedVehicleId]);

  useEffect(() => {
    const currentCoordinate = snapshot.commuterPresence?.coordinate;

    if (!isMapboxReady || !currentCoordinate) {
      latestCommuterCoordinateRef.current = null;
      lastCenteredCommuterCoordinateRef.current = null;
      return;
    }

    latestCommuterCoordinateRef.current = currentCoordinate;

    if (autoRecenterPausedRef.current) {
      return;
    }

    const coordinateKey = getCoordinateKey(currentCoordinate);

    if (lastCenteredCommuterCoordinateRef.current === coordinateKey) {
      return;
    }

    lastCenteredCommuterCoordinateRef.current = coordinateKey;
    focusCameraOnCommuter(currentCoordinate);
  }, [isMapboxReady, snapshot.commuterPresence?.coordinate]);

  useEffect(() => () => {
    clearAutoRecenterTimeout();
  }, []);

  if (!Mapbox) return <MapFallback />;
  if (!isMapboxReady && !hasMapLoadingError) {
    return (
      <MapFallback
        eyebrow="Map Setup"
        title="Preparing the commuter map"
        text="Configuring the native map renderer for this device."
        loading
      />
    );
  }
  if (hasMapLoadingError) {
    return (
      <MapFallback
        eyebrow="Map Load Error"
        title="Unable to load the commuter map"
        text="The map style could not be loaded on this device. Restart the app after the latest build installs, or try again once the network is stable."
      />
    );
  }

  return (
    <View
      style={styles.container}
      onTouchStart={handleMapTouchStart}
      onTouchEnd={handleMapTouchEnd}
      onTouchCancel={handleMapTouchEnd}
    >
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_STYLE_URL}
        scaleBarEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
        attributionEnabled={false}
        onWillStartLoadingMap={() => {
          setHasMapLoadingError(false);
        }}
        onDidFinishLoadingStyle={() => {
          setHasMapLoadingError(false);
        }}
        onMapLoadingError={() => {
          setHasMapLoadingError(true);
        }}
        onTouchStart={handleMapTouchStart}
        onTouchEnd={handleMapTouchEnd}
        onTouchCancel={handleMapTouchEnd}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={MAP_ZOOM.initial}
          centerCoordinate={INITIAL_CENTER_COORDINATE}
          animationMode="flyTo"
          minZoomLevel={MAP_ZOOM.min}
          maxZoomLevel={MAP_ZOOM.max}
          maxBounds={STA_MARIA_BOUNDS}
          pitch={MAP_PITCH}
        />

        {filteredVisibleVehicles.map((vehicle) => (
          <Mapbox.MarkerView key={vehicle.id} coordinate={vehicle.coordinate}>
            <TouchableOpacity
              style={[
                styles.mapVehicleButton,
                vehicle.type === 'bus' ? styles.mapVehicleButtonBus : styles.mapVehicleButtonJeep,
                selectedVehicle?.id === vehicle.id && styles.mapVehicleButtonActive,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                setSelectedVehicleId(vehicle.id);
                setIsRidePanelCollapsed(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={`View ${vehicle.type} details`}
            >
              <MapMarkerIcon kind={vehicle.type === 'bus' ? 'bus' : 'jeep'} size="md" active={selectedVehicle?.id === vehicle.id} />
            </TouchableOpacity>
          </Mapbox.MarkerView>
        ))}

        {snapshot.commuterPresence ? (
          <Mapbox.MarkerView coordinate={snapshot.commuterPresence.coordinate}>
            <View style={commuterOverlayStyles.referenceMarker}>
              <MapMarkerIcon kind="commuter" size="sm" active />
            </View>
          </Mapbox.MarkerView>
        ) : null}
      </Mapbox.MapView>

      <>
        <View style={styles.topBarRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setDrawerVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="menu" size={24} color="#0f172a" />
          </TouchableOpacity>

          <View style={[styles.searchBar, routeContextLabel ? styles.searchBarSelected : null]}>
            <Text
              style={[
                styles.searchInput,
                routeContextLabel ? styles.searchInputSelected : styles.searchInputPlaceholder,
              ]}
              numberOfLines={1}
            >
              {routeContextLabel ?? 'Finding your route'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.85}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
            {unreadCount > 0 ? <View style={styles.notificationDot} /> : null}
          </TouchableOpacity>
        </View>

        <RideInfoPanel
          vehicle={selectedVehicle}
          vehicleTypeFilter={vehicleTypeFilter}
          onVehicleTypeFilterChange={setVehicleTypeFilter}
          isCollapsed={isRidePanelCollapsed}
          onCollapsedChange={setIsRidePanelCollapsed}
          routeContextLabel={routeContextLabel}
          vehicleCount={filteredVisibleVehicles.length}
          totalVehicleCount={visibleVehicles.length}
          hasCommuterPresence={Boolean(snapshot.commuterPresence)}
          isPresenceLoading={isPresenceLoading}
          statusMessage={rideStatusMessage}
        />

      </>

      <SettingsDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const commuterOverlayStyles = StyleSheet.create({
  referenceMarker: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
