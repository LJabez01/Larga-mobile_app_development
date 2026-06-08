// Admin Layout - hosts the mobile reviewer routes under a hidden stack.
import { Stack } from 'expo-router';

// Admin Layout - groups admin review routes under a hidden stack header.
export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
