import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, spacing } from './theme';

export default function Weekly() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <PrimaryButton
        label="Begin This Week's Check-in"
        onPress={() => router.push('/assessment')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});
