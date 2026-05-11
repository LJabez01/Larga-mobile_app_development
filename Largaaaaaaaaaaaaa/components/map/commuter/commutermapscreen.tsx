import { useState, useRef } from 'react';
import { View, TouchableOpacity, TextInput, Text, Image, FlatList, Keyboard } from 'react-native';
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

const ROUTE_OPTIONS = [
  'Santa Maria - Norzagaray',
  'Santa Maria - Halang',
  'Santa Maria - San Jose',
];

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function CommuterMapScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [rideInfoVisible, setRideInfoVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<'bus' | 'jeep' | null>(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState<[number, number] | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const router = useRouter();
  const Mapbox = getMapbox();

  const filteredRoutes = ROUTE_OPTIONS.filter((route) => fuzzyMatch(searchText, route));

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

  function handleSelectRoute(route: string) {
    setSelectedRoute(route);
    closeSearch();
  }

  if (!Mapbox) return <MapFallback />;

  return (
    <View style={styles.container}>
      {/* ── Expanded search overlay ── */}
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
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            style={styles.searchRouteList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchRouteItem}
                onPress={() => handleSelectRoute(item)}
                activeOpacity={0.75}
              >
                <Ionicons name="navigate-outline" size={18} color="#10b981" style={{ marginRight: 12 }} />
                <Text style={styles.searchRouteItemText}>{item}</Text>
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

        <Mapbox.MarkerView coordinate={[120.987, 14.843]}>
          <TouchableOpacity
            style={[
              styles.mapVehicleButton,
              styles.mapVehicleButtonBus,
              selectedVehicle === 'bus' && styles.mapVehicleButtonActive,
            ]}
            activeOpacity={0.85}
            onPress={() => {
              setSelectedVehicle('bus');
              setSelectedCoordinate([120.987, 14.843]);
              setRideInfoVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="View bus route"
          >
            <View style={styles.vehicleComingRing} />
            <Image source={BUS_ICON} style={styles.mapVehicleIcon} />
          </TouchableOpacity>
        </Mapbox.MarkerView>

        <Mapbox.MarkerView coordinate={[121.010, 14.852]}>
          <TouchableOpacity
            style={[
              styles.mapVehicleButton,
              styles.mapVehicleButtonJeep,
              selectedVehicle === 'jeep' && styles.mapVehicleButtonActive,
            ]}
            activeOpacity={0.85}
            onPress={() => {
              setSelectedVehicle('jeep');
              setSelectedCoordinate([121.010, 14.852]);
              setRideInfoVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="View jeep route"
          >
            <View style={styles.vehicleComingRing} />
            <Image source={JEEP_ICON} style={styles.mapVehicleIcon} />
          </TouchableOpacity>
        </Mapbox.MarkerView>
      </Mapbox.MapView>

      {/* ── Top bar (always visible when search is closed) ── */}
      {!searchExpanded && (
        <View style={styles.topBarRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setDrawerVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="menu" size={24} color="#0f172a" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.searchBar, selectedRoute ? styles.searchBarSelected : null]}
            onPress={openSearch}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.searchInput,
                selectedRoute ? styles.searchInputSelected : styles.searchInputPlaceholder,
              ]}
              numberOfLines={1}
            >
              {selectedRoute ?? 'Select route'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.85}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      )}

      <SettingsDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />

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