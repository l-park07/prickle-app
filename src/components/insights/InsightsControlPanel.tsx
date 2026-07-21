import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { shiftISODate, todayISO } from '../../lib/calendarMath';
import type { GapMode, Granularity } from '../../lib/chartSeries';
import { AppText } from '../AppText';
import { SegmentedControl } from './SegmentedControl';

export type InsightsState = {
  /** Which sites' lines are visible on the severity chart — the toggle. No UI yet; seeded by the screen from getActiveSites. */
  activeSiteIds: string[];
  compareMetric: 'none' | 'stress' | `trigger:${string}`;
  from: string;
  to: string;
  granularity: Granularity;
  gapMode: GapMode;
};

type RangePreset = '30d' | '90d' | '6mo' | '1yr' | 'all';

// Simply an early bound, not a real earliest-log lookup — nothing in the DB predates it,
// so it behaves exactly like "all time" without a query. Not shown to the user.
const ALL_TIME_FROM = '2000-01-01';

const RANGE_PRESETS: { value: RangePreset; label: string; days: number | null }[] = [
  { value: '30d', label: '30d', days: 30 },
  { value: '90d', label: '90d', days: 90 },
  { value: '6mo', label: '6mo', days: 182 },
  { value: '1yr', label: '1yr', days: 365 },
  { value: 'all', label: 'All', days: null },
];

function rangeFromPreset(preset: RangePreset, today: string): { from: string; to: string } {
  const definition = RANGE_PRESETS.find((p) => p.value === preset)!;
  return {
    from: definition.days === null ? ALL_TIME_FROM : shiftISODate(today, -definition.days),
    to: today,
  };
}

/** Default state for a freshly opened Insights tab: last 90 days, weekly, gaps shown honestly. */
export function defaultInsightsState(activeSiteIds: string[]): InsightsState {
  return {
    activeSiteIds,
    compareMetric: 'none',
    ...rangeFromPreset('90d', todayISO()),
    granularity: 'week',
    gapMode: 'break',
  };
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const GAP_MODE_OPTIONS: { value: GapMode; label: string; accessibilityLabel: string }[] = [
  { value: 'break', label: 'Show gaps', accessibilityLabel: 'Show gaps for days I did not log' },
  { value: 'omit', label: 'Only logged days', accessibilityLabel: 'Only show days I logged, spaced evenly' },
];

const GAP_MODE_CAPTION: Record<GapMode, string> = {
  break: "Blank stretches mean you didn't log then — not that things were fine.",
  omit: 'Only what you logged is shown, spaced evenly — a gentler view when logging was sparse.',
};

interface InsightsControlPanelProps {
  value: InsightsState;
  onChange: (next: InsightsState) => void;
}

/** Shared time-range, grouping, and gap-handling controls sitting above every Insights chart. */
export function InsightsControlPanel({ value, onChange }: InsightsControlPanelProps) {
  const today = todayISO();
  const activePreset =
    RANGE_PRESETS.find((p) => {
      const range = rangeFromPreset(p.value, today);
      return range.from === value.from && range.to === value.to;
    })?.value ?? null;

  return (
    <View style={styles.panel}>
      <View style={styles.section}>
        <AppText variant="label" color={colors.textSecondary}>
          Time range
        </AppText>
        <SegmentedControl
          options={RANGE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          value={activePreset}
          onChange={(preset) => onChange({ ...value, ...rangeFromPreset(preset, today) })}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="label" color={colors.textSecondary}>
          Group by
        </AppText>
        <SegmentedControl
          options={GRANULARITY_OPTIONS}
          value={value.granularity}
          onChange={(granularity) => onChange({ ...value, granularity })}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="label" color={colors.textSecondary}>
          When a day wasn't logged
        </AppText>
        <SegmentedControl options={GAP_MODE_OPTIONS} value={value.gapMode} onChange={(gapMode) => onChange({ ...value, gapMode })} />
        <AppText variant="caption" color={colors.textSecondary}>
          {GAP_MODE_CAPTION[value.gapMode]}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
});
