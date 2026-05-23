// Mapbox Utilities - centralizes shared map constants and helper accessors.
import type { ImageSourcePropType } from 'react-native';
import { resolveMapboxAccessToken } from '@/lib/config/mapbox';

export type MapboxModule = {
  setAccessToken: (token: string) => Promise<string | null> | void;
  getAccessToken?: () => Promise<string>;
  MapView: any;
  Camera: any;
  MarkerView: any;
  ShapeSource: any;
  LineLayer: any;
};

export const MAPBOX_ACCESS_TOKEN = resolveMapboxAccessToken(typeof process !== 'undefined' ? process.env : undefined);

// Keep the shared mobile map style on a stable classic style URL. The newer
// `standard` style path can silently fail on some RNMapbox/Android builds and
// leaves a black surface instead of a usable map.
export const MAP_STYLE_URL = 'mapbox://styles/mapbox/streets-v12';

// Province-wide map framing keeps the initial camera and bounds aligned to Bulacan,
// while still allowing the route-focused overlays to operate within the same shared map setup.
export const INITIAL_CENTER_COORDINATE: [number, number] = [120.94, 14.95];

export const STA_MARIA_BOUNDS = {
  ne: [121.2, 15.2],
  sw: [120.7, 14.72],
};

export const MAP_ZOOM = {
  initial: 10.2,
  min: 8.5,
  max: 18,
} as const;

export const MAP_PITCH = 60;

export const BUS_ICON: ImageSourcePropType = require('@/assets/images/bus-icon.png');
export const JEEP_ICON: ImageSourcePropType = require('@/assets/images/jeep-icon.png');
export const COMMUTER_ICON: ImageSourcePropType = require('@/assets/images/commuter-icon-marker.png');

let cachedMapboxModule: MapboxModule | null | undefined;
let mapboxReadyPromise: Promise<MapboxModule | null> | null = null;

export function getMapbox(): MapboxModule | null {
  if (cachedMapboxModule !== undefined) {
    return cachedMapboxModule;
  }

  try {
    cachedMapboxModule = require('@rnmapbox/maps').default as MapboxModule;
    return cachedMapboxModule;
  } catch {
    cachedMapboxModule = null;
    return null;
  }
}

export async function ensureMapboxConfigured() {
  if (mapboxReadyPromise) {
    return mapboxReadyPromise;
  }

  mapboxReadyPromise = (async () => {
    const mapbox = getMapbox();

    if (!mapbox) {
      return null;
    }

    await mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

    const accessToken = typeof mapbox.getAccessToken === 'function'
      ? await mapbox.getAccessToken().catch(() => null)
      : MAPBOX_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('Mapbox access token did not initialize.');
    }

    return mapbox;
  })().catch(() => null);

  return mapboxReadyPromise;
}
