import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { getDefaultAppPath, useAuthSession } from '@/components/auth/AuthSessionProvider';

export default function RootIndex() {
  const session = useAuthSession();

  if (session.status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (session.status === 'signedIn' && session.profile) {
    return <Redirect href={getDefaultAppPath(session.profile.role)} />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
