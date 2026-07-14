import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { useActiveUserId } from '../hooks/useActiveUserId';
import { formatFriendlyDate } from '../lib/calendarMath';
import { db } from '../lib/db';
import { getNextAssessmentDate } from '../lib/nextAssessments';
import { AppText } from './AppText';
import { Card } from './Card';

/** "Next POEM/RECAP: ..." — null from getNextAssessmentDate means it's due now, not stale. */
export function NextAssessmentNotice() {
  const router = useRouter();
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
        <View style={styles.textColumn}>
          <AppText variant="label" color={colors.textSecondary}>
            Next POEM/RECAP
          </AppText>
          <AppText variant="title" numberOfLines={1}>
            {nextDate ? formatFriendlyDate(nextDate) : 'Available now'}
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push('/weekly')}
          accessibilityRole="button"
          accessibilityLabel="More Details"
          style={styles.moreDetails}
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        >
          <AppText variant="label" color={colors.primary}>
            More Details
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  textColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  moreDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
