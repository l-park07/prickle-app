import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../app/theme';
import { AppText } from '../AppText';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  /** Optional color swatch dot (e.g. the compare-series color) so a chip visually previews the line it switches to. */
  color?: string;
}

interface ChipSelectProps<T extends string> {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

/**
 * A horizontally-scrolling row of pill buttons — same visual language as SegmentedControl, but
 * for option lists that are dynamic and can run long (a user's own triggers/medications), which
 * doesn't fit SegmentedControl's small-fixed-set assumption (it wraps rather than scrolls).
 */
export function ChipSelect<T extends string>({ options, value, onChange }: ChipSelectProps<T>) {
  if (options.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.chip, selected ? styles.chipSelected : null]}
          >
            {option.color ? <View style={[styles.dot, { backgroundColor: option.color }]} /> : null}
            <AppText variant="label" color={selected ? colors.onPrimary : colors.textSecondary}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
