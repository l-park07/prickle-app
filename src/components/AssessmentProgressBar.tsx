import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';

interface AssessmentProgressBarProps {
  current: number;   // 1-based position, e.g. 3 of 14
  total: number;
  boundary: number;   // step count where the instrument changes (e.g. POEM -> RECAP)
}

/** Overall position through the assessment, with a tick marking the POEM/RECAP split. */
export function AssessmentProgressBar({ current, total, boundary }: AssessmentProgressBarProps) {
  const fillPct = (current / total) * 100;
  const boundaryPct = (boundary / total) * 100;

  return (
    <View style={styles.container}>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 1, max: total, now: current }}
      >
        <View style={[styles.fill, { width: `${fillPct}%` }]} />
        <View style={[styles.boundaryTick, { left: `${boundaryPct}%` }]} />
      </View>
      <AppText variant="caption" color={colors.textSecondary} style={styles.caption}>
        {current} of {total}
      </AppText>
    </View>
  );
}

const TRACK_HEIGHT = 8;
const TICK_WIDTH = 2;

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  boundaryTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: TICK_WIDTH,
    marginLeft: -TICK_WIDTH / 2,
    backgroundColor: colors.textSecondary,
  },
  caption: {
    textAlign: 'center',
  },
});
