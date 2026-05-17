// Mapbox Utilities - centralizes shared map constants and helper accessors.
import type { ImageSourcePropType } from 'react-native';

export type MapboxModule = {
  setAccessToken: (token: string) => void;
  MapView: any;
  Camera: any;
  MarkerView: any;
  ShapeSource: any;
  LineLayer: any;
};

export const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoibDFicmFoIiwiYSI6ImNtbzhvcms4bTAwb2MyeXB3NzcyYW93Nm0ifQ.jpCK5yv2rGrEe54aBCKzyg';

export const MAP_STYLE_URL = 'mapbox://styles/mapbox/standard';

export const INITIAL_CENTER_COORDINATE: [number, number] = [120.9991, 14.8463];

export const STA_MARIA_BOUNDS = {
  ne: [121.03, 14.89],
  sw: [120.96, 14.8],
};

export const MAP_ZOOM = {
  initial: 15,
  min: 11,
  max: 18,
} as const;

export const MAP_PITCH = 60;

export const BUS_ICON: ImageSourcePropType = require('../../../assets/images/bus-icon.jpg');
export const JEEP_ICON: ImageSourcePropType = require('../../../assets/images/jeep-icon.jpg');

export function getMapbox(): MapboxModule | null {
  try {
    const mapbox = require('@rnmapbox/maps').default as MapboxModule;
    mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
    return mapbox;
  } catch {
    return null;
  }
}
