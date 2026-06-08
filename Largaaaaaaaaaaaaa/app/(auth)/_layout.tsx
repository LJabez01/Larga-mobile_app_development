// Auth Layout - groups the authentication routes under a shared stack.
import { Stack } from 'expo-router';

// Auth Layout - groups authentication routes under a hidden stack header.
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
