// Tabs Layout - registers the tab-group routes inside the stack container.
import React from 'react';
import { Stack } from 'expo-router';

// Tab Layout - registers the authenticated tab routes with hidden tab chrome.
export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="commuter"
        options={{
          title: 'Commuter',
        }}
      />
      <Stack.Screen
        name="driver"
        options={{
          title: 'Driver',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
        }}
      />
      <Stack.Screen
        name="two"
        options={{
          title: 'Two',
        }}
      />
    </Stack>
  );
}
