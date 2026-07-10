import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LogFab } from '../../components/LogFab';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';
import { PrimaryButton } from '../../components/PrimaryButton';
import { spacing } from '../theme';

export default function Today() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const resolvedDate = date ?? new Date().toISOString().slice(0, 10);

  return (
    <View style={styles.container}>
      <PlaceholderScreen title={`Today — ${resolvedDate}`} />
      <View style={styles.editEntry}>
        <PrimaryButton
          label="Edit Entry"
          onPress={() => router.push({ pathname: '/log', params: { date: resolvedDate } })}
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
