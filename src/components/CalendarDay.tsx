import { Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../app/theme';
import { formatAccessibleDate } from '../lib/calendarMath';
import { AppText } from './AppText';
import { SeverityCell } from './SeverityCell';

interface CalendarDayProps {
  day: number;
  iso: string;
  /** getMonthWorstSeverity's per-date value: undefined (key absent) = no log, null = logged but no site scored, 0 = all clear, 1-5 = worst score. */
  worst: number | null | undefined;
  isToday: boolean;
  onPress: () => void;
}

/** Accessibility text for the four states — color alone never carries this information. */
function describeState(worst: number | null | undefined): string {
  if (worst === undefined) return 'no log';
  if (worst === null) return 'logged, no sites scored';
  if (worst === 0) return 'all sites clear';
  return `worst site severity ${worst} of 5`;
}

/** One calendar day cell. Visual state (fill/border/numeral color) always has a matching accessibilityLabel. */
export function CalendarDay({ day, iso, worst, isToday, onPress }: CalendarDayProps) {
  const label = `${formatAccessibleDate(iso)}, ${describeState(worst)}`;
  const numeralColor =
    worst === 0
      ? colors.textInverse
      : worst === undefined || worst === null
        ? colors.textSecondary
        : worst <= 3
          ? colors.textPrimary
          : colors.textInverse;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.cell, isToday ? styles.today : null]}
    >
      <SeverityCell worst={worst} style={styles.fill} cornerRadius={CELL_CORNER_RADIUS}>
        <AppText variant="body" color={numeralColor}>
          {day}
        </AppText>
      </SeverityCell>
    </Pressable>
  );
}

// Bigger than the legend swatch's default (radius.sm) — at the grid cell's larger size,
// radius.sm (or even radius.md) reads as nearly square, so this keeps the rounding visible.
const CELL_CORNER_RADIUS = radius.sm;

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 1,
  },
  fill: {
    flex: 1,
    alignSelf: 'stretch',
  },
  today: {
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: CELL_CORNER_RADIUS,
  },
});
