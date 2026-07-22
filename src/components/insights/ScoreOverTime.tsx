import { useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import { colors, radius, spacing } from '../../app/theme';
import type { GapMode } from '../../lib/chartSeries';
import { AppText } from '../AppText';
import {
  axisTextStyle,
  CHART_END_SPACING,
  CHART_INITIAL_SPACING,
  PLOT_Y_OFFSET,
  plotTop,
  withAlpha,
  Y_AXIS_LABEL_WIDTH,
} from './chartTheme';
import { ChartCard } from './ChartCard';
import { ChartExportButton } from './ChartExportButton';
import { GapModeControl } from './GapModeControl';
import { DOT_SIZE, ScoreDataPoint } from './ScoreDataPoint';
import { buildScoreChartLayout, toScoreChartPoints } from './scoreChartLayout';

type ScoreOverTimeBackground =
  | { type: 'bands'; sectionColors: string[] }
  | { type: 'gradient'; colors: [string, string] }; // [top, bottom] of the vertical LinearGradient

interface ScoreOverTimeProps {
  title: string; // "POEM" | "RECAP" — also the accessibility label prefix
  copyright: string;
  data: { weekStart: string; score: number }[];
  maxValue: number;
  noOfSections: number;
  yAxisTicks: number[];
  background: ScoreOverTimeBackground;
  /** Omitted when the metric has no published bands (RECAP) — never invented here. */
  band?: (score: number) => string | null;
  /** Text drawn directly on the chart at each region's vertical midpoint (POEM band names, RECAP's Controlled/Uncontrolled). Dropped if it would crowd a neighbor — see filterCrowdedLabels. */
  regionLabels?: { label: string; midValue: number }[];
  /** Shows a "full history" note under the attribution — true for both current usages (POEM/RECAP always auto-fit to all data, ignoring the tab's range picker). */
  showsFullHistory?: boolean;
  emptyMessage: string;
  /** Renders just the chart plot on a plain white backdrop — no ChartCard chrome (title,
   *  attribution, export icon, gap-mode control, "Tap or drag..." caption). Used by
   *  ExportSummaryCaptureRig: the PDF puts its own heading/copyright in the surrounding HTML, so
   *  capturing the on-screen card verbatim would have baked the pink card fill and controls into
   *  the page image. Leave unset for normal on-screen use. */
  printMode?: boolean;
}

// A multiple of noOfSections' finest resolution (POEM's 28) so every section renders at an
// exact integer pixel height — fractional per-row heights (e.g. 220/28 = 7.857...) left visible
// 1px seams between adjacent sectionColors rows.
const CHART_HEIGHT = 224;
const MIN_PLOT_WIDTH = 100;
const TICK_LABEL_HEIGHT = 20; // matches typography.caption/label's lineHeight
const LABELS_EXTRA_HEIGHT = 40; // vertical room below the x-axis so labels never touch it
const CHART_SIDE_MARGIN = spacing.sm; // extra breathing room from the card's rounded corners — the chart itself has square corners
const REGION_LABEL_PLATE_ALPHA = 0.68; // was 0.82 — a bit more see-through, per feedback
const REGION_LABEL_TEXT_COLOR = withAlpha(colors.textPrimary, 0.85); // was fully opaque
const MIN_REGION_LABEL_GAP = TICK_LABEL_HEIGHT + spacing.xs; // below this, two region labels would visually crowd/overlap

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthKey = (iso: string) => iso.slice(0, 7); // 'YYYY-MM'
const monthLabel = (iso: string) => `${MONTH_ABBR[Number(iso.slice(5, 7)) - 1]} '${iso.slice(2, 4)}`;
const shortDateLabel = (iso: string) => `${MONTH_ABBR[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;

function formatScoreWithBand(score: number, band: string | null): string {
  return band ? `${score} (${band})` : `${score}`;
}

/** Drops a region label whenever it would sit closer than MIN_REGION_LABEL_GAP to the previous
 * KEPT label — e.g. POEM's "Clear or almost clear" band is only 3 units tall, too thin for its
 * own label without crowding "Mild eczema" right above it. Input must already be sorted by
 * midValue ascending (POEM_BANDS/RECAP's region lists both are). */
function filterCrowdedLabels(
  labels: { label: string; midValue: number }[],
  maxValue: number,
  chartHeight: number
): { label: string; midValue: number }[] {
  const kept: { label: string; midValue: number }[] = [];
  let lastTop: number | null = null;
  for (const region of labels) {
    const top = plotTop(region.midValue, maxValue, chartHeight);
    if (lastTop === null || Math.abs(top - lastTop) >= MIN_REGION_LABEL_GAP) {
      kept.push(region);
      lastTop = top;
    }
  }
  return kept;
}

/** Shared weekly-assessment trend chart (POEM, RECAP, ...): true-time-axis line, gap-aware, tap-or-drag-to-tooltip. */
export function ScoreOverTime({
  title,
  copyright,
  data,
  maxValue,
  noOfSections,
  yAxisTicks,
  background,
  band,
  regionLabels,
  showsFullHistory,
  emptyMessage,
  printMode,
}: ScoreOverTimeProps) {
  // Print mode keeps the same height as on-screen: shrinking it there previously just made the
  // chart look squished without reclaiming any page space (the PDF's per-page whitespace comes
  // from page-break placement, not chart height).
  const chartHeight = CHART_HEIGHT;
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [gapMode, setGapMode] = useState<GapMode>('break');
  const shotRef = useRef<ViewShotRef>(null);
  // Toggled true only for the instant the export button captures the chart — reveals exportHeader
  // (title, score range, and the actual date period) inside the ViewShot so a saved/shared image
  // is self-explanatory on its own, without permanently duplicating the title/attribution the
  // ChartCard chrome already shows on-screen. Same pattern as SeverityOverTimeChart/
  // SeverityComparisonChart's export headers.
  const [isExporting, setIsExporting] = useState(false);

  const points = useMemo(() => toScoreChartPoints(data, band ?? (() => null)), [data, band]);
  const selectedPoint = selectedIndex != null ? (points[selectedIndex] ?? null) : null;

  const visibleRegionLabels = useMemo(
    () => filterCrowdedLabels(regionLabels ?? [], maxValue, chartHeight),
    [regionLabels, maxValue, chartHeight]
  );

  // gifted-charts renders the y-axis number gutter as a LEADING width on top of
  // initialSpacing+spacingSum+endSpacing (totalWidth doesn't include it — confirmed in
  // LineChart/index.js: `totalWidth = initialSpacing + maxSpacingSum + endSpacing`, with
  // yAxisLabelWidth added separately when the whole chart is laid out). Leaving it out of this
  // budget meant the chart rendered ~Y_AXIS_LABEL_WIDTH px wider than its actual container and
  // spilled past the card's edge — this must be subtracted here too, not just from styling.
  const plotWidth = Math.max(MIN_PLOT_WIDTH, containerWidth - Y_AXIS_LABEL_WIDTH - CHART_INITIAL_SPACING - CHART_END_SPACING);
  const layout = useMemo(
    () => buildScoreChartLayout(points, { gapMode, plotWidth }),
    [points, gapMode, plotWidth]
  );

  const chartData = useMemo(
    () =>
      points.map((point, i) => ({
        value: point.score,
        // gifted-charts reads item[i].spacing as the gap AFTER point i (into i+1), not before it
        // — confirmed in gifted-charts-core's LineChart getX()/cumulativeSpacing: getX(index) =
        // initialSpacing + cumulativeSpacing[index-1], where cumulativeSpacing[k] sums
        // item[0..k]'s spacing. So the gap "before point i+1" (our layout.spacing[i+1]) has to
        // live on item i, and item[i].spacing itself is only ever read once (nothing follows
        // the last point).
        spacing: i + 1 < points.length ? layout.spacing[i + 1] : 0,
        // Marks calendar months, not just the range's start/end — short so it reads horizontally
        // without rotation even across a multi-year "full history" range.
        label: i === 0 || monthKey(point.weekStart) !== monthKey(points[i - 1].weekStart) ? monthLabel(point.weekStart) : '',
      })),
    [points, layout]
  );

  // Mirrors getX(index) = initialSpacing + cumulativeSpacing[index-1] so drag-scrubbing finds
  // the same pixel position gifted-charts actually draws each point at.
  const cumulativeX = useMemo(() => {
    const xs: number[] = [CHART_INITIAL_SPACING];
    for (let i = 0; i < chartData.length - 1; i++) {
      xs.push(xs[xs.length - 1] + chartData[i].spacing);
    }
    return xs;
  }, [chartData]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => selectNearestByX(cumulativeX, evt.nativeEvent.locationX, setSelectedIndex),
        onPanResponderMove: (evt) => selectNearestByX(cumulativeX, evt.nativeEvent.locationX, setSelectedIndex),
      }),
    [cumulativeX]
  );

  const handleLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  const attribution = (
    <>
      <AppText variant="caption" color={colors.textSecondary}>
        {copyright}
      </AppText>
      {showsFullHistory ? (
        <AppText variant="caption" color={colors.textSecondary}>
          Showing your full history.
        </AppText>
      ) : null}
    </>
  );

  const exportButton = (
    <ChartExportButton
      shotRef={shotRef}
      chartTitle={title}
      beforeCapture={() => setIsExporting(true)}
      afterCapture={() => setIsExporting(false)}
    />
  );
  const gapModeControl = <GapModeControl value={gapMode} onChange={setGapMode} />;

  if (points.length < 2) {
    if (printMode) {
      return (
        <View style={styles.printWrap}>
          <AppText variant="caption" color={colors.textSecondary} style={styles.emptyNote}>
            {emptyMessage}
          </AppText>
        </View>
      );
    }
    return (
      <ChartCard title={title} attribution={attribution} headerRight={exportButton}>
        {gapModeControl}
        <AppText variant="caption" color={colors.textSecondary} style={styles.emptyNote}>
          {emptyMessage}
        </AppText>
      </ChartCard>
    );
  }

  const scores = points.map((p) => p.score);
  const lowest = points[scores.indexOf(Math.min(...scores))];
  const highest = points[scores.indexOf(Math.max(...scores))];
  // Not shown as visible text (per product direction) — carried as the chart's accessibility
  // label instead, same standard as CalendarDay's describeState(): worded, but not a permanent
  // on-screen caption.
  const summary = `Weekly ${title} scores from ${shortDateLabel(points[0].weekStart)} to ${shortDateLabel(points[points.length - 1].weekStart)}, ranging from ${formatScoreWithBand(lowest.score, lowest.band)} to ${formatScoreWithBand(highest.score, highest.band)}.`;

  const dateRangeLabel = `${shortDateLabel(points[0].weekStart)} – ${shortDateLabel(points[points.length - 1].weekStart)}`;

  const chart = (
      // ViewShot wraps just the plot (not the gap-mode control above it) so a saved picture is
      // the chart itself, not the surrounding controls. chartMargin is a separate OUTER wrapper
      // (not the onLayout view itself) so onLayout measures the space actually left AFTER this
      // margin — the margin has to come off the width budget same as everything else, and
      // nesting it this way gets that for free instead of needing another manual subtraction.
      <ViewShot ref={shotRef} style={[styles.chartMargin, printMode ? styles.printBackdrop : null]}>
        {isExporting ? (
          <View style={styles.exportHeader}>
            <AppText variant="title" color={colors.textPrimary}>
              {title}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Score 0–{maxValue} · {dateRangeLabel}
            </AppText>
          </View>
        ) : null}
        <View onLayout={handleLayout} accessible accessibilityLabel={summary}>
          {containerWidth > 0 ? (
            <View style={styles.chartArea} {...panResponder.panHandlers}>
              {background.type === 'gradient' ? (
                <LinearGradient
                  colors={background.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  // Confined to the plot area (right of the y-axis number gutter) — matches
                  // where gifted-charts' own sectionColors stop for the POEM/bands case, so the
                  // gradient never bleeds behind the axis numbers the way a full-bleed fill would.
                  // height comes from props (printMode), so it can't live in the static
                  // StyleSheet — merged onto the static gradientFill base instead.
                  style={[styles.gradientFill, { height: chartHeight }]}
                />
              ) : null}
              <LineChart
                data={chartData}
                height={chartHeight}
                maxValue={maxValue}
                noOfSections={noOfSections}
                backgroundColor="transparent"
                sectionColors={background.type === 'bands' ? background.sectionColors : undefined}
                overflowTop={0}
                hideYAxisText
                yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
                labelsExtraHeight={LABELS_EXTRA_HEIGHT}
                xAxisLabelTextStyle={axisTextStyle}
                hideRules
                curved={false}
                color={colors.primary}
                thickness={2}
                initialSpacing={CHART_INITIAL_SPACING}
                endSpacing={CHART_END_SPACING}
                lineSegments={layout.lineSegments}
                dataPointsWidth={DOT_SIZE}
                dataPointsHeight={DOT_SIZE}
                dataPointsWidth1={DOT_SIZE}
                dataPointsHeight1={DOT_SIZE}
                customDataPoint={(_item: unknown, index: number) => (
                  <ScoreDataPoint
                    point={points[index]}
                    metricLabel={title}
                    selected={index === selectedIndex}
                    onSelect={() => setSelectedIndex(index)}
                  />
                )}
              />
              {yAxisTicks.map((value) => {
                const top = plotTop(value, maxValue, chartHeight) - TICK_LABEL_HEIGHT / 2;
                return (
                  <View key={value} pointerEvents="none" style={[styles.yAxisTick, { top }]}>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {value}
                    </AppText>
                  </View>
                );
              })}
              {visibleRegionLabels.map((region) => {
                const top = plotTop(region.midValue, maxValue, chartHeight) - TICK_LABEL_HEIGHT / 2;
                return (
                  <View key={region.label} pointerEvents="none" style={[styles.regionLabel, { top }]}>
                    {/* A backdrop plate, not bare text over the chart — otherwise the data line
                        reads as cutting through the letters wherever the two cross. */}
                    <View style={styles.regionLabelPlate}>
                      <AppText variant="label" color={REGION_LABEL_TEXT_COLOR}>
                        {region.label}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </ViewShot>
  );

  if (printMode) {
    return <View style={styles.printWrap}>{chart}</View>;
  }

  return (
    <ChartCard title={title} attribution={attribution} headerRight={exportButton}>
      {gapModeControl}
      {chart}
      {selectedPoint ? (
        <View style={styles.selectedRow}>
          <View style={styles.selectedDot} />
          <AppText variant="body" color={colors.textPrimary} numberOfLines={1} style={styles.selectedText}>
            {shortDateLabel(selectedPoint.weekStart)} · {title} {selectedPoint.score}
            {selectedPoint.band ? ` · ${selectedPoint.band}` : ''}
          </AppText>
        </View>
      ) : (
        <AppText variant="caption" color={colors.textSecondary}>
          Tap or drag a point to see its date and score.
        </AppText>
      )}
    </ChartCard>
  );
}

function selectNearestByX(cumulativeX: number[], touchX: number, setSelectedIndex: (index: number) => void) {
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  cumulativeX.forEach((x, i) => {
    const distance = Math.abs(x - touchX);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  });
  setSelectedIndex(nearestIndex);
}

const styles = StyleSheet.create({
  chartMargin: {
    paddingHorizontal: CHART_SIDE_MARGIN,
  },
  printBackdrop: {
    backgroundColor: colors.surface,
  },
  printWrap: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  exportHeader: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  emptyNote: {
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  chartArea: {
    position: 'relative',
  },
  gradientFill: {
    position: 'absolute',
    // top matches plotTop(maxValue, maxValue) — gifted-charts draws the maxValue line at
    // PLOT_Y_OFFSET, not 0, so starting the gradient at 0 left it floating 10px too high, short
    // of the x-axis at the bottom. Explicit height (merged in per-render, see the JSX — it varies
    // with printMode so it can't be a static value here), not `bottom: 0` — the chart's rendered
    // area extends further below to fit the x-axis label row (labelsExtraHeight), and `bottom: 0`
    // was stretching the gradient down into that label strip too.
    top: PLOT_Y_OFFSET,
    left: Y_AXIS_LABEL_WIDTH,
    right: 0,
  },
  yAxisTick: {
    position: 'absolute',
    left: 0,
    width: Y_AXIS_LABEL_WIDTH - 4,
    alignItems: 'flex-end',
  },
  regionLabel: {
    position: 'absolute',
    // Left-aligned rather than centered: keeps region labels out of the way of the most recent
    // (rightmost) data, which is usually what a user most wants unobstructed, and pairs them
    // visually with the y-axis number column instead of drifting into the data line's path.
    left: Y_AXIS_LABEL_WIDTH + spacing.xs,
    alignItems: 'flex-start',
  },
  regionLabelPlate: {
    // Alpha baked into the color (not a View `opacity`) so the plate's translucency doesn't
    // also wash out the label text drawn inside it — that gets its own separate alpha above.
    backgroundColor: withAlpha(colors.surface, REGION_LABEL_PLATE_ALPHA),
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  selectedText: {
    flexShrink: 1,
  },
});
