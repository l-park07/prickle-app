import { StyleSheet, View } from 'react-native';
import { poemBand } from '../../content/scoreAssessment';
import { colors, spacing } from '../app/theme';
import { formatAccessibleDate, formatFriendlyDate, shiftISODate, toISODate } from '../lib/calendarMath';
import type { WeeklyAssessmentRecord } from '../lib/nextAssessments';
import { AppText } from './AppText';
import { Card } from './Card';

interface AssessmentHistoryRowProps {
  record: WeeklyAssessmentRecord;
}

/** Read-only summary of one week's POEM band + RECAP raw score, with the period assessed and the date taken. */
export function AssessmentHistoryRow({ record }: AssessmentHistoryRowProps) {
  const takenDateISO = toISODate(new Date(record.updatedAt));
  const periodStart = shiftISODate(takenDateISO, -6);

  const poemLabel =
    record.poemScore !== null ? `${record.poemScore}, ${poemBand(record.poemScore)}` : 'Not scored';
  const recapLabel = record.recapScore !== null ? String(record.recapScore) : 'Not scored';

  return (
    <Card
      style={styles.card}
      accessibilityLabel={`POEM ${poemLabel}, RECAP ${recapLabel}, taken ${formatFriendlyDate(takenDateISO)}`}
    >
      <AppText variant="caption" color={colors.textSecondary}>
        {formatAccessibleDate(periodStart)} – {formatAccessibleDate(takenDateISO)}
      </AppText>
      <View style={styles.scores}>
        <AppText variant="body">POEM: {poemLabel}</AppText>
        <AppText variant="body">RECAP: {recapLabel}</AppText>
      </View>
      <AppText variant="caption" color={colors.textSecondary}>
        Taken {formatFriendlyDate(takenDateISO)}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  scores: {
    gap: spacing.xs,
  },
});
