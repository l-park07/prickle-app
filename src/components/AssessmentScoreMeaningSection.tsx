import { StyleSheet, View } from 'react-native';
import { POEM, POEM_BANDS, RECAP } from '../../content/assessments';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';

/** What a POEM band means and how RECAP reads, plus the required verbatim copyright attribution. */
export function AssessmentScoreMeaningSection() {
  return (
    <View style={styles.container}>
      <AppText variant="h2" accessibilityRole="header">
        What the scores mean
      </AppText>

      <View style={styles.paragraph}>
        <AppText variant="title">What a POEM score means</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          Your POEM score (0–28) sorts into one of five bands:
        </AppText>
        <View style={styles.bandList}>
          {POEM_BANDS.map((band) => (
            <AppText key={band.label} variant="body" color={colors.textSecondary}>
              {band.min}–{band.max}: {band.label}
            </AppText>
          ))}
        </View>
      </View>

      <View style={styles.paragraph}>
        <AppText variant="title">What a RECAP score means</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          RECAP is also scored 0–28, with lower generally meaning your eczema felt more in
          your control this week. There's no official cutoff for "controlled" vs.
          "uncontrolled" the way POEM has bands — it's best read as a trend over time rather
          than a single number to hit.
        </AppText>
      </View>

      <View style={styles.copyrights}>
        <AppText variant="caption" color={colors.textSecondary}>
          {POEM.copyright}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {RECAP.copyright}
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
  bandList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  copyrights: {
    gap: spacing.xs,
  },
});
