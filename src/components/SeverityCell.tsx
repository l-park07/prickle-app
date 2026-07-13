import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { clearColor, colors, notScoredBorder, radius, severityScale } from '../app/theme';

interface SeverityCellProps {
  /** getMonthWorstSeverity's per-date value: undefined (key absent) = no log, null = logged but no site scored, 0 = all clear, 1-5 = worst score. */
  worst: number | null | undefined;
  /** Caller controls outer sizing — flex+aspectRatio for a grid cell, a fixed width/height for a legend swatch. */
  style?: StyleProp<ViewStyle>;
  /** Corner radius in px. Callers with bigger boxes (the grid) should pass a bigger value than the legend's default so the rounding reads the same proportionally. */
  cornerRadius?: number;
  children?: ReactNode;
}

const INNER_RING_PADDING = 3;

/**
 * Pure visual rendering of the four severity states — shared by CalendarDay
 * (grid cells) and CalendarLegend (swatches) so the two can never drift apart.
 */
export function SeverityCell({ worst, style, cornerRadius = radius.sm, children }: SeverityCellProps) {
  if (worst === 0) {
    // All sites clear: filled + an inner ring. RN has no inset box-shadow, so
    // this is faked with a smaller bordered View nested inside the filled one
    // — the outer size (set by `style`) never changes, only what's drawn inside it.
    return (
      <View style={[styles.day, styles.clearFill, { borderRadius: cornerRadius }, style]}>
        <View
          style={[styles.innerRing, { borderRadius: Math.max(cornerRadius - INNER_RING_PADDING, 0) }]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.day,
        worst === null ? styles.notScored : null,
        {
          borderRadius: cornerRadius,
          ...(typeof worst === 'number' ? { backgroundColor: severityScale[worst as 1 | 2 | 3 | 4 | 5] } : null),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  notScored: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: notScoredBorder,
  },
  clearFill: {
    backgroundColor: clearColor,
    padding: INNER_RING_PADDING,
  },
  innerRing: {
    flex: 1,
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
