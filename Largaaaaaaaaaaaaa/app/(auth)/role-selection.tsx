// Role Selection Screen - lets dual-approved accounts choose which side of the app to enter.
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useRouter, type Href } from 'expo-router';

import { useAppSession } from '@/components/providers/AppSessionProvider';

const PRIMARY = '#10B981';
const TEXT = '#111827';

// Role Selection Screen - lets multi-role users choose which experience to enter.
export default function RoleSelectionScreen() {
  const router = useRouter();
  const { selectRole, session, status } = useAppSession();

  if (status === 'loading') {
    return <View style={styles.container} />;
  }

  if (status === 'signedOut' || !session) {
    return <Redirect href="/login" />;
  }

  if (!session.needsRoleSelection) {
    return <Redirect href={session.defaultPostLoginRoute as Href} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Choose your access</Text>
      <Text style={styles.title}>How do you want to use LARGA today?</Text>
      <Text style={styles.body}>
        Your account has both commuter and driver access. Pick the side you want to open for this session.
      </Text>

      <TouchableOpacity
        style={styles.option}
        activeOpacity={0.85}
        onPress={() => {
          selectRole('commuter');
          router.replace('/commuter');
        }}
      >
        <View style={styles.optionIcon}>
          <Ionicons name="person-outline" size={24} color="#fff" />
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Commuter Mode</Text>
          <Text style={styles.optionBody}>Track routes, vehicles, and travel updates.</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={PRIMARY} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        activeOpacity={0.85}
        onPress={() => {
          selectRole('driver');
          router.replace('/driver');
        }}
      >
        <View style={[styles.optionIcon, { backgroundColor: '#059669' }]}>
          <MaterialCommunityIcons name="steering" size={24} color="#fff" />
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Driver Mode</Text>
          <Text style={styles.optionBody}>Start trips, publish live location, and manage your route.</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={PRIMARY} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FFFB',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  kicker: {
    textAlign: 'center',
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    textAlign: 'center',
    color: TEXT,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    marginBottom: 12,
  },
  body: {
    textAlign: 'center',
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 28,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 14,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  optionBody: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
});
