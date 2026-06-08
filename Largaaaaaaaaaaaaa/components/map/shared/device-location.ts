import { requireOptionalNativeModule } from 'expo-modules-core';

type ExpoLocationModule = typeof import('expo-location');

interface LocationObjectLike {
  coords: {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    accuracy: number | null;
  };
  timestamp: number;
}

export interface DeviceLocationSnapshot {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recordedAt: string;
}

let cachedLocationModule: ExpoLocationModule | null = null;

// Location Module Loader - lazily loads Expo Location and reports a rebuild-ready error when native support is missing.
async function getLocationModule() {
  if (cachedLocationModule) {
    return cachedLocationModule;
  }

  const nativeLocationModule = requireOptionalNativeModule('ExpoLocation');

  if (!nativeLocationModule) {
    throw new Error(
      'The current app build does not include live GPS support yet. Rebuild the app after installing the location module.',
    );
  }

  try {
    cachedLocationModule = await import('expo-location');
    return cachedLocationModule;
  } catch {
    throw new Error(
      'The current app build does not include live GPS support yet. Rebuild the app after installing the location module.',
    );
  }
}

// Location Snapshot Mapper - converts Expo's native location object into the app's shared location contract.
function toDeviceLocationSnapshot(location: LocationObjectLike): DeviceLocationSnapshot {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    heading: typeof location.coords.heading === 'number' ? location.coords.heading : null,
    speed: typeof location.coords.speed === 'number' ? location.coords.speed : null,
    accuracy: typeof location.coords.accuracy === 'number' ? location.coords.accuracy : null,
    recordedAt: new Date(location.timestamp).toISOString(),
  };
}

// Foreground Permission Request - asks the user for location access before live map publishing begins.
export async function requestForegroundLocationPermission() {
  const Location = await getLocationModule();
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    throw new Error('Location permission is required before sharing your live map position.');
  }
}

// Current Device Location - resolves one balanced-accuracy position for initial map presence.
export async function getCurrentDeviceLocation() {
  const Location = await getLocationModule();
  await requestForegroundLocationPermission();

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return toDeviceLocationSnapshot(location as LocationObjectLike);
}

// Device Location Watch - streams balanced GPS updates for live driver and commuter map state.
export async function watchDeviceLocation(
  onLocation: (location: DeviceLocationSnapshot) => void,
) {
  const Location = await getLocationModule();
  await requestForegroundLocationPermission();

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    (location) => {
      onLocation(toDeviceLocationSnapshot(location as LocationObjectLike));
    },
  );
}
