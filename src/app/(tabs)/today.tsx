import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LogFab } from '../../components/LogFab';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { spacing } from '../theme';

export default function Today() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <PlaceholderScreen title="Today" />
      <View style={styles.editEntry}>
        <PrimaryButton
          label="Edit Entry"
          onPress={() =>
            router.push({ pathname: '/log', params: { date: new Date().toISOString().slice(0, 10) } })
          }
        />
      </View>
      <LogFab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editEntry: {
    paddingHorizontal: spacing.lg,
  },
});
