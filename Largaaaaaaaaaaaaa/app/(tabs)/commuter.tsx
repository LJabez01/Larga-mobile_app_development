// Commuter Tab Screen - mounts the commuter map experience.
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import CommuterMapScreen from '@/components/map/commuter/commutermapscreen';
import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';

export default function CommuterScreen() {
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

  if (session.role !== 'commuter') {
    return <Redirect href={getDefaultAppPath(session.role)} />;
  }

  return <CommuterMapScreen />;
}
