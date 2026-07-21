import { Pressable, StyleSheet } from 'react-native';
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

const DOT_SIZE = 10;
const SELECTED_DOT_SIZE = 14;

/**
 * A weekly-assessment trend chart's customDataPoint renderer — gifted-charts positions
 * whatever this returns at the point's actual pixel coordinates, so a real Pressable here
 * (rather than the library's raw SVG <Circle> fallback) gets both a reliable tap target and a
 * proper accessibilityLabel, which an SVG primitive can't be assumed to carry in this version.
 */
export function ScoreDataPoint({ point, metricLabel, selected, onSelect }: ScoreDataPointProps) {
  const size = selected ? SELECTED_DOT_SIZE : DOT_SIZE;
  const bandClause = point.band ? `, ${point.band}` : '';
  return (
    <Pressable
      onPress={onSelect}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={`week of ${formatFriendlyDate(point.weekStart)}, ${metricLabel} ${point.score}${bandClause}`}
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2 },
        selected ? styles.dotSelected : null,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    backgroundColor: colors.primary,
  },
  dotSelected: {
    borderWidth: 2,
    borderColor: colors.onPrimary,
  },
});
