import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DriverScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Continue as</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.roleButton}
          activeOpacity={0.85}
          onPress={() => router.push('/commuter' as any)}
        >
          <Ionicons name="person-outline" size={40} color="#ffffff" />
          <Text style={styles.roleLabel}>Commuter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleButton}
          activeOpacity={0.85}
          onPress={() => router.push('/driver' as any)}
        >
          <Ionicons name="car-outline" size={40} color="#ffffff" />
          <Text style={styles.roleLabel}>Driver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 36,
    letterSpacing: -0.4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  roleButton: {
    width: 140,
    height: 140,
    borderRadius: 20,
    backgroundColor: '#158251',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#158251',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});