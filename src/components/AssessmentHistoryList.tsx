import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import type { WeeklyAssessmentRecord } from '../lib/nextAssessments';
import { AppText } from './AppText';
import { AssessmentHistoryRow } from './AssessmentHistoryRow';

interface AssessmentHistoryListProps {
  history: WeeklyAssessmentRecord[];
}

/** Read-only, most-recent-first list of past weekly assessments. Weeks with no row are simply absent. */
export function AssessmentHistoryList({ history }: AssessmentHistoryListProps) {
  if (history.length === 0) {
    return (
      <AppText variant="body" color={colors.textSecondary}>
        No check-ins yet — your first one will show up here.
      </AppText>
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
});
