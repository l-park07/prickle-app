import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { shiftISODate, todayISO } from '../../lib/calendarMath';
import type { Granularity } from '../../lib/chartSeries';
import { AppText } from '../AppText';
import { SegmentedControl } from './SegmentedControl';

export type RangePreset = '30d' | '90d' | '6mo' | '1yr' | 'all';

export interface RangeState {
  from: string;
  to: string;
  granularity: Granularity;
}

// An early bound standing in for "all time," not a real earliest-log lookup — nothing in the DB
// predates it, so it behaves like "all time" without a query. Not shown to the user. (POEM/RECAP
// don't use this at all: they fetch with no date bound, see getPoemSeries/getRecapSeries.)
const ALL_TIME_FROM = '2000-01-01';

const RANGE_PRESETS: { value: RangePreset; label: string; days: number | null }[] = [
  { value: '30d', label: '30d', days: 30 },
  { value: '90d', label: '90d', days: 90 },
  { value: '6mo', label: '6mo', days: 182 },
  { value: '1yr', label: '1yr', days: 365 },
  { value: 'all', label: 'All', days: null },
];

export function rangeFromPreset(preset: RangePreset, today: string): { from: string; to: string } {
  const definition = RANGE_PRESETS.find((p) => p.value === preset)!;
  return {
    from: definition.days === null ? ALL_TIME_FROM : shiftISODate(today, -definition.days),
    to: today,
  };
}

/** Default for a freshly mounted chart: full history, grouped weekly — per-chart controls default
 *  to "everything you've got" rather than a narrow recent window. */
export function defaultRangeState(): RangeState {
  return {
    ...rangeFromPreset('all', todayISO()),
    granularity: 'week',
  };
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

interface RangeAndGranularityControlsProps {
  value: RangeState;
  onChange: (next: RangeState) => void;
}

/** This chart's own time-range preset + grouping controls — every chart that plots a real date
 *  axis (severity, comparison) owns one of these independently, so one chart's window doesn't
 *  affect another's (POEM/RECAP skip this entirely: they always show full history). */
export function RangeAndGranularityControls({ value, onChange }: RangeAndGranularityControlsProps) {
  const today = todayISO();
  const activePreset =
    RANGE_PRESETS.find((p) => {
      const range = rangeFromPreset(p.value, today);
      return range.from === value.from && range.to === value.to;
    })?.value ?? null;

  return (
    <View style={styles.stack}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
});
