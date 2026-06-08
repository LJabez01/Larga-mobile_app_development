import type { StartTripInput } from '@/services/contracts/live-data';
import {
  getCurrentDeviceLocation,
  requestForegroundLocationPermission,
  watchDeviceLocation,
} from '../shared/device-location';

// Driver Location Permission - validates that drivers can publish live trip GPS updates.
export async function requestDriverLocationPermission() {
  await requestForegroundLocationPermission();
}

// Driver Current Location - reads the driver's starting coordinate before trip creation.
export async function getDriverCurrentLocation() {
  return getCurrentDeviceLocation();
}

// Driver Location Watch - forwards shared GPS updates through the driver trip input contract.
export async function watchDriverLocation(
  onLocation: (location: StartTripInput) => void,
) {
  return watchDeviceLocation(onLocation);
}
