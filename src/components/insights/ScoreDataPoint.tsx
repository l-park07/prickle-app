import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../app/theme';
import { formatFriendlyDate } from '../../lib/calendarMath';
import type { ScoreChartPoint } from './scoreChartLayout';

interface ScoreDataPointProps {
  point: ScoreChartPoint;
  /** "POEM" | "RECAP" — prefixes the accessibility label. */
  metricLabel: string;
  selected: boolean;
  onSelect: () => void;
}

// A constant footprint (color changes on selection, size never does) — gifted-charts positions
// customDataPoint using its OWN assumed dataPointsWidth/Height (see ScoreOverTime, which passes
// this same DOT_SIZE back in), so if this ever grew when selected the two would drift apart and
// the dot would visibly land off-center from the actual point.
export const DOT_SIZE = 12;
const RING_SIZE = DOT_SIZE + 12;
const RING_OFFSET = (RING_SIZE - DOT_SIZE) / 2;

/**
 * A weekly-assessment trend chart's customDataPoint renderer — gifted-charts positions
 * whatever this returns at the point's actual pixel coordinates, so a real Pressable here
 * (rather than the library's raw SVG <Circle> fallback) gets both a reliable tap target and a
 * proper accessibilityLabel, which an SVG primitive can't be assumed to carry in this version.
 */
export function ScoreDataPoint({ point, metricLabel, selected, onSelect }: ScoreDataPointProps) {
  const bandClause = point.band ? `, ${point.band}` : '';
  return (
    <Pressable
      onPress={onSelect}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`week of ${formatFriendlyDate(point.weekStart)}, ${metricLabel} ${point.score}${bandClause}`}
      style={[styles.dot, selected ? styles.dotSelected : null]}
    >
      {/* A halo, not a bigger dot — the Pressable itself stays exactly DOT_SIZE (see the note
          above), so gifted-charts' own centering math never drifts from what's actually
          rendered. The ring extends past the Pressable's own bounds, which RN allows by default
          (overflow: visible), making selection unmistakable without moving the dot's center. */}
      {selected ? <View pointerEvents="none" style={styles.ring} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.primary,
  },
  dotSelected: {
    backgroundColor: colors.accent,
  },
  ring: {
    position: 'absolute',
    top: -RING_OFFSET,
    left: -RING_OFFSET,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.accent,
  },
});
