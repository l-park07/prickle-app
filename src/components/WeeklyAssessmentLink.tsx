import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { formatAccessibleDate, shiftISODate } from '../lib/calendarMath';
import type { DateAssessment } from '../lib/nextAssessments';
import { AppText } from './AppText';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';

interface WeeklyAssessmentLinkProps {
  assessment: DateAssessment | null;
}

/** POEM/RECAP scores for the week covering this date, if any, plus the entry point to the Weekly screen. */
export function WeeklyAssessmentLink({ assessment }: WeeklyAssessmentLinkProps) {
  const router = useRouter();

  return (
    <Card style={styles.card}>
      {assessment && (assessment.poemScore !== null || assessment.recapScore !== null) ? (
        <View style={styles.scores}>
          <AppText variant="caption" color={colors.textSecondary}>
            Week of {formatAccessibleDate(assessment.weekStart)} –{' '}
            {formatAccessibleDate(shiftISODate(assessment.weekStart, 6))}
          </AppText>
          {assessment.poemScore !== null ? (
            <AppText variant="body">POEM score: {assessment.poemScore}</AppText>
          ) : null}
          {assessment.recapScore !== null ? (
            <AppText variant="body">RECAP score: {assessment.recapScore}</AppText>
          ) : null}
        </View>
      ) : null}
      <PrimaryButton label="POEM/RECAP Details" onPress={() => router.push('/weekly')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  scores: {
    gap: spacing.xs,
  },
});
