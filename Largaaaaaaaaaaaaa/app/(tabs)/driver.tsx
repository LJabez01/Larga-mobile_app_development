// Driver Tab Screen - mounts the driver map experience.
import { ActivityIndicator, View } from 'react-native';
import { Redirect, type Href } from 'expo-router';

import DriverMapScreen from '@/components/map/driver/drivermapscreen';
import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';

export default function DriverScreen() {
  const { session, status } = useAppSession();

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

  if (session.needsRoleSelection && session.role === null) {
    return <Redirect href="/role-selection" />;
  }

  if (!session.approvedRoles.includes('driver')) {
    return <Redirect href={getDefaultAppPath(session) as Href} />;
  }

  return <DriverMapScreen />;
}
