import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing, typography } from '../app/theme';
import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label: string;
  /** Shown below the field in the error color; also switches the border to it. */
  error?: string;
}

/** Labeled text input used across forms (auth, and later medication/trigger entry). */
export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={colors.textSecondary}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={colors.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  inputError: {
    borderColor: colors.error,
  },
});
