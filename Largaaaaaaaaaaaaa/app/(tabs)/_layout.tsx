import React from 'react';
import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: 'Login',
        }}
      />
      <Stack.Screen
        name="registration"
        options={{
          title: 'Registration',
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Forgot Password',
        }}
      />
      <Stack.Screen
        name="guideline"
        options={{
          title: 'Guideline',
        }}
      />
      <Stack.Screen
        name="roleselection"
        options={{
          title: 'Role Selection',
        }}
      />
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
