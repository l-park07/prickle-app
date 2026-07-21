import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import type { GapMode } from '../../lib/chartSeries';
import { AppText } from '../AppText';
import { SegmentedControl } from './SegmentedControl';

const GAP_MODE_OPTIONS: { value: GapMode; label: string; accessibilityLabel: string }[] = [
  { value: 'break', label: 'Show gaps', accessibilityLabel: 'Show gaps for days I did not log' },
  { value: 'omit', label: 'Only logged days', accessibilityLabel: 'Only show days I logged, spaced evenly' },
];

const GAP_MODE_CAPTION: Record<GapMode, string> = {
  break: "Blank stretches mean you didn't log then — not that things were fine.",
  omit: 'Only what you logged is shown, spaced evenly — a gentler view when logging was sparse.',
};

interface GapModeControlProps {
  value: GapMode;
  onChange: (next: GapMode) => void;
}

/** This chart's own "when a day wasn't logged" toggle — every chart on Insights owns one
 *  independently now, so a sparse-logging user can flatten one chart's gaps without affecting
 *  another's honest time axis. */
export function GapModeControl({ value, onChange }: GapModeControlProps) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color={colors.textSecondary}>
        When a day wasn't logged
      </AppText>
      <SegmentedControl options={GAP_MODE_OPTIONS} value={value} onChange={onChange} />
      <AppText variant="caption" color={colors.textSecondary}>
        {GAP_MODE_CAPTION[value]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
});
