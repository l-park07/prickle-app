import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

interface AssessmentNavFooterProps {
  onBack: () => void;
  onNext: () => void;
  nextLabel: 'Next' | 'Finish';
  loading?: boolean;
  /** Renders a third, lightweight action (e.g. onboarding's per-step "Skip for now") when provided. */
  onSkip?: () => void;
  skipLabel?: string;
}

/** Back (lightweight) + Next/Finish (primary CTA) + an optional Skip, for one carousel step. */
export function AssessmentNavFooter({
  onBack,
  onNext,
  nextLabel,
  loading,
  onSkip,
  skipLabel = 'Skip for now',
}: AssessmentNavFooterProps) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" disabled={loading}>
        <AppText variant="label" color={colors.textSecondary}>
          Back
        </AppText>
      </Pressable>
      {onSkip ? (
        <Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel={skipLabel} disabled={loading}>
          <AppText variant="label" color={colors.textSecondary}>
            {skipLabel}
          </AppText>
        </Pressable>
      ) : null}
      <View style={styles.nextButton}>
        <PrimaryButton label={nextLabel} onPress={onNext} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nextButton: {
    minWidth: 120,
  },
});
