import { StyleSheet, View } from 'react-native';
import { LogFab } from '../../components/LogFab';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';
import { ProfileButton } from '../../components/ProfileButton';

export default function Home() {
  return (
    <View style={styles.container}>
      <PlaceholderScreen title="Home" />
      <LogFab />
      <ProfileButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
