// Admin Layout - hosts the mobile reviewer routes under a hidden stack.
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
