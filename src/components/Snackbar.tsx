import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';

const DEFAULT_DURATION_MS = 5000;

interface SnackbarProps {
  /** null = hidden. */
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

/** A transient bottom banner for confirming an action with an optional reversal (e.g. "Deleted.
 *  Undo") — the app's first use of this pattern, so kept small and generic rather than
 *  insights-specific. Auto-dismisses after durationMs; tapping the action dismisses it too. */
export function Snackbar({ message, actionLabel, onAction, onDismiss, durationMs = DEFAULT_DURATION_MS }: SnackbarProps) {
  useEffect(() => {
    if (message === null) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, durationMs]);

  if (message === null) return null;

  return (
    <View style={styles.container} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <AppText variant="body" color={colors.textInverse} style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={() => {
            onAction();
            onDismiss();
          }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        >
          <AppText variant="label" color={colors.textInverse} style={styles.action}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  message: {
    flex: 1,
  },
  action: {
    textDecorationLine: 'underline',
  },
});
