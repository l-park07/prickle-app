import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { AppText } from '../AppText';

/** One trigger/medication row for EventLanes/EventBackgroundBands. */
export interface EventLaneSeries {
  id: string;
  label: string;
  color: string;
  /** Dates (matching entries in `bucketDates`) this series was logged. */
  dates: Set<string>;
}

const TRACK_HEIGHT = 10;
const TICK_SIZE = 6;

export interface EventLanesProps {
  /** The SAME bucket date array the plot above renders — index i here must mean the same day as
   *  index i there, or ticks land under the wrong point. */
  bucketDates: string[];
  /** The SAME live-measured per-bucket spacing the plot uses — never recomputed here. */
  spacingPx: number;
  /** Where the plot's first point sits (its own left inset) — a tick at index 0 is placed this
   *  far into the track, so it lands under that first point exactly. */
  leadingWidth: number;
  series: EventLaneSeries[];
}

/**
 * Stacked rows beneath a chart's plot, one per enabled trigger/medication series: the series name
 * on its own line (full card width — trigger/medication names shouldn't be squeezed into the
 * plot's narrow y-axis gutter width and truncated), then a tick track below it with a filled mark
 * on each day it was logged. The track's ticks use the plot's own x-scale (leadingWidth/spacingPx,
 * taken as props rather than recomputed) so they stay pixel-aligned with the lines above regardless
 * of how wide the label above happens to render.
 */
export function EventLanes({ bucketDates, spacingPx, leadingWidth, series }: EventLanesProps) {
  if (series.length === 0) return null;
  return (
    <View style={styles.container}>
      {series.map((row) => (
        <View
          key={row.id}
          style={styles.row}
          accessible
          accessibilityLabel={`${row.label}, logged on ${row.dates.size} of ${bucketDates.length} days`}
        >
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {row.label}
          </AppText>
          <View style={styles.track}>
            {bucketDates.map((date, index) =>
              row.dates.has(date) ? (
                <View
                  key={date}
                  pointerEvents="none"
                  style={[
                    styles.tick,
                    { left: leadingWidth + index * spacingPx - TICK_SIZE / 2, backgroundColor: row.color },
                  ]}
                />
              ) : null
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    gap: 0,
  },
  track: {
    height: TRACK_HEIGHT,
    position: 'relative',
  },
  tick: {
    position: 'absolute',
    top: (TRACK_HEIGHT - TICK_SIZE) / 2,
    width: TICK_SIZE,
    height: TICK_SIZE,
    borderRadius: TICK_SIZE / 2,
  },
});
