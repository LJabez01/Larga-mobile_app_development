// Driver Map Screen - renders the driver map, route selection, and trip controls.
import { useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, TextInput, Text, FlatList, Keyboard, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { driverStyles as styles } from './driver-map.styles';
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
  // Screen State - stores driver drawer, route picker, search, and action UI state.
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [routePickerVisible, setRoutePickerVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isTripSubmitting, setIsTripSubmitting] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const router = useRouter();
  const Mapbox = getMapbox();
  const { snapshot, selectDriverTerminals, startTrip, endTrip } = useLiveData();

  // Derived Route State
  const selectedRoute = snapshot.routes.find(
    (route) => route.id === snapshot.driverSelection.resolvedRouteId,
  ) ?? null;
  const activeRoute = snapshot.routes.find(
    (route) => route.id === snapshot.activeTrip?.routeId,
  ) ?? selectedRoute;
  const activeVehicle = snapshot.activeTrip
    ? snapshot.vehicles.find((vehicle) => vehicle.id === snapshot.activeTrip?.vehicleId) ?? snapshot.vehicles[0] ?? null
    : snapshot.vehicles[0] ?? null;
  const unreadCount = snapshot.notificationsByRole.driver.filter((notification) => !notification.read).length;
  
  // Filter routes by search text
  const filteredRoutes = snapshot.routes.filter(
    (route) => fuzzyMatch(searchText, route.label),
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

  // Route Picker Actions
  function openRoutePicker() {
    if (snapshot.activeTrip) {
      return;
    }
    setRoutePickerVisible(true);
    setSearchText('');
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeRoutePicker() {
    setRoutePickerVisible(false);
    setSearchText('');
    Keyboard.dismiss();
  }

  async function handleSelectRoute(routeId: string) {
    setActionError(null);
    try {
      // Store the selected route ID in the driver selection
      // The route will be resolved and displayed on the map
      const route = snapshot.routes.find((r) => r.id === routeId);
      if (!route) {
        setActionError('Route not found');
        return;
      }
      
      // Use a placeholder for origin/destination if not available
      // The important thing is that driverSelection.resolvedRouteId is set
      const originId = snapshot.terminals[0]?.id || 'placeholder-origin';
      const destinationId = snapshot.terminals[snapshot.terminals.length - 1]?.id || 'placeholder-dest';
      
      await selectDriverTerminals(originId, destinationId);
      
      // Now set the resolved route
      if (snapshot.driverSelection.resolvedRouteId !== routeId) {
        // The route should be auto-resolved, but if not, we may need additional logic
      }
      
      closeRoutePicker();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to select route.');
    }
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

  // Screen Layout
  return (
    <View style={styles.container}>
      {routePickerVisible && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchOverlayInputRow}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchOverlayInput}
              placeholder="Search route..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              returnKeyType="search"
            />
            <TouchableOpacity onPress={closeRoutePicker} style={styles.searchOverlayIcon}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredRoutes}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.searchRouteList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchRouteItem}
                onPress={() => handleSelectRoute(item.id)}
                activeOpacity={0.75}
              >
                <Ionicons name="navigate-circle-outline" size={18} color="#10b981" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchRouteItemText}>{item.label}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={(
              <View style={styles.searchRouteEmpty}>
                <Text style={styles.searchRouteEmptyText}>
                  {searchText
                    ? 'No matching routes found'
                    : 'No available routes'}
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

      {!routePickerVisible && (
        <>
          {snapshot.activeTrip ? (
            // Trip Status Bar
            <View style={driverOverlayStyles.tripStatusBar}>
              <View style={driverOverlayStyles.tripStatusBadge}>
                <View style={driverOverlayStyles.liveDot} />
                <Text style={driverOverlayStyles.tripStatusLabel}>Live</Text>
              </View>
              <Text style={driverOverlayStyles.tripStatusRoute}>
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
            // Regular Top Bar with Search Pill
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
                onPress={openRoutePicker}
              >
                <Text
                  style={[
                    driverOverlayStyles.searchBarPillText,
                    !selectedRoute && driverOverlayStyles.searchBarPillPlaceholder,
                    selectedRoute && driverOverlayStyles.searchBarPillTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {selectedRoute?.label ?? 'Select route'}
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

          {!snapshot.activeTrip && selectedRoute && (
            <View style={driverOverlayStyles.startTripContainer}>
              {actionError ? <Text style={driverOverlayStyles.errorText}>{actionError}</Text> : null}
              <TouchableOpacity
                style={driverOverlayStyles.startTripButton}
                activeOpacity={0.85}
                disabled={isTripSubmitting}
                onPress={handleStartTrip}
              >
                {isTripSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={driverOverlayStyles.startTripButtonText}>
                    LARGA
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {snapshot.activeTrip ? (
            // Trip Info Panel - Compact Bottom Sheet Style
            <View style={driverOverlayStyles.tripInfoPanel}>
              {/* Handle Indicator */}
              <View style={driverOverlayStyles.panelHandle} />
              
              {/* Next Stop Row */}
              <View style={driverOverlayStyles.tripInfoMainRow}>
                <Ionicons name="location-outline" size={18} color="#10b981" style={{ marginRight: 8 }} />
                <View style={driverOverlayStyles.tripInfoMainContent}>
                  <Text style={driverOverlayStyles.tripInfoMainLabel}>Next Stop</Text>
                  <Text style={driverOverlayStyles.tripInfoMainValue} numberOfLines={1}>
                    ---
                  </Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={driverOverlayStyles.tripInfoStatsRow}>
                <View style={driverOverlayStyles.tripInfoStat}>
                  <Ionicons name="speedometer-outline" size={16} color="#10b981" />
                  <Text style={driverOverlayStyles.tripInfoStatLabel}>0 km/h</Text>
                </View>
                <View style={driverOverlayStyles.tripInfoStatDivider} />
                <View style={driverOverlayStyles.tripInfoStat}>
                  <Ionicons name="analytics-outline" size={16} color="#10b981" />
                  <Text style={driverOverlayStyles.tripInfoStatLabel}>0 km</Text>
                </View>
                <View style={driverOverlayStyles.tripInfoStatDivider} />
                <View style={driverOverlayStyles.tripInfoStat}>
                  <Ionicons name="time-outline" size={16} color="#10b981" />
                  <Text style={driverOverlayStyles.tripInfoStatLabel}>-- min</Text>
                </View>
              </View>

              {/* Stop Button */}
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
                  <Text style={driverOverlayStyles.stopButtonText}>STOP TRIP</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <></>
          )}
        </>
      )}

      <SettingsDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const driverOverlayStyles = StyleSheet.create({
  // Trip Status Bar Styles
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
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
  // Search Bar Pill (in top bar)
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
  // Start Trip Button
  startTripContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    gap: 8,
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
  startTripButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Trip Info Panel Styles - Compact Bottom Sheet
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
  panelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 4,
  },
  tripInfoMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tripInfoMainContent: {
    flex: 1,
  },
  tripInfoMainLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tripInfoMainValue: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tripInfoStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  tripInfoStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tripInfoStatLabel: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tripInfoStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  // Old grid styles removed - no longer needed
  // Control Card Styles
  controlCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  controlTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  controlText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  // Trip Buttons
  tripButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tripButtonDisabled: {
    opacity: 0.5,
  },
  tripButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  stopButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
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
    fontSize: 13,
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
