import { Text, View } from 'react-native';
import { styles } from '../../components/styles/two.styles';

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
