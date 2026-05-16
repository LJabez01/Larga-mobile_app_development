import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';

export default function Index() {
  const { session, status } = useAppSession();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  if (status === 'signedIn' && session) {
    return <Redirect href={getDefaultAppPath(session.role)} />;
  }

  return <Redirect href="/login" />;
}
