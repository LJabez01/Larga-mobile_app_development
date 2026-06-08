// Secondary Tab Screen - renders the sample secondary route view.
import { Text, View } from 'react-native';
import { styles } from '../../components/styles/two.styles';

// Settings Tab Screen - renders the settings drawer as a tab destination.
export default function TabTwoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Second Tab</Text>
      <Text style={styles.subtitle}>
        This screen is ready for your next feature.
      </Text>
    </View>
  );
}
