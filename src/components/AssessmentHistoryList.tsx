import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import type { WeeklyAssessmentRecord } from '../lib/nextAssessments';
import { AppText } from './AppText';
import { AssessmentHistoryRow } from './AssessmentHistoryRow';
import { PrimaryButton } from './PrimaryButton';

interface AssessmentHistoryListProps {
  history: WeeklyAssessmentRecord[];
}

/** Read-only, most-recent-first list of past weekly assessments. Weeks with no row are simply absent. */
export function AssessmentHistoryList({ history }: AssessmentHistoryListProps) {
  const router = useRouter();

  if (history.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="body" color={colors.textSecondary}>
          No check-ins yet — your first one will show up here.
        </AppText>
        <AppText variant="body" color={colors.textSecondary}>
          Want a starting point? Take your first weekly check (about 5 minutes).
        </AppText>
        <PrimaryButton label="Take your first weekly check" onPress={() => router.push('/assessment')} />
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {history.map((record) => (
        <AssessmentHistoryRow key={record.id} record={record} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  empty: {
    gap: spacing.sm,
  },
});
