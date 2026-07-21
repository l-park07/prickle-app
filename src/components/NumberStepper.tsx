import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  accessibilityLabel?: string;
}

/** "− [N] +" row for small whole-number inputs (cadence/active/rest counts). */
export function NumberStepper({ value, onChange, min = 1, accessibilityLabel }: NumberStepperProps) {
  const hitSlop = { top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${accessibilityLabel ?? 'value'}`}
        hitSlop={hitSlop}
        style={styles.button}
      >
        <Ionicons name="remove" size={18} color={colors.textPrimary} />
      </Pressable>
      <View style={styles.valueBox}>
        <AppText variant="body" color={colors.textInverse}>
          {value}
        </AppText>
      </View>
      <Pressable
        onPress={() => onChange(value + 1)}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${accessibilityLabel ?? 'value'}`}
        hitSlop={hitSlop}
        style={styles.button}
      >
        <Ionicons name="add" size={18} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    padding: spacing.xs,
  },
  valueBox: {
    minWidth: 40,
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
});
