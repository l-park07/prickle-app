import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { useActiveUserId } from '../hooks/useActiveUserId';
import { getNextAssessmentDate } from '../lib/assessments';
import { formatFriendlyDate } from '../lib/calendarMath';
import { db } from '../lib/db';
import { AppText } from './AppText';
import { Card } from './Card';

/** "Next POEM/RECAP: ..." — null from getNextAssessmentDate means it's due now, not stale. */
export function NextAssessmentNotice() {
  const activeUserId = useActiveUserId();
  const [nextDate, setNextDate] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!activeUserId) return;
    let cancelled = false;
    getNextAssessmentDate(db, activeUserId).then((date) => {
      if (!cancelled) setNextDate(date);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  if (nextDate === undefined) return null;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <AppText variant="label" color={colors.textSecondary}>
          Next POEM/RECAP
        </AppText>
        <AppText variant="title" numberOfLines={1}>
          {nextDate ? formatFriendlyDate(nextDate) : 'Available now'}
        </AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    gap: spacing.xs,
  },
});
