import { useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, TextInput, Text, Image, FlatList, Keyboard, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { commuterStyles as styles } from './commuter-map.styles';
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
import RideInfoPanel from '../RideInfoPanel';
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

export default function CommuterMapScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [rideInfoVisible, setRideInfoVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<'bus' | 'jeep' | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const router = useRouter();
  const { snapshot } = useLiveData();
  const Mapbox = getMapbox();

  const filteredRoutes = snapshot.routes.filter((route) => fuzzyMatch(searchText, route.label));
  const visibleVehicles = selectedRouteId
    ? snapshot.vehicles.filter((vehicle) => vehicle.routeId === selectedRouteId)
    : snapshot.vehicles;
  const selectedRouteLabel = snapshot.routes.find((route) => route.id === selectedRouteId)?.label ?? null;
  const unreadCount = snapshot.notificationsByRole.commuter.filter((notification) => !notification.read).length;

  function openSearch() {
    setSearchExpanded(true);
    setSearchText('');
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeSearch() {
    setSearchExpanded(false);
    setSearchText('');
    Keyboard.dismiss();
  }

  function handleSelectRoute(routeId: string) {
    setSelectedRouteId(routeId);
    closeSearch();
  }

  if (!Mapbox) return <MapFallback />;

  return (
    <View style={styles.container}>
      {searchExpanded && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchOverlayInputRow}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchOverlayInput}
              placeholder="Search / Select your Route"
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              returnKeyType="search"
            />
            <TouchableOpacity onPress={closeSearch} style={styles.searchOverlayIcon}>
              <Ionicons name="search" size={20} color="#64748b" />
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
                <Ionicons name="navigate-outline" size={18} color="#10b981" style={{ marginRight: 12 }} />
                <Text style={styles.searchRouteItemText}>{item.label}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.searchRouteEmpty}>
                <Text style={styles.searchRouteEmptyText}>No routes found</Text>
              </View>
            }
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

        {visibleVehicles.map((vehicle) => (
          <Mapbox.MarkerView key={vehicle.id} coordinate={vehicle.coordinate}>
            <TouchableOpacity
              style={[
                styles.mapVehicleButton,
                vehicle.type === 'bus' ? styles.mapVehicleButtonBus : styles.mapVehicleButtonJeep,
                selectedVehicle === vehicle.type && styles.mapVehicleButtonActive,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                setSelectedVehicle(vehicle.type);
                setRideInfoVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`View ${vehicle.type} details`}
            >
              <View style={styles.vehicleComingRing} />
              <Image source={vehicle.type === 'bus' ? BUS_ICON : JEEP_ICON} style={styles.mapVehicleIcon} />
            </TouchableOpacity>
          </Mapbox.MarkerView>
        ))}
      </Mapbox.MapView>

      {!searchExpanded && (
        <>
          <View style={styles.topBarRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setDrawerVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="menu" size={24} color="#0f172a" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.searchBar, selectedRouteLabel ? styles.searchBarSelected : null]}
              onPress={openSearch}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.searchInput,
                  selectedRouteLabel ? styles.searchInputSelected : styles.searchInputPlaceholder,
                ]}
                numberOfLines={1}
              >
                {selectedRouteLabel ?? 'Select route'}
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

          <View style={commuterOverlayStyles.statusCard}>
            <Text style={commuterOverlayStyles.statusTitle}>
              {snapshot.activeTrip ? 'Live route activity' : 'Waiting for a live trip'}
            </Text>
            <Text style={commuterOverlayStyles.statusText}>
              {snapshot.activeTrip
                ? `${snapshot.activeTrip.routeLabel} is active. ${visibleVehicles.length} visible vehicle${visibleVehicles.length === 1 ? '' : 's'} on your current filter.`
                : 'Ask the UI team to start a mock driver trip, or switch to Firebase mode when real live data is ready.'}
            </Text>
          </View>
        </>
      )}

      <SettingsDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      <RideInfoPanel
        visible={rideInfoVisible}
        vehicleType={selectedVehicle}
        onClose={() => {
          setRideInfoVisible(false);
          setSelectedVehicle(null);
        }}
      />
    </View>
  );
}

const commuterOverlayStyles = StyleSheet.create({
  statusCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
  },
});
