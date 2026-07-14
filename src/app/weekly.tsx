import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { AssessmentHistoryList } from '../components/AssessmentHistoryList';
import { AssessmentHistoryRow } from '../components/AssessmentHistoryRow';
import { AssessmentIntroSection } from '../components/AssessmentIntroSection';
import { AssessmentScoreMeaningSection } from '../components/AssessmentScoreMeaningSection';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { useActiveUserId } from '../hooks/useActiveUserId';
import { formatFriendlyDate, getWeekStart, todayISO } from '../lib/calendarMath';
import { db } from '../lib/db';
import {
  getNextAssessmentDate,
  getWeeklyAssessmentHistory,
  WeeklyAssessmentRecord,
} from '../lib/nextAssessments';
import { colors, spacing } from './theme';

export default function Weekly() {
  const router = useRouter();
  const activeUserId = useActiveUserId();
  const [history, setHistory] = useState<WeeklyAssessmentRecord[] | undefined>(undefined);
  const [nextAssessmentDate, setNextAssessmentDate] = useState<string | null | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);
  const scoreMeaningY = useRef(0);

  // useFocusEffect (not useEffect): assessment.tsx returns here via
  // router.dismissTo('/weekly'), which refocuses this already-mounted screen
  // rather than remounting it, so a mount-only effect would show stale data
  // after finishing or retaking the assessment.
  useFocusEffect(
    useCallback(() => {
      if (!activeUserId) return;
      let cancelled = false;
      Promise.all([
        getWeeklyAssessmentHistory(db, activeUserId),
        getNextAssessmentDate(db, activeUserId),
      ]).then(([historyResult, nextDate]) => {
        if (!cancelled) {
          setHistory(historyResult);
          setNextAssessmentDate(nextDate);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [activeUserId])
  );

  const thisWeekRecord = history?.find((r) => r.weekStart === getWeekStart(todayISO()));

  const handleScoreMeaningLayout = (e: LayoutChangeEvent) => {
    scoreMeaningY.current = e.nativeEvent.layout.y;
  };

  const scrollToScoreMeaning = () => {
    scrollRef.current?.scrollTo({ y: scoreMeaningY.current, animated: true });
  };

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.scrollContent}>
      <AssessmentIntroSection />

      <View style={styles.section}>
        <AppText variant="body" color={colors.textSecondary}>
          Next assessment date:{' '}
          {nextAssessmentDate === undefined
            ? '…'
            : nextAssessmentDate === null
              ? 'Available now'
              : formatFriendlyDate(nextAssessmentDate)}
        </AppText>

        {history === undefined ? null : thisWeekRecord ? (
          <Card style={styles.statusCard}>
            <AssessmentHistoryRow record={thisWeekRecord} />
            <PrimaryButton
              label="Edit this week's answers"
              onPress={() => router.push('/assessment')}
            />
          </Card>
        ) : (
          <PrimaryButton
            label="Take this week's assessment"
            onPress={() => router.push('/assessment')}
          />
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.historyHeader}>
          <AppText variant="h2" accessibilityRole="header">
            History
          </AppText>
          <Pressable
            onPress={scrollToScoreMeaning}
            accessibilityRole="button"
            accessibilityLabel="What the scores mean"
            hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <AssessmentHistoryList history={history ?? []} />
      </View>

      <View onLayout={handleScoreMeaningLayout}>
        <AssessmentScoreMeaningSection />
      </View>

      <PrimaryButton label="See Insights" onPress={() => router.push('/insights')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  statusCard: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
