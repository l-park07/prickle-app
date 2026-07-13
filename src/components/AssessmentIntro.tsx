import { ScrollView, StyleSheet, View } from 'react-native';
import { ASSESSMENT_SEQUENCE, TOTAL_QUESTIONS } from '../../content/assessments';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

interface AssessmentIntroProps {
  onBegin: () => void;
}

/** Explains the two-part POEM/RECAP flow before the carousel begins. */
export function AssessmentIntro({ onBegin }: AssessmentIntroProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppText variant="h2">Weekly Check-in</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          This check-in has two parts, {TOTAL_QUESTIONS} short questions in all. Answer what
          you can based on the last 7 days — any question can be left blank.
        </AppText>

        {ASSESSMENT_SEQUENCE.map((instrument) => (
          <View key={instrument.id} style={styles.instrumentSection}>
            <AppText variant="title">{instrument.title}</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              {instrument.subtitle}
            </AppText>
            <AppText variant="body">{instrument.instructions}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {instrument.copyright}
            </AppText>
          </View>
        ))}
      </ScrollView>
      <PrimaryButton label="Begin" onPress={onBegin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  scrollContent: {
    gap: spacing.md,
  },
  instrumentSection: {
    gap: spacing.xs,
  },
});
