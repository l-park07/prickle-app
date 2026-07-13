import { StyleSheet, View } from 'react-native';
import { LogFab } from '../../components/LogFab';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';

export default function Insights() {
  return (
    <View style={styles.container}>
      <PlaceholderScreen title="Insights" />
      <LogFab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
