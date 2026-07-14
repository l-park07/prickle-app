import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { LogFab } from '../../components/LogFab';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TodayChecklist } from '../../components/TodayChecklist';
import { TodayEmptyState } from '../../components/TodayEmptyState';
import { TodayHeader } from '../../components/TodayHeader';
import { TodayMoodSection } from '../../components/TodayMoodSection';
import { TodayPhotosSection } from '../../components/TodayPhotosSection';
import { TodaySitesSection } from '../../components/TodaySitesSection';
import { WeeklyAssessmentLink } from '../../components/WeeklyAssessmentLink';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { todayISO } from '../../lib/calendarMath';
import { DayEntry, getDayEntry } from '../../lib/chartSelectors';
import { db } from '../../lib/db';
import { DateAssessment, getAssessmentForDate } from '../../lib/nextAssessments';
import { colors, spacing } from '../theme';

export default function Today() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [resolvedDate, setResolvedDate] = useState(date ?? todayISO());
  const activeUserId = useActiveUserId();
  const [entry, setEntry] = useState<DayEntry | undefined>(undefined);
  const [assessment, setAssessment] = useState<DateAssessment | null | undefined>(undefined);

  // A fresh `date` param (e.g. arriving from Home's calendar) overrides local nav state.
  useEffect(() => {
    if (date) setResolvedDate(date);
  }, [date]);

  useEffect(() => {
    if (!activeUserId) return;
    let cancelled = false;
    setEntry(undefined);
    setAssessment(undefined);
    getDayEntry(db, activeUserId, resolvedDate).then((result) => {
      if (!cancelled) setEntry(result);
    });
    getAssessmentForDate(db, activeUserId, resolvedDate).then((result) => {
      if (!cancelled) setAssessment(result);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId, resolvedDate]);

  const goToLog = () => router.push({ pathname: '/log', params: { date: resolvedDate } });

  const moodScore = entry?.mood ?? null;

  return (
    <View style={styles.container}>
      <TodayHeader date={resolvedDate} onChangeDate={setResolvedDate} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {entry?.logId === null ? (
          <TodayEmptyState onLogNow={goToLog} />
        ) : entry ? (
          <Card style={styles.entryCard}>
            <TodaySitesSection sites={entry.sites} />
            <TodayMoodSection mood={moodScore} />
            <TodayChecklist
              title="Triggers"
              items={entry.triggers.map((t) => ({ id: t.id, label: t.name, checked: t.checked }))}
              emptyLabel="No triggers set up yet"
            />
            <TodayChecklist
              title="Medications"
              items={entry.medications.map((m) => ({
                id: m.id,
                label: m.name,
                checked: m.checked,
                detail: m.category,
              }))}
              emptyLabel="No medications set up yet"
            />
            <TodayPhotosSection photos={entry.photos} />
            <PrimaryButton label="Edit Entry" onPress={goToLog} />
          </Card>
        ) : null}

        {assessment !== undefined ? <WeeklyAssessmentLink assessment={assessment} /> : null}
      </ScrollView>

      <LogFab />
    </View>
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
  entryCard: {
    gap: spacing.lg,
  },
});
