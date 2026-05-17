// Notifications Tab Screen - mounts the notifications experience.
import { ActivityIndicator, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import NotificationsScreen from '@/components/notifications';
import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';
import { useLiveData } from '@/components/providers/LiveDataProvider';

export default function NotificationsPage() {
  const router = useRouter();
  const { session, status } = useAppSession();
  const { snapshot } = useLiveData();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  if (status === 'signedOut' || !session) {
    return <Redirect href="/login" />;
  }

  const role = session.role === 'driver' ? 'driver' : 'commuter';

  return (
    <NotificationsScreen
      userRole={role}
      notifications={snapshot.notificationsByRole[role]}
      onBack={() => router.replace(getDefaultAppPath(session.role))}
    />
  );
}


