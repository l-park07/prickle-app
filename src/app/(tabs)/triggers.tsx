import { StyleSheet, View } from 'react-native';
import { LogFab } from '../../components/LogFab';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';

export default function Triggers() {
  return (
    <View style={styles.container}>
      <PlaceholderScreen title="Triggers" />
      <LogFab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
