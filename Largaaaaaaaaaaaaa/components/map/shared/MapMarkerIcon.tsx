import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import {
  BUS_ICON,
  COMMUTER_ICON,
  JEEP_ICON,
} from './mapbox.utils';

type MarkerKind = 'bus' | 'jeep' | 'commuter';
type MarkerSize = 'sm' | 'md' | 'lg';

type MarkerConfig = {
  source: ImageSourcePropType;
  haloColor: string;
  borderColor: string;
};

const SIZE_STYLES = {
  sm: { box: 34, halo: 28, iconWidth: 24, iconHeight: 24, stroke: 1.5 },
  md: { box: 42, halo: 34, iconWidth: 30, iconHeight: 30, stroke: 1.8 },
  lg: { box: 52, halo: 42, iconWidth: 36, iconHeight: 36, stroke: 2.2 },
} as const;

const MARKER_CONFIG: Record<MarkerKind, MarkerConfig> = {
  bus: {
    source: BUS_ICON,
    haloColor: 'rgba(15, 118, 110, 0.16)',
    borderColor: 'rgba(15, 118, 110, 0.3)',
  },
  jeep: {
    source: JEEP_ICON,
    haloColor: 'rgba(21, 128, 61, 0.16)',
    borderColor: 'rgba(21, 128, 61, 0.3)',
  },
  commuter: {
    source: COMMUTER_ICON,
    haloColor: 'rgba(37, 99, 235, 0.16)',
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
};

type MapMarkerIconProps = {
  kind: MarkerKind;
  size?: MarkerSize;
  active?: boolean;
};

export default function MapMarkerIcon({
  kind,
  size = 'md',
  active = false,
}: MapMarkerIconProps) {
  const config = MARKER_CONFIG[kind];
  const metrics = SIZE_STYLES[size];
  const haloColor = active ? 'rgba(16, 185, 129, 0.18)' : config.haloColor;
  const borderColor = active ? 'rgba(16, 185, 129, 0.34)' : config.borderColor;

  return (
    <View
      style={[
        styles.root,
        {
          width: metrics.box,
          height: metrics.box,
        },
      ]}
    >
      <View
        style={[
          styles.halo,
          {
            width: metrics.halo,
            height: metrics.halo,
            borderRadius: metrics.halo / 2,
            borderWidth: metrics.stroke,
            borderColor,
            backgroundColor: haloColor,
          },
        ]}
      />
      <Image
        source={config.source}
        style={{
          width: metrics.iconWidth,
          height: metrics.iconHeight,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
  },
  halo: {
    position: 'absolute',
  },
});
