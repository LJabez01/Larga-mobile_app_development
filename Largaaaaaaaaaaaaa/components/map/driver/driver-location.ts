import type { StartTripInput } from '@/services/contracts/live-data';
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

let cachedLocationModule: ExpoLocationModule | null = null;

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

function toStartTripInput(location: LocationObjectLike): StartTripInput {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    heading: typeof location.coords.heading === 'number' ? location.coords.heading : null,
    speed: typeof location.coords.speed === 'number' ? location.coords.speed : null,
    accuracy: typeof location.coords.accuracy === 'number' ? location.coords.accuracy : null,
    recordedAt: new Date(location.timestamp).toISOString(),
  };
}

export async function requestDriverLocationPermission() {
  const Location = await getLocationModule();
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    throw new Error('Location permission is required before starting a live driver trip.');
  }
}

export async function getDriverCurrentLocation() {
  const Location = await getLocationModule();
  await requestDriverLocationPermission();

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return toStartTripInput(location as LocationObjectLike);
}

export async function watchDriverLocation(
  onLocation: (location: StartTripInput) => void,
) {
  const Location = await getLocationModule();
  await requestDriverLocationPermission();

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    (location) => {
      onLocation(toStartTripInput(location as LocationObjectLike));
    },
  );
}
