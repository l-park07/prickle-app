import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';

interface AssessmentHeaderBarProps {
  title: string;
  /** Omit to render the title bar with no close control (e.g. onboarding, which has no cancel affordance). */
  onClose?: () => void;
}

/** Full-width colored title bar for the assessment modal (headerShown is false for this route, so this stands in for it). */
export function AssessmentHeaderBar({ title, onClose }: AssessmentHeaderBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      <AppText variant="title" color={colors.onPrimary}>
        {title}
      </AppText>
      {onClose ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancel this check-in"
          hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        >
          <Ionicons name="close" size={24} color={colors.onPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
