// Driver Map Screen - renders the driver map, terminal selection, and trip controls.
import { useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, TextInput, Text, FlatList, Keyboard, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { driverStyles as styles } from './driver-map.styles';
import { getSelectableTerminalIds } from '@/lib/domain/transport';
import {
  getMapbox,
  BUS_ICON,
  JEEP_ICON,
  MAP_STYLE_URL,
  INITIAL_CENTER_COORDINATE,
  STA_MARIA_BOUNDS,
  MAP_ZOOM,
  MAP_PITCH,
} from '../shared/mapbox.utils';
import MapFallback from '../shared/MapFallback';
import SettingsDrawer from '../../settings';
import { useLiveData } from '@/components/providers/LiveDataProvider';
import { useAppSession } from '@/components/providers/AppSessionProvider';

type TerminalPickerTarget = 'origin' | 'destination' | null;

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();

  if (!q) {
    return true;
  }

  let queryIndex = 0;

  for (let index = 0; index < t.length && queryIndex < q.length; index += 1) {
    if (t[index] === q[queryIndex]) {
      queryIndex += 1;
    }
  }

  return queryIndex === q.length;
}

export default function DriverMapScreen() {
  // Screen State - stores driver drawer, picker, search, and action UI state.
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [terminalPickerTarget, setTerminalPickerTarget] = useState<TerminalPickerTarget>(null);
  const [searchText, setSearchText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isTripSubmitting, setIsTripSubmitting] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const router = useRouter();
  const Mapbox = getMapbox();
  const { snapshot, selectDriverTerminals, startTrip, endTrip } = useLiveData();
  const { isMockMode } = useAppSession();

  // Derived Route State - resolves the active route, vehicle marker, and picker options for the UI.
  const selectedOriginLabel = snapshot.terminals.find(
    (terminal) => terminal.id === snapshot.driverSelection.originTerminalId,
  )?.label ?? null;
  const selectedDestinationLabel = snapshot.terminals.find(
    (terminal) => terminal.id === snapshot.driverSelection.destinationTerminalId,
  )?.label ?? null;
  const resolvedRoute = snapshot.routes.find(
    (route) => route.id === snapshot.driverSelection.resolvedRouteId,
  ) ?? null;
  const activeRoute = snapshot.routes.find(
    (route) => route.id === snapshot.activeTrip?.routeId,
  ) ?? resolvedRoute;
  const activeVehicle = snapshot.activeTrip
    ? snapshot.vehicles.find((vehicle) => vehicle.id === snapshot.activeTrip?.vehicleId) ?? snapshot.vehicles[0] ?? null
    : snapshot.vehicles[0] ?? null;
  const unreadCount = snapshot.notificationsByRole.driver.filter((notification) => !notification.read).length;
  const selectableTerminalIds = useMemo(
    () => getSelectableTerminalIds(
      snapshot.routes,
      terminalPickerTarget ?? 'origin',
      terminalPickerTarget === 'origin'
        ? snapshot.driverSelection.destinationTerminalId
        : snapshot.driverSelection.originTerminalId,
    ),
    [
      snapshot.driverSelection.destinationTerminalId,
      snapshot.driverSelection.originTerminalId,
      snapshot.routes,
      terminalPickerTarget,
    ],
  );
  const filteredTerminals = snapshot.terminals.filter(
    (terminal) => selectableTerminalIds.has(terminal.id) && fuzzyMatch(searchText, terminal.label),
  );
  const routeLineFeature = useMemo(
    () => (
      activeRoute
        ? {
            type: 'Feature' as const,
            properties: {
              routeId: activeRoute.id,
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: activeRoute.coordinates,
            },
          }
        : null
    ),
    [activeRoute],
  );

  // Terminal Picker Actions - manage opening, closing, and applying terminal selections.
  function openTerminalPicker(target: Exclude<TerminalPickerTarget, null>) {
    if (snapshot.activeTrip) {
      return;
    }

    setTerminalPickerTarget(target);
    setSearchText('');
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeTerminalPicker() {
    setTerminalPickerTarget(null);
    setSearchText('');
    Keyboard.dismiss();
  }

  async function handleSelectTerminal(terminalId: string) {
    setActionError(null);

    const nextOrigin = terminalPickerTarget === 'origin'
      ? terminalId
      : snapshot.driverSelection.originTerminalId;
    const nextDestination = terminalPickerTarget === 'destination'
      ? terminalId
      : snapshot.driverSelection.destinationTerminalId;

    await selectDriverTerminals(nextOrigin, nextDestination);
    closeTerminalPicker();
  }

  // Trip Actions - start or end the active driver trip through the live-data service.
  async function handleStartTrip() {
    setActionError(null);
    setIsTripSubmitting(true);

    try {
      await startTrip();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to start trip right now.');
    } finally {
      setIsTripSubmitting(false);
    }
  }

  async function handleEndTrip() {
    setActionError(null);
    setIsTripSubmitting(true);

    try {
      await endTrip();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to end trip right now.');
    } finally {
      setIsTripSubmitting(false);
    }
  }

  if (!Mapbox) {
    return <MapFallback />;
  }

  // Screen Layout - renders the map, terminal picker overlay, and driver trip controls.
  return (
    <View style={styles.container}>
      {terminalPickerTarget && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchOverlayInputRow}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchOverlayInput}
              placeholder={`Search ${terminalPickerTarget === 'origin' ? 'origin' : 'destination'} terminal`}
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              returnKeyType="search"
            />
            <TouchableOpacity onPress={closeTerminalPicker} style={styles.searchOverlayIcon}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredTerminals}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.searchRouteList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchRouteItem}
                onPress={() => handleSelectTerminal(item.id)}
                activeOpacity={0.75}
              >
                <Ionicons name="business-outline" size={18} color="#10b981" style={{ marginRight: 12 }} />
                <Text style={styles.searchRouteItemText}>{item.label}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={(
              <View style={styles.searchRouteEmpty}>
                <Text style={styles.searchRouteEmptyText}>
                  {searchText
                    ? 'No matching terminals found'
                    : terminalPickerTarget === 'origin'
                      ? 'No supported origin terminals for the current destination'
                      : 'No supported destination terminals for the current origin'}
                </Text>
              </View>
            )}
          />
        </View>
      )}

      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_STYLE_URL}
        scaleBarEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera
          zoomLevel={MAP_ZOOM.initial}
          centerCoordinate={INITIAL_CENTER_COORDINATE}
          animationMode="flyTo"
          minZoomLevel={MAP_ZOOM.min}
          maxZoomLevel={MAP_ZOOM.max}
          maxBounds={STA_MARIA_BOUNDS}
          pitch={MAP_PITCH}
        />

        {routeLineFeature ? (
          <Mapbox.ShapeSource id="driver-route-source" shape={routeLineFeature}>
            <Mapbox.LineLayer
              id="driver-route-line"
              style={{
                lineColor: '#10b981',
                lineWidth: 5,
                lineOpacity: 0.9,
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}

        {activeVehicle ? (
          <Mapbox.MarkerView coordinate={activeVehicle.coordinate}>
            <View style={driverOverlayStyles.vehicleMarker}>
              <Image
                source={activeVehicle.type === 'bus' ? BUS_ICON : JEEP_ICON}
                style={driverOverlayStyles.vehicleMarkerImage}
              />
            </View>
          </Mapbox.MarkerView>
        ) : null}
      </Mapbox.MapView>

      {!terminalPickerTarget && (
        <>
          <View style={styles.topBarRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setDrawerVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="menu" size={24} color="#0f172a" />
            </TouchableOpacity>

            <View style={driverOverlayStyles.topBarSpacer} />

            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.85}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color="#0f172a" />
              {unreadCount > 0 ? <View style={styles.notificationDot} /> : null}
            </TouchableOpacity>
          </View>

          <View style={driverOverlayStyles.selectionCard}>
            <Text style={driverOverlayStyles.selectionTitle}>Choose route terminals</Text>

            <TouchableOpacity
              style={[driverOverlayStyles.selectionField, snapshot.activeTrip && driverOverlayStyles.selectionFieldDisabled]}
              activeOpacity={0.85}
              disabled={Boolean(snapshot.activeTrip)}
              onPress={() => openTerminalPicker('origin')}
            >
              <Text style={driverOverlayStyles.selectionLabel}>Origin</Text>
              <Text
                style={[
                  driverOverlayStyles.selectionValue,
                  !selectedOriginLabel && driverOverlayStyles.selectionPlaceholder,
                ]}
                numberOfLines={1}
              >
                {selectedOriginLabel ?? 'Select origin terminal'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[driverOverlayStyles.selectionField, snapshot.activeTrip && driverOverlayStyles.selectionFieldDisabled]}
              activeOpacity={0.85}
              disabled={Boolean(snapshot.activeTrip)}
              onPress={() => openTerminalPicker('destination')}
            >
              <Text style={driverOverlayStyles.selectionLabel}>Destination</Text>
              <Text
                style={[
                  driverOverlayStyles.selectionValue,
                  !selectedDestinationLabel && driverOverlayStyles.selectionPlaceholder,
                ]}
                numberOfLines={1}
              >
                {selectedDestinationLabel ?? 'Select destination terminal'}
              </Text>
            </TouchableOpacity>

            <Text style={driverOverlayStyles.selectionHint}>
              {activeRoute
                ? `Resolved route: ${activeRoute.label}`
                : selectedOriginLabel && selectedDestinationLabel
                  ? 'No supported route exists for that terminal pair yet.'
                  : 'Select two different terminals to resolve a route.'}
            </Text>
          </View>

          <View style={driverOverlayStyles.controlCard}>
            <Text style={driverOverlayStyles.controlTitle}>
              {snapshot.activeTrip ? 'Trip is active' : 'Driver trip control'}
            </Text>
            <Text style={driverOverlayStyles.controlText}>
              {snapshot.activeTrip
                ? `${snapshot.activeTrip.routeLabel} is active and publishing operational vehicle state.`
                : isMockMode
                  ? 'Choose two valid terminals, resolve the route, then start a mock trip.'
                  : 'Firebase mode is now route-first. Select terminals, resolve a stored route, then start one active trip.'}
            </Text>

            {actionError ? <Text style={driverOverlayStyles.errorText}>{actionError}</Text> : null}

            <TouchableOpacity
              style={[
                driverOverlayStyles.tripButton,
                !snapshot.activeTrip && !activeRoute && driverOverlayStyles.tripButtonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={(!snapshot.activeTrip && !activeRoute) || isTripSubmitting}
              onPress={snapshot.activeTrip ? handleEndTrip : handleStartTrip}
            >
              {isTripSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={driverOverlayStyles.tripButtonText}>
                  {snapshot.activeTrip ? 'End Trip' : 'Larga'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <SettingsDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const driverOverlayStyles = StyleSheet.create({
  topBarSpacer: {
    flex: 1,
  },
  vehicleMarker: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  vehicleMarkerImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  selectionCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 92,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  selectionTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  selectionField: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectionFieldDisabled: {
    opacity: 0.65,
  },
  selectionLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  selectionValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionPlaceholder: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  selectionHint: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
  },
  controlCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  controlTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  controlText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  tripButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripButtonDisabled: {
    opacity: 0.5,
  },
  tripButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 10,
  },
});
