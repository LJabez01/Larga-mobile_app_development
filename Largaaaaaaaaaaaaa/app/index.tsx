// Index Screen - redirects users into the correct auth or app route.
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { getDefaultAppPath, useAppSession } from '@/components/providers/AppSessionProvider';

export default function RootIndex() {
  const { session, status } = useAppSession();

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (status === 'signedIn' && session) {
    return <Redirect href={getDefaultAppPath(session.role)} />;
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
