import { useState } from 'react';
import { View, TouchableOpacity, TextInput, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './map-screen.styles';
import SettingsDrawer from './settings'; // adjust path if needed

type MapboxModule = {
  setAccessToken: (token: string) => void;
  MapView: any;
  Camera: any;
};

const STA_MARIA_BOUNDS = {
  ne: [121.03, 14.89],
  sw: [120.96, 14.8],
};

const env = process.env as unknown as Record<string, string | undefined>;

const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoibDFicmFoIiwiYSI6ImNtbzhvcms4bTAwb2MyeXB3NzcyYW93Nm0ifQ.jpCK5yv2rGrEe54aBCKzyg';
const PROFILE_IMAGE_URI = 'https://cdn.corenexis.com/files/c/6997128720.png';

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
  const [drawerVisible, setDrawerVisible] = useState(false); // 👈 new
  const Mapbox = getMapbox();

  if (!Mapbox) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Map view is unavailable</Text>
        <Text style={styles.fallbackText}>
          This build does not include native Mapbox support. Use a development build or EAS build to enable map rendering.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/standard"
        scaleBarEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera
          zoomLevel={15}
          centerCoordinate={[120.9991, 14.8463]}
          animationMode="flyTo"
          minZoomLevel={11}
          maxZoomLevel={18}
          maxBounds={STA_MARIA_BOUNDS}
          pitch={60}
        />
      </Mapbox.MapView>

      <View style={styles.topBar}>
        {/* 👇 opens the drawer */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setDrawerVisible(true)}
        >
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Select Route..."
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity style={styles.iconButton}>
          <Image
            source={{ uri: PROFILE_IMAGE_URI }}
            style={styles.profileImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* 👇 drawer rendered over everything */}
      <SettingsDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </View>
  );
}