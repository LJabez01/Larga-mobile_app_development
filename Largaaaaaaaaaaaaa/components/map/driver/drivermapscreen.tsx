// Driver Map Screen - renders the live driver map, terminal-pair trip setup, and recovery controls.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  Pressable,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { driverStyles as styles } from './driver-map.styles';
import { buildTerminalPickerItems, type TerminalPickerListItem } from './terminal-picker-items';
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
import { useLiveData } from '@/components/providers/LiveDataProvider';
import {
  filterSelectableTerminalOptions,
  getSelectableInventoryLocationsForTerminalIds,
  isSelectableTerminalId,
  TRANSPORT_LOCATION_INVENTORY_SEED,
  type TransportLocationSeed,
} from '@/lib/seed/transport-location-inventory';
import {
  buildDriverTripMetrics,
  getSelectableTerminalIds,
  isDistinctTerminalPair,
  type TerminalOption,
  type RouteCoordinate,
  type DriverTerminalTarget,
} from '@/lib/domain/transport';
import { getDriverCurrentLocation, watchDriverLocation } from './driver-location';

function formatTerminalPairLabel(originLabel: string | null, destinationLabel: string | null) {
  if (originLabel && destinationLabel) {
    return `${originLabel} to ${destinationLabel}`;
  }

  if (originLabel) {
    return `From ${originLabel}`;
  }

  if (destinationLabel) {
    return `To ${destinationLabel}`;
  }

  return 'Set trip terminals';
}

function formatNextTerminalMetricLabel(label: string | null) {
  if (!label) {
    return 'Destination T.';
  }

  const normalizedLabel = label.trim().toLowerCase();

  if (normalizedLabel.includes('sta. maria')) {
    return 'SM T.';
  }

  if (normalizedLabel.includes('halang')) {
    return 'Hal T.';
  }

  if (normalizedLabel.includes('norzagaray')) {
    return 'Garay T.';
  }

  if (normalizedLabel.includes('san jose')) {
    return 'SJ T.';
  }

  return label.replace(/\bTerminal\b/i, 'T.');
}

function buildReferenceLocationBadgeLabel(location: TransportLocationSeed) {
  if (location.coordinatePrecision === 'needs_field_validation') {
    return 'Needs validation';
  }

  if (location.classification === 'operational-terminal-candidate') {
    return 'Candidate';
  }

  return 'Reference only';
}

function buildReferenceLocationSupportText(
  location: TransportLocationSeed,
  target: DriverTerminalTarget,
) {
  const targetLabel = target === 'origin' ? 'origin' : 'destination';

  if (location.classification === 'operational-terminal-candidate') {
    return `Known ${targetLabel} candidate. Not ready for live trip selection yet.`;
  }

  return `Known route reference. Not available yet as a ${targetLabel} terminal.`;
}

function buildSelectableLocationSupportText(
  location: TransportLocationSeed,
  target: DriverTerminalTarget,
) {
  const targetLabel = target === 'origin' ? 'Starting terminal' : 'Trip destination';

  if (location.classification === 'operational-terminal-candidate') {
    return `${targetLabel} via candidate terminal`;
  }

  return targetLabel;
}

function buildReferenceLocationUnavailableMessage(location: TransportLocationSeed) {
  if (location.coordinatePrecision === 'needs_field_validation') {
    return `${location.label} is a known location, but it still needs validation before it can be used as a trip endpoint.`;
  }

  if (location.classification === 'operational-terminal-candidate') {
    return `${location.label} is saved as a candidate terminal, but it is not endpoint-ready yet.`;
  }

  return `${location.label} is saved as a reference location only, so it cannot start a live trip yet.`;
}

function formatSignalLabel(status: 'idle' | 'live' | 'stale' | 'missing') {
  if (status === 'live') {
    return 'Live';
  }

  if (status === 'stale') {
    return 'Signal delayed';
  }

  if (status === 'missing') {
    return 'Location paused';
  }

  return 'Idle';
}

function formatRelativeTime(isoTimestamp: string | null) {
  if (!isoTimestamp) {
    return 'Waiting';
  }

  const timestampMs = Date.parse(isoTimestamp);

  if (!Number.isFinite(timestampMs)) {
    return 'Waiting';
  }

  const diffMs = Math.max(Date.now() - timestampMs, 0);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes <= 0) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.floor(diffHours / 24)}d ago`;
}

function buildSignalSupportText(status: 'idle' | 'live' | 'stale' | 'missing', recordedAt: string | null) {
  if (status === 'live') {
    return `Last update ${formatRelativeTime(recordedAt)}.`;
  }

  if (status === 'stale') {
    return 'GPS updates are delayed. Keep the trip active while signal returns, or end the trip manually when needed.';
  }

  if (status === 'missing') {
    return 'No fresh location is being published right now. You can keep the trip active while GPS reconnects, or end it manually.';
  }

  return 'Pick a valid route direction before starting.';
}

function formatSpeedMetric(speedKph: number | null, locationStatus: 'idle' | 'live' | 'stale' | 'missing') {
  if (speedKph === null) {
    return locationStatus === 'live' ? 'Updating...' : 'Waiting';
  }

  if (speedKph < 1) {
    return '0 km/h';
  }

  return `${Math.round(speedKph)} km/h`;
}

function formatDistanceMetric(distanceMeters: number | null) {
  if (distanceMeters === null) {
    return 'Updating...';
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  if (distanceMeters < 10_000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(distanceMeters / 1000)} km`;
}

