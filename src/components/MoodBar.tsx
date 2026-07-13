import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';
import { colors, radius, severityScale, spacing } from '../app/theme';

interface MoodBarProps {
  /** 1-5; low = calm, high = stressed. Only rendered when mood was tracked that day. */
  score: number;
}

const STOPS = [1, 2, 3, 4, 5] as const;

/**
 * Read-only mood/stress track, styled like SeverityBar but flanked by a
 * smiley (calm, low score) and a sad face (stressed, high score) instead of
 * a Clear pill, and with no number drawn on the marker.
 */
export function MoodBar({ score }: MoodBarProps) {
  return (
    <View style={styles.row}>
      <Ionicons name="happy-outline" size={24} color={colors.textSecondary} />
      <View style={styles.track}>
        {STOPS.map((stop) => (
          <View key={stop} style={[styles.segment, { backgroundColor: severityScale[stop] }]}>
            {score === stop ? <View style={styles.marker} /> : null}
          </View>
        ))}
      </View>
      <Ionicons name="sad-outline" size={24} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
});
