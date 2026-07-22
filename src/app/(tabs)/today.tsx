import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { findCommonName } from '../../../content/treatmentLibrary';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { todayISO } from '../../lib/calendarMath';
import { DayEntry, getDayEntry } from '../../lib/chartSelectors';
import { db } from '../../lib/db';
import { DateAssessment, getAssessmentForDate, getNextAssessmentDate } from '../../lib/nextAssessments';
import { TYPE_BADGE, formatTreatmentSummary } from '../../lib/treatmentDisplay';
import { colors, spacing } from '../theme';

export default function Today() {
  const router = useRouter();
  const { date, resetToToday } = useLocalSearchParams<{ date?: string; resetToToday?: string }>();
  const [resolvedDate, setResolvedDate] = useState(date ?? todayISO());
  const activeUserId = useActiveUserId();
  const [entry, setEntry] = useState<DayEntry | undefined>(undefined);
  const [assessment, setAssessment] = useState<DateAssessment | null | undefined>(undefined);
  const [nextAssessmentDate, setNextAssessmentDate] = useState<string | null | undefined>(undefined);

  // A fresh `date` param (e.g. arriving from Home's calendar) overrides local nav state.
  useEffect(() => {
    if (date) setResolvedDate(date);
  }, [date]);

  // Pressing the Today tab (see _layout.tsx's listeners) always lands on
  // today's date. `resetToToday` is a fresh token every press (not just
  // todayISO()) so this fires even when today's date hasn't changed since
  // the last press and resolvedDate had drifted via the header's arrows.
  useEffect(() => {
    if (resetToToday) setResolvedDate(todayISO());
  }, [resetToToday]);

  // useFocusEffect (not useEffect): the Log modal returns here via
  // router.back(), which refocuses this already-mounted screen rather than
  // remounting it, so a mount-only effect would show stale data after
  // saving. Also covers tapping the same date again from Home's calendar,
  // where resolvedDate wouldn't otherwise change.
  useFocusEffect(
    useCallback(() => {
      if (!activeUserId) return;
      let cancelled = false;
      setEntry(undefined);
      setAssessment(undefined);
      setNextAssessmentDate(undefined);
      getDayEntry(db, activeUserId, resolvedDate).then((result) => {
        if (!cancelled) setEntry(result);
      });
      getAssessmentForDate(db, activeUserId, resolvedDate).then((result) => {
        if (!cancelled) setAssessment(result);
      });
      getNextAssessmentDate(db, activeUserId).then((result) => {
        if (!cancelled) setNextAssessmentDate(result);
      });
      return () => {
        cancelled = true;
      };
    }, [activeUserId, resolvedDate])
  );

  // Viewing a future day is fine, but there's nothing to log there yet —
  // Log Now/Edit Entry always opens today's editor instead.
  const goToLog = () =>
    router.push({ pathname: '/log', params: { date: resolvedDate > todayISO() ? todayISO() : resolvedDate } });

  // The weekly check-in nudge only makes sense when it's relevant to what's
  // being viewed: this date falls within a recorded assessment's period, or
  // the user currently has one due — not on an arbitrary past day with
  // neither.
  const showAssessmentLink =
    assessment !== undefined &&
    nextAssessmentDate !== undefined &&
    (assessment !== null || nextAssessmentDate === null);

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
              items={entry.medications.map((m) => {
                const commonName = findCommonName(m.name);
                const badge = m.type ? TYPE_BADGE[m.type] : null;
                return {
                  id: m.id,
                  label: commonName ? `${m.name} (${commonName})` : m.name,
                  checked: m.checked,
                  detail: formatTreatmentSummary(m) ?? undefined,
                  badge: badge?.label,
                  badgeVariant: badge?.variant,
                };
              })}
              emptyLabel="No medications set up yet"
            />
            <TodayPhotosSection photos={entry.photos} sites={entry.sites} date={resolvedDate} />
            <PrimaryButton label="Edit Entry" onPress={goToLog} />
          </Card>
        ) : null}

        {showAssessmentLink ? <WeeklyAssessmentLink assessment={assessment} /> : null}
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