function formatEtaMetric(etaMinutes: number | null, locationStatus: 'idle' | 'live' | 'stale' | 'missing') {
  if (etaMinutes === null) {
    return locationStatus === 'live' ? 'Estimating...' : 'Waiting';
  }

  if (etaMinutes < 60) {
    return `${etaMinutes} min`;
  }

  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours}h ${minutes}m`;
}

function buildBoundsCoordinates(
  routeCoordinates: RouteCoordinate[] | null,
  connectorCoordinates: RouteCoordinate[] | null,
  vehicleCoordinate: RouteCoordinate | null,
  destinationCoordinate: RouteCoordinate | null,
) {
  const coordinates: RouteCoordinate[] = [];

  if (routeCoordinates) {
    coordinates.push(...routeCoordinates);
  }

  if (connectorCoordinates) {
    coordinates.push(...connectorCoordinates);
  }

  if (vehicleCoordinate) {
    coordinates.push(vehicleCoordinate);
  }

  if (destinationCoordinate) {
    coordinates.push(destinationCoordinate);
  }

  return coordinates;
}

function getBoundsForCoordinates(coordinates: RouteCoordinate[]) {
  if (coordinates.length === 0) {
    return null;
  }

  const longitudes = coordinates.map((coordinate) => coordinate[0]);
  const latitudes = coordinates.map((coordinate) => coordinate[1]);

  return {
    ne: [Math.max(...longitudes), Math.max(...latitudes)] as RouteCoordinate,
    sw: [Math.min(...longitudes), Math.min(...latitudes)] as RouteCoordinate,
  };
}

const ROUTE_FIT_PADDING = [72, 48, 240, 48] as const;
const ROUTE_FIT_DURATION_MS = 900;
const START_TRIP_FOCUS_ZOOM = 15.2;
const START_TRIP_FOCUS_DURATION_MS = 850;
const START_TRIP_ROUTE_OVERVIEW_DELAY_MS = 1150;
const CAMERA_NOTICE_DURATION_MS = 2600;
const TRIP_PANEL_COLLAPSED_CONTROL_HEIGHT = 56;
const TRIP_PANEL_COLLAPSED_CONTROL_BOTTOM = 18;
const TRIP_PANEL_EXIT_OFFSET = 28;
const TRIP_PANEL_ANIMATION_DURATION_MS = 220;

export default function DriverMapScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [terminalPickerVisible, setTerminalPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<DriverTerminalTarget>('origin');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const [isTripSubmitting, setIsTripSubmitting] = useState(false);
  const [isTripPanelExpanded, setIsTripPanelExpanded] = useState(true);
  const [isTripPanelMounted, setIsTripPanelMounted] = useState(true);
  const [tripPanelHeight, setTripPanelHeight] = useState(0);
  const [hasMapLoadingError, setHasMapLoadingError] = useState(false);
  const [isMapboxReady, setIsMapboxReady] = useState(false);
  const routeListRef = useRef<FlatList>(null);
  const locationWatchRef = useRef<{ remove: () => void } | null>(null);
  const publishInFlightRef = useRef(false);
  const cameraRef = useRef<any>(null);
  const tripPanelTranslateY = useRef(new Animated.Value(0)).current;
  const tripStartFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startFocusTripIdRef = useRef<string | null>(null);
  const startFocusActiveRef = useRef(false);
  const lastGuidanceFitKeyRef = useRef<string | null>(null);
  const router = useRouter();
  const Mapbox = getMapbox();
  const { snapshot, selectDriverTerminals, startTrip, endTrip, publishDriverLocation } = useLiveData();

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

  const terminalsById = useMemo(
    () => new Map(snapshot.terminals.map((terminal) => [terminal.id, terminal])),
    [snapshot.terminals],
  );
  const transportLocationsById = useMemo(
    () => new Map(TRANSPORT_LOCATION_INVENTORY_SEED.map((location) => [location.id, location])),
    [],
  );
  const selectedOriginLocation = snapshot.driverSelection.originLocationId
    ? transportLocationsById.get(snapshot.driverSelection.originLocationId) ?? null
    : null;
  const selectedDestinationLocation = snapshot.driverSelection.destinationLocationId
    ? transportLocationsById.get(snapshot.driverSelection.destinationLocationId) ?? null
    : null;
  const originTerminal = snapshot.driverSelection.originTerminalId
    ? terminalsById.get(snapshot.driverSelection.originTerminalId) ?? null
    : null;
  const destinationTerminal = snapshot.driverSelection.destinationTerminalId
    ? terminalsById.get(snapshot.driverSelection.destinationTerminalId) ?? null
    : null;
  const activeTrip = snapshot.activeTrip;
  const hasTerminalPair = isDistinctTerminalPair(
    snapshot.driverSelection.originTerminalId,
    snapshot.driverSelection.destinationTerminalId,
  );
  const selectedRoute = snapshot.routes.find(
    (route) => route.id === snapshot.driverSelection.resolvedRouteId,
  ) ?? null;
  const activeRoute = snapshot.routes.find(
    (route) => route.id === activeTrip?.routeId,
  ) ?? selectedRoute;
  const driverGuidance = snapshot.driverGuidance;
  const mapDestinationTerminal = activeRoute
    ? terminalsById.get(activeRoute.destinationTerminalId) ?? null
    : destinationTerminal;
  const activeVehicle = activeTrip
    ? snapshot.vehicles.find((vehicle) => vehicle.id === activeTrip.vehicleId) ?? null
    : null;
  const unreadCount = snapshot.notificationsByRole.driver.filter((notification) => !notification.read).length;

  const originTerminalIds = getSelectableTerminalIds(
    snapshot.routes,
    'origin',
    snapshot.driverSelection.destinationTerminalId,
  );
  const destinationTerminalIds = getSelectableTerminalIds(
    snapshot.routes,
    'destination',
    snapshot.driverSelection.originTerminalId,
  );
  const visibleTerminalIds = pickerTarget === 'origin' ? originTerminalIds : destinationTerminalIds;
  const selectableTerminals = useMemo(
    () => filterSelectableTerminalOptions(snapshot.terminals),
    [snapshot.terminals],
  );
  const selectableTerminalIds = useMemo(
    () => new Set(
      [...visibleTerminalIds].filter((terminalId) => isSelectableTerminalId(terminalId)),
    ),
    [visibleTerminalIds],
  );
  const selectableInventoryLocations = useMemo(
    () => getSelectableInventoryLocationsForTerminalIds(selectableTerminalIds),
    [selectableTerminalIds],
  );
  const selectableInventoryTerminalIds = useMemo(
    () => new Set(
      selectableInventoryLocations
        .flatMap((location) => (location.linkedTerminalId ? [location.linkedTerminalId] : [])),
    ),
    [selectableInventoryLocations],
  );
  const visibleTerminals = selectableTerminals.filter(
    (terminal) => selectableTerminalIds.has(terminal.id) && !selectableInventoryTerminalIds.has(terminal.id),
  );
  const referencePickerLocations = useMemo(
    () => TRANSPORT_LOCATION_INVENTORY_SEED.filter(
      (location) => (
        !location.endpointReady
        && (
          location.classification === 'reference-route-point'
          || location.linkedTerminalId === null
        )
      ),
    ),
    [],
  );
  const terminalPickerItems = useMemo<TerminalPickerListItem[]>(
    () => buildTerminalPickerItems({
      referencePickerLocations,
      selectableInventoryLocations,
      visibleTerminals,
    }),
    [referencePickerLocations, selectableInventoryLocations, visibleTerminals],
  );

  const terminalPairLabel = formatTerminalPairLabel(
    selectedOriginLocation?.label ?? originTerminal?.label ?? null,
    selectedDestinationLocation?.label ?? destinationTerminal?.label ?? null,
  );
  const routeSelectionSummary = selectedRoute
    ? selectedRoute.label
    : hasTerminalPair
      ? 'Stored route unavailable for this direction.'
      : 'Choose two valid terminals to unlock the route.';
  const routeSetupStatus = selectedRoute
    ? 'Ready to larga'
    : hasTerminalPair
      ? 'Choose a different terminal pair'
      : 'Trip setup needed';
  const canStartTrip = Boolean(selectedRoute) && !snapshot.activeTrip;
  const routeLineFeature = useMemo(
    () => (
      activeTrip && driverGuidance?.routeCoordinates
        ? {
            type: 'Feature' as const,
            properties: {
              routeId: activeTrip.routeId,
              mode: driverGuidance.mode,
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: driverGuidance.routeCoordinates,
            },
          }
        : null
    ),
    [activeTrip, driverGuidance],
  );
  const routeConnectorFeature = useMemo(
    () => (
      activeTrip && driverGuidance?.connectorCoordinates
        ? {
            type: 'Feature' as const,
            properties: {
              routeId: activeTrip.routeId,
              mode: driverGuidance.mode,
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: driverGuidance.connectorCoordinates,
            },
          }
        : null
    ),
    [activeTrip, driverGuidance],
  );

  const activeOriginLabel = activeTrip
    ? (activeTrip.originLocationId ? transportLocationsById.get(activeTrip.originLocationId)?.label ?? null : null)
      ?? terminalsById.get(activeTrip.originTerminalId)?.label
      ?? 'Origin terminal'
    : null;
  const activeDestinationLabel = activeTrip
    ? (activeTrip.destinationLocationId ? transportLocationsById.get(activeTrip.destinationLocationId)?.label ?? null : null)
      ?? terminalsById.get(activeTrip.destinationTerminalId)?.label
      ?? 'Destination terminal'
    : null;
  const activeSignalLabel = activeTrip
    ? formatSignalLabel(activeTrip.locationStatus)
    : 'Idle';
  const activeSignalText = activeTrip
    ? buildSignalSupportText(activeTrip.locationStatus, activeTrip.lastLocationRecordedAt)
    : '';
  const activeGuidanceWarning = activeTrip
    ? driverGuidance?.warningMessage ?? null
    : null;
  const activeTripMetrics = useMemo(
    () => buildDriverTripMetrics(
      driverGuidance,
      activeVehicle?.speedKph ?? null,
      activeTrip?.locationStatus ?? 'idle',
    ),
    [activeTrip?.locationStatus, activeVehicle?.speedKph, driverGuidance],
  );
  const activeSpeedMetric = formatSpeedMetric(
    activeVehicle?.speedKph ?? null,
    activeTrip?.locationStatus ?? 'idle',
  );
  const activeDistanceMetric = formatDistanceMetric(activeTripMetrics.distanceMeters);
  const activeEtaMetric = formatEtaMetric(
    activeTripMetrics.etaMinutes,
    activeTrip?.locationStatus ?? 'idle',
  );
  const activeNextTerminalLabel = formatNextTerminalMetricLabel(activeDestinationLabel);
  const activeTripId = activeTrip?.id ?? null;
  const activeTripRouteId = activeTrip?.routeId ?? null;
  const recenterButtonBottom = !activeTrip
    ? null
    : isTripPanelMounted
      ? (tripPanelHeight > 0 ? tripPanelHeight + 18 : null)
      : TRIP_PANEL_COLLAPSED_CONTROL_HEIGHT + TRIP_PANEL_COLLAPSED_CONTROL_BOTTOM + 16;

  function clearTripStartFocusTimeout() {
    if (tripStartFocusTimeoutRef.current) {
      clearTimeout(tripStartFocusTimeoutRef.current);
      tripStartFocusTimeoutRef.current = null;
    }
  }

  function showCameraNotice(message: string) {
    setCameraNotice(message);

    if (cameraNoticeTimeoutRef.current) {
      clearTimeout(cameraNoticeTimeoutRef.current);
    }

    cameraNoticeTimeoutRef.current = setTimeout(() => {
      setCameraNotice(null);
      cameraNoticeTimeoutRef.current = null;
    }, CAMERA_NOTICE_DURATION_MS);
  }

  function focusCameraOnDriver(coordinate: RouteCoordinate) {
    if (!cameraRef.current?.setCamera) {
      return;
    }

    cameraRef.current.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: START_TRIP_FOCUS_ZOOM,
      animationMode: 'flyTo',
      animationDuration: START_TRIP_FOCUS_DURATION_MS,
    });
  }

  function fitTripCameraContext(
    routeCoordinates: RouteCoordinate[] | null,
    connectorCoordinates: RouteCoordinate[] | null,
    vehicleCoordinate: RouteCoordinate | null,
    destinationCoordinate: RouteCoordinate | null,
  ) {
    const boundsCoordinates = buildBoundsCoordinates(
      routeCoordinates,
      connectorCoordinates,
      vehicleCoordinate,
      destinationCoordinate,
    );
    const bounds = getBoundsForCoordinates(boundsCoordinates);

    if (!bounds || !cameraRef.current?.fitBounds) {
      return false;
    }

    cameraRef.current.fitBounds(
      bounds.ne,
      bounds.sw,
      ROUTE_FIT_PADDING,
      ROUTE_FIT_DURATION_MS,
    );

    return true;
  }

  function centerCameraOnActiveVehicle() {
    if (!activeVehicle) {
      return;
    }

    focusCameraOnDriver(activeVehicle.coordinate);
    showCameraNotice('Centered on your live location.');
  }

  function collapseTripPanel() {
    setIsTripPanelExpanded(false);

    if (tripPanelHeight <= 0) {
      setIsTripPanelMounted(false);
      tripPanelTranslateY.setValue(0);
      return;
    }

    Animated.timing(tripPanelTranslateY, {
      toValue: tripPanelHeight + TRIP_PANEL_EXIT_OFFSET,
      duration: TRIP_PANEL_ANIMATION_DURATION_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setIsTripPanelMounted(false);
      tripPanelTranslateY.setValue(0);
    });
  }

  function expandTripPanel() {
    setIsTripPanelMounted(true);
    setIsTripPanelExpanded(true);

    if (tripPanelHeight <= 0) {
      tripPanelTranslateY.setValue(0);
      return;
    }

    tripPanelTranslateY.setValue(tripPanelHeight + TRIP_PANEL_EXIT_OFFSET);
    requestAnimationFrame(() => {
      Animated.timing(tripPanelTranslateY, {
        toValue: 0,
        duration: TRIP_PANEL_ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }).start();
    });
  }

  useEffect(() => {
    if (!activeTrip || !activeVehicle) {
      startFocusTripIdRef.current = null;
      startFocusActiveRef.current = false;
      clearTripStartFocusTimeout();
      return;
    }

    if (startFocusTripIdRef.current === activeTrip.id) {
      return;
    }

    startFocusTripIdRef.current = activeTrip.id;
    startFocusActiveRef.current = true;
    focusCameraOnDriver(activeVehicle.coordinate);
    showCameraNotice('Trip started. Centered on your live location.');

    clearTripStartFocusTimeout();
    tripStartFocusTimeoutRef.current = setTimeout(() => {
      startFocusActiveRef.current = false;
      fitTripCameraContext(
        driverGuidance?.routeCoordinates ?? null,
        driverGuidance?.connectorCoordinates ?? null,
        activeVehicle.coordinate,
        mapDestinationTerminal?.coordinate ?? null,
      );
      tripStartFocusTimeoutRef.current = null;
    }, START_TRIP_ROUTE_OVERVIEW_DELAY_MS);
  }, [activeTrip, activeVehicle, driverGuidance, mapDestinationTerminal]);

  useEffect(() => {
    if (!activeTrip) {
      setIsTripPanelExpanded(true);
      setIsTripPanelMounted(true);
      tripPanelTranslateY.setValue(0);
      return;
    }
  }, [activeTrip, tripPanelTranslateY]);

  useEffect(() => {
    if (!activeTrip || !driverGuidance?.updatedAt || !activeVehicle || !mapDestinationTerminal) {
      return;
    }

    if (startFocusActiveRef.current) {
      return;
    }

    const fitKey = `${driverGuidance.mode}:${driverGuidance.updatedAt}`;

    if (lastGuidanceFitKeyRef.current === fitKey) {
      return;
    }

    lastGuidanceFitKeyRef.current = fitKey;
    fitTripCameraContext(
      driverGuidance.routeCoordinates,
      driverGuidance.connectorCoordinates,
      activeVehicle.coordinate,
      mapDestinationTerminal.coordinate,
    );
  }, [activeTrip, activeVehicle, driverGuidance, mapDestinationTerminal]);

  useEffect(() => {
    return () => {
      clearTripStartFocusTimeout();

      if (cameraNoticeTimeoutRef.current) {
        clearTimeout(cameraNoticeTimeoutRef.current);
        cameraNoticeTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function beginLocationWatch() {
      if (!activeTripId || !activeTripRouteId) {
        if (locationWatchRef.current) {
          locationWatchRef.current.remove();
          locationWatchRef.current = null;
        }
        return;
      }

      if (locationWatchRef.current) {
        return;
      }

      try {
        const subscription = await watchDriverLocation(async (location) => {
          if (cancelled || publishInFlightRef.current) {
            return;
          }

          publishInFlightRef.current = true;

          try {
            await publishDriverLocation({
              routeId: activeTripRouteId,
              latitude: location.latitude,
              longitude: location.longitude,
              heading: location.heading,
              speed: location.speed,
              accuracy: location.accuracy,
              recordedAt: location.recordedAt,
            });
          } catch (error) {
            if (!cancelled) {
              setActionError(error instanceof Error ? error.message : 'Unable to publish your live location right now.');
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
          setActionError(error instanceof Error ? error.message : 'Location permission is required for live trip tracking.');
        }
      }
    }

    beginLocationWatch();

    return () => {
      cancelled = true;
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
    };
  }, [activeTripId, activeTripRouteId, publishDriverLocation]);

  function openTerminalPicker() {
    if (snapshot.activeTrip) {
      return;
    }

    setActionError(null);
    setActionHint(null);
    setPickerTarget(snapshot.driverSelection.originTerminalId ? 'destination' : 'origin');
    setTerminalPickerVisible(true);
    setTimeout(() => routeListRef.current?.scrollToOffset({ offset: 0, animated: false }), 50);
  }

  function closeTerminalPicker() {
    setTerminalPickerVisible(false);
  }

  function handlePressReferenceLocation(location: TransportLocationSeed) {
    setActionError(null);
    setActionHint(buildReferenceLocationUnavailableMessage(location));
  }

  async function handleSelectTerminal(
    terminalId: string,
    locationId: string | null = null,
  ) {
    setActionError(null);
    setActionHint(null);

    if (!isSelectableTerminalId(terminalId)) {
      setActionError('Only supported terminals can be selected right now.');
      return;
    }

    const nextOriginTerminalId = pickerTarget === 'origin'
      ? terminalId
      : snapshot.driverSelection.originTerminalId;
    const nextDestinationTerminalId = pickerTarget === 'destination'
      ? terminalId
      : snapshot.driverSelection.destinationTerminalId;
    const nextOriginLocationId = pickerTarget === 'origin'
      ? locationId
      : snapshot.driverSelection.originLocationId;
    const nextDestinationLocationId = pickerTarget === 'destination'
      ? locationId
      : snapshot.driverSelection.destinationLocationId;

    try {
      const nextSnapshot = await selectDriverTerminals({
        originTerminalId: nextOriginTerminalId,
        destinationTerminalId: nextDestinationTerminalId,
        originLocationId: nextOriginLocationId,
        destinationLocationId: nextDestinationLocationId,
      });

      if (!nextSnapshot.driverSelection.originTerminalId) {
        setPickerTarget('origin');
        return;
      }

      if (!nextSnapshot.driverSelection.destinationTerminalId) {
        setPickerTarget('destination');
        return;
      }

      closeTerminalPicker();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update the trip setup.');
    }
  }

  async function handleClearTerminal(target: DriverTerminalTarget) {
    setActionError(null);
    setActionHint(null);

    try {
      await selectDriverTerminals({
        originTerminalId: target === 'origin' ? null : snapshot.driverSelection.originTerminalId,
        destinationTerminalId: target === 'destination' ? null : snapshot.driverSelection.destinationTerminalId,
        originLocationId: target === 'origin' ? null : snapshot.driverSelection.originLocationId,
        destinationLocationId: target === 'destination' ? null : snapshot.driverSelection.destinationLocationId,
      });
      setPickerTarget(target);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to clear the terminal selection.');
    }
  }

  async function handleStartTrip() {
    setActionError(null);
    setActionHint(null);
    setIsTripSubmitting(true);

    try {
      const currentLocation = await getDriverCurrentLocation();
      await startTrip(currentLocation);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to start trip right now.');
    } finally {
      setIsTripSubmitting(false);
    }
  }

  async function handleEndTrip() {
    setActionError(null);
    setIsTripSubmitting(true);
    setCameraNotice(null);
    clearTripStartFocusTimeout();
    startFocusActiveRef.current = false;
    startFocusTripIdRef.current = null;
    setIsTripPanelExpanded(true);
    setIsTripPanelMounted(true);
    tripPanelTranslateY.setValue(0);

    try {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
      const nextSnapshot = await endTrip();
      setActionHint(
        nextSnapshot.driverSelection.resolvedRouteLabel
          ? `Return route ready: ${nextSnapshot.driverSelection.resolvedRouteLabel}`
          : 'Trip ended. Pick your next route when ready.',
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to end trip right now.');
    } finally {
      setIsTripSubmitting(false);
    }
  }

  if (!Mapbox) {
    return <MapFallback />;
  }

  if (!isMapboxReady && !hasMapLoadingError) {
    return (
      <MapFallback
        eyebrow="Map Setup"
        title="Preparing the live map"
        text="Configuring the native map renderer for this device."
        loading
      />
    );
  }

  if (hasMapLoadingError) {
    return (
      <MapFallback
        eyebrow="Map Load Error"
        title="Unable to load the live map"
        text="The map style could not be loaded on this device. Restart the app after the latest build installs, or try again once the network is stable."
      />
    );
  }

  return (
    <View style={styles.container}>
      {terminalPickerVisible ? (
        <View style={styles.searchOverlay}>
          <View style={driverOverlayStyles.setupHeader}>
            <Text style={driverOverlayStyles.setupTitle}>Prepare trip</Text>
            <TouchableOpacity onPress={closeTerminalPicker} style={driverOverlayStyles.setupCloseButton}>
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={driverOverlayStyles.setupSubtitle}>
            Pick a valid origin and destination. Candidate terminals may still be selectable when they already map to a supported stored route, while reference-only locations stay disabled.
          </Text>

          <View style={driverOverlayStyles.selectionCardRow}>
            <TouchableOpacity
              style={[
                driverOverlayStyles.selectionCard,
                pickerTarget === 'origin' && driverOverlayStyles.selectionCardActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setPickerTarget('origin')}
            >
              <Text style={driverOverlayStyles.selectionCardLabel}>Origin</Text>
              <Text
                numberOfLines={1}
                style={[
                  driverOverlayStyles.selectionCardValue,
                  !originTerminal && driverOverlayStyles.selectionCardPlaceholder,
                ]}
              >
                {selectedOriginLocation?.label ?? originTerminal?.label ?? 'Choose terminal'}
              </Text>
              {originTerminal ? (
                <TouchableOpacity
                  style={driverOverlayStyles.selectionClearButton}
                  onPress={() => handleClearTerminal('origin')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                driverOverlayStyles.selectionCard,
                pickerTarget === 'destination' && driverOverlayStyles.selectionCardActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setPickerTarget('destination')}
            >
              <Text style={driverOverlayStyles.selectionCardLabel}>Destination</Text>
              <Text
                numberOfLines={1}
                style={[
                  driverOverlayStyles.selectionCardValue,
                  !destinationTerminal && driverOverlayStyles.selectionCardPlaceholder,
                ]}
              >
                {selectedDestinationLocation?.label ?? destinationTerminal?.label ?? 'Choose terminal'}
              </Text>
              {destinationTerminal ? (
                <TouchableOpacity
                  style={driverOverlayStyles.selectionClearButton}
                  onPress={() => handleClearTerminal('destination')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </View>

          <View
            style={[
              driverOverlayStyles.routeSummaryCard,
              selectedRoute
                ? driverOverlayStyles.routeSummaryCardReady
                : hasTerminalPair
                  ? driverOverlayStyles.routeSummaryCardWarning
                  : null,
            ]}
          >
            <Text style={driverOverlayStyles.routeSummaryStatus}>{routeSetupStatus}</Text>
            <Text style={driverOverlayStyles.routeSummaryTitle}>{terminalPairLabel}</Text>
            <Text style={driverOverlayStyles.routeSummaryText}>{routeSelectionSummary}</Text>
          </View>

          {actionHint ? <Text style={driverOverlayStyles.hintText}>{actionHint}</Text> : null}
          {actionError ? <Text style={driverOverlayStyles.errorText}>{actionError}</Text> : null}

          <Text style={driverOverlayStyles.pickerSectionLabel}>
            {pickerTarget === 'origin' ? 'Choose origin terminal' : 'Choose destination terminal'}
          </Text>

          <FlatList
            ref={routeListRef}
            data={terminalPickerItems}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.searchRouteList}
            renderItem={({ item }) => {
              if (item.kind === 'section') {
                return (
                  <Text style={driverOverlayStyles.pickerSubsectionLabel}>{item.title}</Text>
                );
              }

              if (item.kind === 'reference') {
                return (
                  <TouchableOpacity
                    style={[
                      styles.searchRouteItem,
                      driverOverlayStyles.pickerItemDisabled,
                    ]}
                    onPress={() => handlePressReferenceLocation(item.location)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color="#94a3b8"
                      style={driverOverlayStyles.pickerItemIcon}
                    />
                    <View style={driverOverlayStyles.pickerItemContent}>
                      <View style={driverOverlayStyles.pickerReferenceHeader}>
                        <Text style={driverOverlayStyles.pickerItemTextDisabled}>{item.location.label}</Text>
                        <View style={driverOverlayStyles.pickerReferenceBadge}>
                          <Text style={driverOverlayStyles.pickerReferenceBadgeText}>
                            {buildReferenceLocationBadgeLabel(item.location)}
                          </Text>
                        </View>
                      </View>
                      <Text style={driverOverlayStyles.pickerItemMetaWarning}>
                        {buildReferenceLocationSupportText(item.location, pickerTarget)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              if (item.kind === 'inventory-terminal') {
                const linkedTerminalId = item.location.linkedTerminalId;

                if (!linkedTerminalId) {
                  return null;
                }

                const isSelected = pickerTarget === 'origin'
                  ? item.location.id === snapshot.driverSelection.originLocationId
                  : item.location.id === snapshot.driverSelection.destinationLocationId;

                return (
                  <TouchableOpacity
                    style={[
                      styles.searchRouteItem,
                      isSelected && driverOverlayStyles.pickerItemSelected,
                    ]}
                    onPress={() => handleSelectTerminal(linkedTerminalId, item.location.id)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={pickerTarget === 'origin' ? 'radio-button-on-outline' : 'flag-outline'}
                      size={18}
                      color={isSelected ? '#10b981' : '#94a3b8'}
                      style={driverOverlayStyles.pickerItemIcon}
                    />
                    <View style={driverOverlayStyles.pickerItemContent}>
                      <View style={driverOverlayStyles.pickerReferenceHeader}>
                        <Text style={styles.searchRouteItemText}>{item.location.label}</Text>
                        {!item.location.endpointReady ? (
                          <View style={driverOverlayStyles.pickerReferenceBadge}>
                            <Text style={driverOverlayStyles.pickerReferenceBadgeText}>
                              {buildReferenceLocationBadgeLabel(item.location)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={driverOverlayStyles.pickerItemMeta}>
                        {buildSelectableLocationSupportText(item.location, pickerTarget)}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={20} color="#10b981" /> : null}
                  </TouchableOpacity>
                );
              }

              const terminal = item.terminal;
              const isSelected = pickerTarget === 'origin'
                ? terminal.id === snapshot.driverSelection.originTerminalId
                  && snapshot.driverSelection.originLocationId === null
                : terminal.id === snapshot.driverSelection.destinationTerminalId
                  && snapshot.driverSelection.destinationLocationId === null;

              return (
                <TouchableOpacity
                  style={[
                    styles.searchRouteItem,
                    isSelected && driverOverlayStyles.pickerItemSelected,
                  ]}
                  onPress={() => handleSelectTerminal(terminal.id, null)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={pickerTarget === 'origin' ? 'radio-button-on-outline' : 'flag-outline'}
                    size={18}
                    color={isSelected ? '#10b981' : '#94a3b8'}
                    style={driverOverlayStyles.pickerItemIcon}
                  />
                  <View style={driverOverlayStyles.pickerItemContent}>
                    <Text style={styles.searchRouteItemText}>{terminal.label}</Text>
                    <Text style={driverOverlayStyles.pickerItemMeta}>
                      {pickerTarget === 'origin'
                        ? 'Starting terminal'
                        : 'Trip destination'}
                    </Text>
                  </View>
                  {isSelected ? <Ionicons name="checkmark-circle" size={20} color="#10b981" /> : null}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={(
              <View style={styles.searchRouteEmpty}>
                <Text style={styles.searchRouteEmptyText}>
                  No known locations are available for this selection yet.
                </Text>
              </View>
            )}
          />
        </View>
      ) : null}

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

        {routeConnectorFeature ? (
          <Mapbox.ShapeSource id="driver-route-connector-source" shape={routeConnectorFeature}>
            <Mapbox.LineLayer
              id="driver-route-connector-line"
              style={{
                lineColor: '#0f766e',
                lineWidth: 3,
                lineOpacity: 0.72,
                lineDasharray: [2, 2],
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}

        {routeLineFeature ? (
          <Mapbox.ShapeSource id="driver-route-source" shape={routeLineFeature}>
            <Mapbox.LineLayer
              id="driver-route-line"
              style={{
                lineColor: driverGuidance?.mode === 'stored-route-fallback' ? '#14b8a6' : '#10b981',
                lineWidth: 5,
                lineOpacity: 0.9,
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}

        {mapDestinationTerminal ? (
          <Mapbox.MarkerView coordinate={mapDestinationTerminal.coordinate}>
            <View style={driverOverlayStyles.destinationMarkerWrap}>
              <View style={driverOverlayStyles.destinationLabelBubble}>
                <Text style={driverOverlayStyles.destinationLabelText}>Destination</Text>
              </View>
              <View style={driverOverlayStyles.destinationMarker}>
                <Ionicons name="flag" size={18} color="#ffffff" />
              </View>
              <View style={driverOverlayStyles.destinationMarkerStem} />
              <Text style={driverOverlayStyles.destinationTerminalLabel} numberOfLines={1}>
                {mapDestinationTerminal.label}
              </Text>
            </View>
          </Mapbox.MarkerView>
        ) : null}

        {activeVehicle ? (
          <Mapbox.MarkerView coordinate={activeVehicle.coordinate}>
            <View style={driverOverlayStyles.vehicleMarker}>
              <MapMarkerIcon kind={activeVehicle.type === 'bus' ? 'bus' : 'jeep'} size="lg" active />
            </View>
          </Mapbox.MarkerView>
        ) : null}
      </Mapbox.MapView>

      {!terminalPickerVisible ? (
        <>
          {snapshot.activeTrip ? (
            <View style={driverOverlayStyles.tripStatusBar}>
              <View
                style={[
                  driverOverlayStyles.tripStatusBadge,
                  snapshot.activeTrip.locationStatus === 'live'
                    ? driverOverlayStyles.tripStatusBadgeLive
                    : snapshot.activeTrip.locationStatus === 'stale'
                      ? driverOverlayStyles.tripStatusBadgeWarning
                      : driverOverlayStyles.tripStatusBadgePaused,
                ]}
              >
                <View
                  style={[
                    driverOverlayStyles.liveDot,
                    snapshot.activeTrip.locationStatus !== 'live' && driverOverlayStyles.liveDotMuted,
                  ]}
                />
                <Text style={driverOverlayStyles.tripStatusLabel}>{activeSignalLabel}</Text>
              </View>
              <Text style={driverOverlayStyles.tripStatusRoute} numberOfLines={1}>
                {snapshot.activeTrip.routeLabel}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/notifications')}
              >
                <Ionicons name="notifications-outline" size={20} color="#ffffff" />
                {unreadCount > 0 ? <View style={driverOverlayStyles.notificationDotWhite} /> : null}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.topBarRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setDrawerVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="menu" size={24} color="#0f172a" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  driverOverlayStyles.searchBarPill,
                  selectedRoute && driverOverlayStyles.searchBarPillSelected,
                ]}
                activeOpacity={0.85}
                onPress={openTerminalPicker}
              >
                <Text
                  style={[
                    driverOverlayStyles.searchBarPillText,
                    !selectedRoute && driverOverlayStyles.searchBarPillPlaceholder,
                    selectedRoute && driverOverlayStyles.searchBarPillTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {selectedRoute ? terminalPairLabel : terminalPairLabel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.85}
                onPress={() => router.push('/notifications')}
              >
                <Ionicons name="notifications-outline" size={22} color="#0f172a" />
                {unreadCount > 0 ? <View style={styles.notificationDot} /> : null}
              </TouchableOpacity>
            </View>
          )}

          {snapshot.activeTrip && cameraNotice ? (
            <View style={driverOverlayStyles.cameraNotice}>
              <Ionicons name="locate" size={14} color="#0f766e" />
              <Text style={driverOverlayStyles.cameraNoticeText}>{cameraNotice}</Text>
            </View>
          ) : null}

          {snapshot.activeTrip && activeVehicle && recenterButtonBottom !== null ? (
            <TouchableOpacity
              style={[
                driverOverlayStyles.recenterButton,
                { bottom: recenterButtonBottom },
              ]}
              activeOpacity={0.9}
              onPress={centerCameraOnActiveVehicle}
            >
              <Ionicons name="locate" size={18} color="#0f172a" />
            </TouchableOpacity>
          ) : null}

          {!snapshot.activeTrip ? (
            <View style={driverOverlayStyles.startTripContainer}>
              <View style={driverOverlayStyles.preTripCard}>
                <Text style={driverOverlayStyles.preTripEyebrow}>{routeSetupStatus}</Text>
                <Text style={driverOverlayStyles.preTripTitle}>{terminalPairLabel}</Text>
                <Text style={driverOverlayStyles.preTripText}>{routeSelectionSummary}</Text>
              </View>

              {actionHint ? <Text style={driverOverlayStyles.hintText}>{actionHint}</Text> : null}
              {actionError ? <Text style={driverOverlayStyles.errorText}>{actionError}</Text> : null}

              <TouchableOpacity
                style={[
                  driverOverlayStyles.startTripButton,
                  !canStartTrip && driverOverlayStyles.startTripButtonDisabled,
                ]}
                activeOpacity={0.85}
                disabled={!canStartTrip || isTripSubmitting}
                onPress={handleStartTrip}
              >
                {isTripSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={driverOverlayStyles.startTripButtonText}>LARGA</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
            {isTripPanelMounted ? (
            <Animated.View
              style={[
                driverOverlayStyles.tripInfoPanel,
                { transform: [{ translateY: tripPanelTranslateY }] },
              ]}
              onLayout={(event) => {
                const nextHeight = Math.round(event.nativeEvent.layout.height);

                if (nextHeight !== tripPanelHeight) {
                  setTripPanelHeight(nextHeight);
                }
              }}
            >
              <Pressable
                style={driverOverlayStyles.panelHandleButton}
                onPress={collapseTripPanel}
              >
                <View style={driverOverlayStyles.panelHandle} />
                <View style={driverOverlayStyles.panelHandleRow}>
                  <Text style={driverOverlayStyles.panelHandleLabel}>
                    Hide trip details
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color="#94a3b8"
                  />
                </View>
              </Pressable>

              <View style={driverOverlayStyles.tripMetricGrid}>
                <View style={driverOverlayStyles.tripMetricCard}>
                  <View style={driverOverlayStyles.tripMetricHeader}>
                    <Ionicons name="speedometer-outline" size={18} color="#16a34a" />
                    <Text style={driverOverlayStyles.tripMetricLabel}>Speed</Text>
                  </View>
                  <Text style={driverOverlayStyles.tripMetricValue}>{activeSpeedMetric}</Text>
                </View>

                <View style={driverOverlayStyles.tripMetricCard}>
                  <View style={driverOverlayStyles.tripMetricHeader}>
                    <Ionicons name="resize-outline" size={18} color="#16a34a" />
                    <Text style={driverOverlayStyles.tripMetricLabel}>Distance</Text>
                  </View>
                  <Text style={driverOverlayStyles.tripMetricValue}>{activeDistanceMetric}</Text>
                </View>

                <View style={driverOverlayStyles.tripMetricCard}>
                  <View style={driverOverlayStyles.tripMetricHeader}>
                    <Ionicons name="time-outline" size={18} color="#16a34a" />
                    <Text style={driverOverlayStyles.tripMetricLabel}>ETA</Text>
                  </View>
                  <Text style={driverOverlayStyles.tripMetricValue}>{activeEtaMetric}</Text>
                </View>

                <View style={driverOverlayStyles.tripMetricCard}>
                  <View style={driverOverlayStyles.tripMetricHeader}>
                    <Ionicons name="flag-outline" size={18} color="#16a34a" />
                    <Text style={driverOverlayStyles.tripMetricLabel}>Next Terminal</Text>
                  </View>
                  <Text style={driverOverlayStyles.tripMetricValue} numberOfLines={2}>
                    {activeNextTerminalLabel}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  driverOverlayStyles.signalNotice,
                  snapshot.activeTrip.locationStatus === 'live'
                    ? driverOverlayStyles.signalNoticeLive
                    : driverOverlayStyles.signalNoticeWarning,
                ]}
              >
                <Ionicons
                  name={snapshot.activeTrip.locationStatus === 'live' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={snapshot.activeTrip.locationStatus === 'live' ? '#0f766e' : '#b45309'}
                />
                <Text style={driverOverlayStyles.signalNoticeText}>{activeSignalText}</Text>
              </View>

              {activeGuidanceWarning ? (
                <View style={driverOverlayStyles.guidanceNotice}>
                  <Ionicons name="navigate-circle" size={16} color="#0f766e" />
                  <Text style={driverOverlayStyles.guidanceNoticeText}>{activeGuidanceWarning}</Text>
                </View>
              ) : null}

              {actionError ? <Text style={driverOverlayStyles.errorText}>{actionError}</Text> : null}

              <TouchableOpacity
                style={driverOverlayStyles.stopButton}
                activeOpacity={0.85}
                disabled={isTripSubmitting}
                onPress={handleEndTrip}
              >
                {isTripSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={driverOverlayStyles.stopButtonText}>STOP</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
            ) : (
              <Pressable
                style={driverOverlayStyles.collapsedTripPanelControl}
                onPress={expandTripPanel}
              >
                <View style={driverOverlayStyles.panelHandle} />
                <View style={driverOverlayStyles.panelHandleRow}>
                  <Text style={driverOverlayStyles.panelHandleLabel}>Show trip details</Text>
                  <Ionicons name="chevron-up" size={16} color="#94a3b8" />
                </View>
              </Pressable>
            )}
            </>
          )}
        </>
      ) : null}

      <SettingsDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const driverOverlayStyles = StyleSheet.create({
  tripStatusBar: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    zIndex: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  tripStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tripStatusBadgeLive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tripStatusBadgeWarning: {
    backgroundColor: 'rgba(255, 244, 214, 0.28)',
  },
  tripStatusBadgePaused: {
    backgroundColor: 'rgba(254, 226, 226, 0.28)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveDotMuted: {
    opacity: 0.72,
  },
  tripStatusLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tripStatusRoute: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  notificationDotWhite: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  cameraNotice: {
    position: 'absolute',
    top: 128,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(236, 253, 245, 0.96)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cameraNoticeText: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1fae5',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  collapsedTripPanelControl: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: TRIP_PANEL_COLLAPSED_CONTROL_BOTTOM,
    minHeight: TRIP_PANEL_COLLAPSED_CONTROL_HEIGHT,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
  },
  vehicleMarker: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationMarkerWrap: {
    alignItems: 'center',
    minWidth: 120,
  },
  destinationLabelBubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 6,
  },
  destinationLabelText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  destinationMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  destinationMarkerStem: {
    width: 2,
    height: 12,
    backgroundColor: '#10b981',
    opacity: 0.9,
  },
  destinationTerminalLabel: {
    marginTop: 4,
    maxWidth: 120,
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
  },
  setupTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  setupCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  setupSubtitle: {
    marginTop: 10,
    marginHorizontal: 16,
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
  },
  selectionCardRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginHorizontal: 16,
    gap: 10,
  },
  selectionCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectionCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  selectionCardLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  selectionCardValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    paddingRight: 18,
  },
  selectionCardPlaceholder: {
    color: '#94a3b8',
  },
  selectionClearButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  routeSummaryCard: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  routeSummaryCardReady: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  routeSummaryCardWarning: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  routeSummaryStatus: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  routeSummaryTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  routeSummaryText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
  },
  pickerSectionLabel: {
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 6,
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pickerSubsectionLabel: {
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 20,
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pickerItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  pickerItemDisabled: {
    opacity: 0.88,
    backgroundColor: '#f8fafc',
  },
  pickerItemIcon: {
    marginRight: 12,
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerReferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pickerReferenceBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#eef2f7',
  },
  pickerReferenceBadgeText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  pickerItemTextDisabled: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  pickerItemMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  pickerItemMetaWarning: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  searchBarPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBarPillSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  searchBarPillText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchBarPillPlaceholder: {
    color: '#94a3b8',
  },
  searchBarPillTextSelected: {
    color: '#ffffff',
  },
  startTripContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    gap: 8,
  },
  preTripCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 16,
    paddingVertical: 15,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  preTripEyebrow: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  preTripTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  preTripText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
  },
  hintText: {
    color: '#10b981',
    fontSize: 12,
    textAlign: 'center',
  },
  startTripButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startTripButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  startTripButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tripInfoPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#ffffff',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  panelHandleButton: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  panelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
  },
  panelHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  panelHandleLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tripMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tripMetricCard: {
    width: '48%',
    minHeight: 104,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dcfce7',
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'space-between',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  tripMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripMetricLabel: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tripMetricValue: {
    color: '#0f172a',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  signalNotice: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  signalNoticeLive: {
    backgroundColor: '#ecfeff',
  },
  signalNoticeWarning: {
    backgroundColor: '#fffbeb',
  },
  signalNoticeText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  guidanceNotice: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ecfdf5',
  },
  guidanceNoticeText: {
    flex: 1,
    color: '#0f766e',
    fontSize: 12,
    lineHeight: 18,
  },
  stopButton: {
    backgroundColor: '#ef4444',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    marginVertical: 4,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
