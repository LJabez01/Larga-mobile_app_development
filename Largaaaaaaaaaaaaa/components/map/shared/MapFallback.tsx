// Map Fallback - shows a safe fallback when Mapbox is unavailable.
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MapFallbackProps {
  eyebrow?: string;
  title?: string;
  text?: string;
  loading?: boolean;
}

// Map Fallback Screen - presents a stable loading/error surface when native maps cannot render.
export default function MapFallback({
  eyebrow = 'Map Experience',
  title = 'Map view is unavailable',
  text = 'This build does not include native Mapbox support. Use a development build or EAS build to enable map rendering.',
  loading = false,
}: MapFallbackProps) {
  return (
    <View style={styles.fallbackContainer}>
      <View style={styles.fallbackCard}>
        <View style={styles.fallbackIconWrap}>
          {loading ? (
            <ActivityIndicator color="#158251" />
          ) : (
            <Ionicons name="map-outline" size={28} color="#158251" />
          )}
        </View>
        <Text style={styles.fallbackEyebrow}>{eyebrow}</Text>
        <Text style={styles.fallbackTitle}>{title}</Text>
        <Text style={styles.fallbackText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f1f5f9',
  },
  fallbackCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  fallbackIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  fallbackEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#158251',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  fallbackTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  fallbackText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
  },
});
