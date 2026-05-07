import { useState } from 'react';
import { View, TouchableOpacity, TextInput, Text, Image } from 'react-native';
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
const SEARCH_PLACEHOLDER = 'Select route';
const SEARCH_PLACEHOLDER_COLOR = '#94a3b8';
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

export default function MapScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [rideInfoVisible, setRideInfoVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<'bus' | 'jeep' | null>(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState<[number, number] | null>(null);
  const router = useRouter();
  const Mapbox = getMapbox();

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

      <View style={styles.topBarRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setDrawerVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="menu" size={24} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={19} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder={SEARCH_PLACEHOLDER}
            placeholderTextColor={SEARCH_PLACEHOLDER_COLOR}
          />
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.85}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color="#0f172a" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

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