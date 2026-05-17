// Driver Tab Screen - mounts the driver map experience.
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

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

  if (session.role !== 'driver') {
    return <Redirect href={getDefaultAppPath(session.role)} />;
  }

  return <DriverMapScreen />;
}
