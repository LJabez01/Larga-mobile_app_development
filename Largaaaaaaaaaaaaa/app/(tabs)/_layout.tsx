import React from 'react';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          title: 'Login',
        }}
      />
      <Tabs.Screen
        name="registration"
        options={{
          title: 'Registration',
        }}
      />
      <Tabs.Screen
        name="forgot-password"
        options={{
          title: 'Forgot Password',
        }}
      />
      <Tabs.Screen
        name="guideline"
        options={{
          title: 'Guideline',
        }}
      />
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
        name="two"
        options={{
          title: 'Two',
        }}
      />
    </Tabs>
  );
}