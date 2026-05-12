import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Tabs, usePathname } from 'expo-router';

import { useAuthSession } from '@/components/auth/AuthSessionProvider';

export default function TabLayout() {
  const pathname = usePathname();
  const session = useAuthSession();

  if (session.status === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (session.status === 'signedOut') {
    return <Redirect href="/login" />;
  }

  if (session.profile?.role === 'commuter' && pathname === '/driver') {
    return <Redirect href="/commuter" />;
  }

  if (session.profile?.role === 'driver' && pathname === '/commuter') {
    return <Redirect href="/driver" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
      }}>
      <Tabs.Screen
        name="commuter"
        options={{
          title: 'Commuter',
        }}
      />
      <Tabs.Screen
        name="driver"
        options={{
          title: 'Driver',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Two',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
