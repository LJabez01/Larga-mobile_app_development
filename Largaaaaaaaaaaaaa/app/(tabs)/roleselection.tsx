// Role Selection Screen - offers mock-mode role switching for testers.
import { Redirect, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { isMockMode, session, startDemoSession, status } = useAppSession();

  if (!isMockMode) {
    return <Redirect href="/login" />;
  }

  if (status === 'signedIn' && session) {
    return <Redirect href={getDefaultAppPath(session.role)} />;
  }

  const handleSelectRole = async (role: 'commuter' | 'driver') => {
    await startDemoSession(role);
    router.replace('/guideline');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Developer Tester Entry</Text>
      <Text style={styles.subtitle}>
        Mock mode is active. Choose a role to jump into the same app flow without touching Firebase.
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.roleButton}
          activeOpacity={0.85}
          onPress={() => handleSelectRole('commuter')}
        >
          <Ionicons name="person-outline" size={40} color="#ffffff" />
          <Text style={styles.roleLabel}>Commuter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleButton}
          activeOpacity={0.85}
          onPress={() => handleSelectRole('driver')}
        >
          <Ionicons name="car-outline" size={40} color="#ffffff" />
          <Text style={styles.roleLabel}>Driver</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/login')}>
        <Text style={styles.secondaryButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
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
  secondaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
});
