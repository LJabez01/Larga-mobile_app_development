// Shared Map Screen - renders the common map shell used by app-specific map views.
import { useState, useRef } from 'react';
import { View, TouchableOpacity, TextInput, Text, Image, FlatList, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from './map-screen.styles';
import SettingsDrawer from '../settings';
import RideInfoPanel from './RideInfoPanel';

type MapboxModule = {
  setAccessToken: (token: string) => void;
  MapView: any;
  Camera: any;
  MarkerView: any;
};

const STA_MARIA_BOUNDS = {
  ne: [121.03, 14.89],
  sw: [120.96, 14.8],
};

const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoibDFicmFoIiwiYSI6ImNtbzhvcms4bTAwb2MyeXB3NzcyYW93Nm0ifQ.jpCK5yv2rGrEe54aBCKzyg';
const MAP_STYLE_URL = 'mapbox://styles/mapbox/standard';
const INITIAL_CENTER_COORDINATE = [120.9991, 14.8463] as const;
const BUS_ICON = require('../../assets/images/bus-icon.jpg');
const JEEP_ICON = require('../../assets/images/jeep-icon.jpg');

function getMapbox(): MapboxModule | null {
  try {
    const mapbox = require('@rnmapbox/maps').default as MapboxModule;
    mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
    return mapbox;
  } catch {
    return null;
  }
}

const ROUTE_OPTIONS = [
  'Santa Maria - Norzagaray',
  'Santa Maria - Halang',
  'Santa Maria - San Jose',
];

// Simple fuzzy match: checks if all characters in query appear in order in the target
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

export default function MapScreen() {
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

  if (!Mapbox) {
    return (
      <View style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <View style={styles.fallbackIconWrap}>
            <Ionicons name="map-outline" size={28} color="#158251" />
          </View>
          <Text style={styles.fallbackEyebrow}>Map Experience</Text>
          <Text style={styles.fallbackTitle}>Map view is unavailable</Text>
          <Text style={styles.fallbackText}>
            This build does not include native Mapbox support. Use a development build or EAS build to enable map rendering.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Expanded search overlay ── */}
      {searchExpanded && (
        <View style={styles.searchOverlay}>
          {/* Search input row */}
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

          {/* Route list */}
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
          zoomLevel={15}
          centerCoordinate={INITIAL_CENTER_COORDINATE}
          animationMode="flyTo"
          minZoomLevel={11}
          maxZoomLevel={18}
          maxBounds={STA_MARIA_BOUNDS}
          pitch={60}
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

          {/* Search bar pill — tapping always opens search */}
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
