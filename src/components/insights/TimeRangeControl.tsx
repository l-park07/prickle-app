import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { AppText } from '../AppText';
import { RANGE_PRESETS, type RangePreset } from './RangeAndGranularityControls';
import { SegmentedControl } from './SegmentedControl';

interface TimeRangeControlProps {
  value: RangePreset;
  onChange: (next: RangePreset) => void;
}

/** A lighter-weight sibling of RangeAndGranularityControls: just the time-range preset, no
 *  group-by — for a chart (SeverityOverTimeChart) that always picks its own granularity
 *  (autoGranularity) rather than exposing one. */
export function TimeRangeControl({ value, onChange }: TimeRangeControlProps) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color={colors.textSecondary}>
        Time range
      </AppText>
      <SegmentedControl options={RANGE_PRESETS.map((p) => ({ value: p.value, label: p.label }))} value={value} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
});
