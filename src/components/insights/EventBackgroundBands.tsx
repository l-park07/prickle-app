import { StyleSheet, View } from 'react-native';
import { withAlpha } from './chartTheme';
import type { EventLaneSeries } from './EventLanes';

const BAND_OPACITY = 0.15;
const BAND_WIDTH_FACTOR = 0.8; // slightly narrower than one bucket's own spacing, so adjacent days' bands don't visually merge into a solid wash
// A series logged on more than this fraction of days in range paints a band on nearly every
// bucket — edge-to-edge low-opacity bands approximate a near-continuous wash, contradicting the
// "faint marker" intent below. That series falls back to lanes only rather than crowding here.
const DENSITY_SKIP_THRESHOLD = 0.6;

export interface EventBackgroundBandsProps {
  /** The SAME bucket date array the plot above renders — see EventLanes' prop of the same name. */
  bucketDates: string[];
  /** The SAME live-measured per-bucket spacing the plot uses — never recomputed here. */
  spacingPx: number;
  /** Where the plot's first point sits — see EventLanes' prop of the same name. */
  leadingWidth: number;
  series: EventLaneSeries[];
  /** Full height of the plot these bands sit behind. */
  plotHeight: number;
}

/**
 * Full-height, low-opacity vertical bands behind a chart's lines, one per logged date, in that
 * series' own color — a faint "something happened here" backdrop for when there's little enough
 * going on that a lane strip alone might be missed. Deliberately self-limiting two ways: renders
 * nothing at all once 3+ event series are enabled (overlapping translucent bands blend into a
 * third color that reads as a third thing — lanes alone carry that case), and drops any individual
 * series logged on most of the days in range (see DENSITY_SKIP_THRESHOLD — that series still gets
 * its lane, just not a band that would otherwise read as a solid wash). Render this BEFORE the
 * chart's lines in the JSX tree so the lines paint on top.
 */
export function EventBackgroundBands({ bucketDates, spacingPx, leadingWidth, series, plotHeight }: EventBackgroundBandsProps) {
  if (series.length === 0 || series.length > 2) return null;
  const bandWidth = spacingPx * BAND_WIDTH_FACTOR;
  const sparseSeries =
    bucketDates.length === 0 ? series : series.filter((row) => row.dates.size / bucketDates.length <= DENSITY_SKIP_THRESHOLD);
  return (
    <>
      {sparseSeries.map((row) =>
        bucketDates.map((date, index) => {
          if (!row.dates.has(date)) return null;
          const left = leadingWidth + index * spacingPx - bandWidth / 2;
          return (
            <View
              key={`${row.id}-${date}`}
              pointerEvents="none"
              style={[
                styles.band,
                { left, width: bandWidth, height: plotHeight, backgroundColor: withAlpha(row.color, BAND_OPACITY) },
              ]}
            />
          );
        })
      )}
    </>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    top: 0,
  },
});
