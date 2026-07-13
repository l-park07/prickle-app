import { StyleSheet, View } from 'react-native';
import { POEM, RECAP } from '../../content/assessments';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';

/** Prickle-voiced overview of what POEM and RECAP measure and why both matter. */
export function AssessmentIntroSection() {
  return (
    <View style={styles.container}>
      <AppText variant="h2" accessibilityRole="header">
        What POEM and RECAP tell you
      </AppText>

      <View style={styles.paragraph}>
        <AppText variant="title">POEM</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {POEM.subtitle} It's a snapshot of your symptoms — itch, sleep, bleeding, weeping,
          cracking, flaking, dryness — over the past week.
        </AppText>
      </View>

      <View style={styles.paragraph}>
        <AppText variant="title">RECAP</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {RECAP.subtitle} It's less about the symptoms themselves and more about how much
          they got in the way — your sleep, your mood, your day.
        </AppText>
      </View>

      <View style={styles.paragraph}>
        <AppText variant="body" color={colors.textSecondary}>
          Symptoms and how much they take over your life don't always move together — a
          quieter week symptom-wise can still feel like a lot, and a rougher week can still
          feel manageable. Looking at both together gives a fuller picture than either one
          alone.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  paragraph: {
    gap: spacing.xs,
  },
});
