import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';

export interface PillOption<T extends string> {
  value: T;
  label: string;
}

interface PillSelectProps<T extends string> {
  options: PillOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

/** Single-select row of chips — closed vocabulary, no expand/collapse (unlike OptionDropdown). */
export function PillSelect<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: PillSelectProps<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.pill, selected && styles.pillSelected]}
          >
            <AppText variant="label" color={selected ? colors.onPrimary : colors.textPrimary}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
