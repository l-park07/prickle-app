import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, observationBands, spacing } from '../app/theme';
import { useActiveUserId } from '../hooks/useActiveUserId';
import {
  buildObservationBandsByDate,
  formatMonthYear,
  getMonthGrid,
  monthBounds,
  shiftMonth,
  WEEKDAY_LABELS,
  type ObservationBand,
} from '../lib/calendarMath';
import { getMonthObservations, getMonthWorstSeverity } from '../lib/chartSelectors';
import { db } from '../lib/db';
import { AppText } from './AppText';
import { CalendarDay } from './CalendarDay';
import { CalendarLegend } from './CalendarLegend';
import { Card } from './Card';

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Home's month calendar: navigate months, see worst severity per day, tap a day to open Today. */
export function MonthCalendar() {
  const router = useRouter();
  const activeUserId = useActiveUserId();
  const now = new Date();
  const [{ year, month }, setVisibleMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [severityByDate, setSeverityByDate] = useState<Record<string, number | null>>({});
  const [observationBandsByDate, setObservationBandsByDate] = useState<Record<string, ObservationBand[]>>({});
  const [legendVisible, setLegendVisible] = useState(false);

  // useFocusEffect (not useEffect): the Log modal returns here via
  // router.back(), which refocuses this already-mounted screen rather than
  // remounting it, so a mount-only effect would show stale colors after
  // saving a log. Also refetches when switching back to the Home tab after
  // logging from Today.
  useFocusEffect(
    useCallback(() => {
      if (!activeUserId) return;
      let cancelled = false;
      const [from, to] = monthBounds(year, month);
      Promise.all([
        getMonthWorstSeverity(db, activeUserId, from, to),
        getMonthObservations(db, activeUserId, from, to),
      ]).then(([severity, windows]) => {
        if (cancelled) return;
        setSeverityByDate(severity);
        setObservationBandsByDate(buildObservationBandsByDate(windows, from, to, observationBands.length));
      });
      return () => {
        cancelled = true;
      };
    }, [activeUserId, year, month])
  );

  const weeks = getMonthGrid(year, month);
  const today = todayISO();

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.nav}>
          <Pressable
            onPress={() => setVisibleMonth(shiftMonth(year, month, -1))}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
            style={styles.navButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <AppText variant="h2" style={styles.navLabel} numberOfLines={1}>
            {formatMonthYear(year, month)}
          </AppText>
          <Pressable
            onPress={() => setVisibleMonth(shiftMonth(year, month, 1))}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
            style={styles.navButton}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.week}>
          {WEEKDAY_LABELS.map((label, i) => (
            <View key={i} style={styles.weekdayCell}>
              <AppText variant="label" color={colors.textSecondary}>
                {label}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {week.map((cell, cellIndex) => {
                if (!cell) return <View key={cellIndex} style={styles.blankCell} />;
                return (
                  <CalendarDay
                    key={cellIndex}
                    day={cell.day}
                    iso={cell.iso}
                    worst={severityByDate[cell.iso]}
                    bands={observationBandsByDate[cell.iso]}
                    isToday={cell.iso === today}
                    onPress={() => router.push({ pathname: '/today', params: { date: cell.iso } })}
                  />
                );
              })}
            </View>
          ))}
        </View>

        {/* The grid is always padded to 6 weeks (see getMonthGrid) so the card's height
            never jitters between months, but no month ever has a real day in the last
            column of the 6th row — so pinning the legend button to this corner never
            overlaps a date. */}
        <Pressable
          onPress={() => setLegendVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="What the colors mean"
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
          style={styles.infoButton}
        >
          <Ionicons name="information-circle-outline" size={26} color={colors.textSecondary} />
        </Pressable>
      </Card>

      <CalendarLegend
        visible={legendVisible}
        onClose={() => setLegendVisible(false)}
        showObservationNote={Object.keys(observationBandsByDate).length > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 32,
    alignItems: 'center',
  },
  navLabel: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    gap: spacing.xs,
  },
  week: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  infoButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blankCell: {
    flex: 1,
    aspectRatio: 1,
  },
});
