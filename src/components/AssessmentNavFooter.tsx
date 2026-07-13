import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

interface AssessmentNavFooterProps {
  onBack: () => void;
  onNext: () => void;
  nextLabel: 'Next' | 'Finish';
  loading?: boolean;
}

/** Back (lightweight) + Next/Finish (primary CTA) controls for one assessment step. */
export function AssessmentNavFooter({ onBack, onNext, nextLabel, loading }: AssessmentNavFooterProps) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" disabled={loading}>
        <AppText variant="label" color={colors.textSecondary}>
          Back
        </AppText>
      </Pressable>
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
  },
  nextButton: {
    minWidth: 120,
  },
});
