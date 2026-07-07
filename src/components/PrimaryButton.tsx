import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/** Main CTA button for forms — disabled/spinning while an async action is in flight. */
export function PrimaryButton({ label, onPress, loading, disabled }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, isDisabled ? styles.buttonDisabled : null]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <AppText variant="title" color={colors.onPrimary}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
