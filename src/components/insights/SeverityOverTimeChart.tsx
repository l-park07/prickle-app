import { useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import { colors, radius, spacing } from '../../app/theme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { daysBetween, todayISO } from '../../lib/calendarMath';
import { autoGranularity, type Bucket } from '../../lib/chartSeries';
import { AppText } from '../AppText';
import { bucketMonthLabels, bucketsToLineSegments, formatBucketDate } from './bucketChartLayout';
import { axisTextStyle, CHART_INITIAL_SPACING, plotTop, Y_AXIS_LABEL_WIDTH } from './chartTheme';
import { ChartCard } from './ChartCard';
import { ChartExportButton } from './ChartExportButton';
import { rangeFromPreset, type RangePreset } from './RangeAndGranularityControls';
import { evenTicks } from './scoreChartLayout';
import { SiteToggleLegend } from './SiteToggleLegend';
import { TimeRangeControl } from './TimeRangeControl';
import { useActiveSiteSelection, useEarliestLogDate, useSiteSeverityBuckets } from './useSiteSeverityBuckets';

// Divides evenly into the 0-5 severity scale's 5 sections — avoids the fractional per-row-height
// seam ScoreOverTime's comment warns about for POEM's 28 sections. Taller than a bare 5*40px so a
// full-history line (many buckets) has real vertical room to read instead of looking squashed.
const CHART_HEIGHT = 260;
const MIN_PLOT_WIDTH = 100;
const TICK_LABEL_HEIGHT = 20;
const LABELS_EXTRA_HEIGHT = 40;
const CHART_SIDE_MARGIN = spacing.sm;
const MAX_VALUE = 5;

interface SeverityOverTimeChartProps {
  /** Every currently-active site, sort_order-ordered (see getActiveSites) — used for name lookups
   *  in the tooltip and to seed this chart's own site toggle. */
  sites: { id: string; name: string }[];
  /** From chartTheme.ts's assignSiteColors — at most MAX_SITE_LINES entries. */
  colorById: Record<string, string>;
}

/** First chart on the Insights tab: one line per active site. Fully self-contained — owns its own
 *  site toggle and time-range preset. Unlike SeverityComparisonChart, there's no group-by or
 *  gap-mode control: granularity is always auto-picked from the selected range (autoGranularity)
 *  and gaps always show ('break') — those two are implementation details, not choices worth
 *  surfacing. "All" means the user's real earliest logged day (see useEarliestLogDate), not
 *  RangeAndGranularityControls' ALL_TIME_FROM stand-in. */
export function SeverityOverTimeChart({ sites, colorById }: SeverityOverTimeChartProps) {
  const activeUserId = useActiveUserId();
  const [containerWidth, setContainerWidth] = useState(0);
  const shotRef = useRef<ViewShotRef>(null);

  const chartableSites = useMemo(() => sites.filter((s) => colorById[s.id]), [sites, colorById]);
  const [requestedActiveSiteIds, setRequestedActiveSiteIds] = useActiveSiteSelection(chartableSites);

  const today = todayISO();
  const earliestLogDate = useEarliestLogDate(activeUserId);
  const [rangePreset, setRangePreset] = useState<RangePreset>('all');
  // 'all' means real full history — the earliest logged day, not rangeFromPreset's own ALL_TIME_FROM
  // stand-in (that constant exists so SeverityComparisonChart's date filter always has a concrete
  // bound to query with; here we actually know the true start, so we use it). Falls back to "today"
  // while earliestLogDate is still loading (or the user has never logged), which collapses the
  // range to a single, empty bucket. Every other preset is already a real relative date.
  const from = rangePreset === 'all' ? (earliestLogDate ?? today) : rangeFromPreset(rangePreset, today).from;
  const granularity = useMemo(() => autoGranularity(daysBetween(from, today)), [from, today]);

  const sitesById = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites]);

  const { activeSiteIds, bucketDates, displayBySite } = useSiteSeverityBuckets({
    userId: activeUserId,
    sites,
    colorById,
    requestedActiveSiteIds,
    from,
    to: today,
    granularity,
    gapMode: 'break',
  });

  const plotWidth = Math.max(MIN_PLOT_WIDTH, containerWidth - Y_AXIS_LABEL_WIDTH);
  const spacingPx = bucketDates.length > 1 ? (plotWidth - CHART_INITIAL_SPACING) / (bucketDates.length - 1) : 0;

  const labels = useMemo(
    () => bucketMonthLabels(bucketDates, spacingPx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucketDates.join(','), spacingPx]
  );

  const handleLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  const toLineData = (buckets: Bucket[], withLabels: boolean) =>
    buckets.map((b, i) => ({
      value: b.value === null ? undefined : b.value,
      ...(withLabels ? { label: labels[i] } : {}),
    }));

  const siteAt = (i: number) => activeSiteIds[i];
  const lineDataAt = (i: number) => {
    const id = siteAt(i);
    return id ? toLineData(displayBySite[id] ?? [], i === 0) : undefined;
  };
  const segmentsAt = (i: number) => {
    const id = siteAt(i);
    return id ? bucketsToLineSegments(displayBySite[id] ?? []) : undefined;
  };

  const renderTooltip = (pointerIndex: number) => {
    const date = bucketDates[pointerIndex];
    if (!date) return null;
    return (
      <View style={styles.tooltip}>
        <AppText variant="label" color={colors.textPrimary}>
          {formatBucketDate(date, granularity)}
        </AppText>
        {activeSiteIds.map((id) => {
          const bucket = displayBySite[id]?.[pointerIndex];
          const valueText = !bucket || !bucket.logged ? 'no check-in' : bucket.value === null ? 'not scored' : String(bucket.value);
          return (
            <View key={id} style={styles.tooltipRow}>
              <View style={[styles.tooltipSwatch, { backgroundColor: colorById[id] }]} />
              <AppText variant="caption" color={colors.textSecondary}>
                {sitesById.get(id) ?? 'Site'}: {valueText}
              </AppText>
            </View>
          );
        })}
      </View>
    );
  };

  const exportButton = <ChartExportButton shotRef={shotRef} chartTitle="Symptom severity over time" />;

  const controls = (
    <>
      {chartableSites.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" color={colors.textSecondary}>
            Sites
          </AppText>
          <SiteToggleLegend sites={chartableSites} colorById={colorById} activeSiteIds={requestedActiveSiteIds} onChange={setRequestedActiveSiteIds} />
          {sites.length > chartableSites.length ? (
            <AppText variant="caption" color={colors.textSecondary}>
              Showing your first {chartableSites.length} sites here — charts can only show that many lines at once.
            </AppText>
          ) : null}
        </View>
      ) : null}
      <TimeRangeControl value={rangePreset} onChange={setRangePreset} />
    </>
  );

  if (activeSiteIds.length === 0) {
    return (
      <ChartCard title="Symptom severity over time" headerRight={exportButton}>
        <AppText variant="caption" color={colors.textSecondary} style={styles.emptyNote}>
          {chartableSites.length === 0 ? 'Add a site to see its trend here.' : 'Turn on a site above to see its trend.'}
        </AppText>
        {controls}
      </ChartCard>
    );
  }

  const hasAnyValue = activeSiteIds.some((id) => (displayBySite[id] ?? []).some((b) => b.value !== null));

  const siteNames = activeSiteIds.map((id) => sitesById.get(id)).filter(Boolean).join(', ');
  // Not shown as visible text — carried as the chart's accessibility label, same standard as
  // CalendarDay's describeState()/ScoreOverTime's summary.
  const summary = hasAnyValue
    ? `Severity 0 to 5 for ${siteNames}, ${formatBucketDate(bucketDates[0], granularity)} to ${formatBucketDate(bucketDates[bucketDates.length - 1], granularity)}.`
    : undefined;

  return (
    <ChartCard title="Symptom severity over time" headerRight={exportButton}>
      <ViewShot ref={shotRef} style={styles.shotArea}>
        {!hasAnyValue ? (
          <AppText variant="caption" color={colors.textSecondary} style={styles.emptyNote}>
            Nothing logged in this stretch yet — that's alright.
          </AppText>
        ) : (
          <View style={styles.chartMargin}>
            <View onLayout={handleLayout} accessible accessibilityLabel={summary}>
              {containerWidth > 0 ? (
                <View style={styles.chartArea}>
                  <LineChart
                    data={lineDataAt(0) ?? []}
                    data2={lineDataAt(1)}
                    data3={lineDataAt(2)}
                    data4={lineDataAt(3)}
                    data5={lineDataAt(4)}
                    color={colorAtOrUndefined(colorById, siteAt(0))}
                    color2={colorAtOrUndefined(colorById, siteAt(1))}
                    color3={colorAtOrUndefined(colorById, siteAt(2))}
                    color4={colorAtOrUndefined(colorById, siteAt(3))}
                    color5={colorAtOrUndefined(colorById, siteAt(4))}
                    lineSegments={segmentsAt(0) ?? []}
                    lineSegments2={segmentsAt(1)}
                    lineSegments3={segmentsAt(2)}
                    lineSegments4={segmentsAt(3)}
                    lineSegments5={segmentsAt(4)}
                    hideDataPoints
                    hideDataPoints2
                    hideDataPoints3
                    hideDataPoints4
                    hideDataPoints5
                    height={CHART_HEIGHT}
                    maxValue={MAX_VALUE}
                    noOfSections={MAX_VALUE}
                    backgroundColor="transparent"
                    overflowTop={0}
                    hideYAxisText
                    yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
                    labelsExtraHeight={LABELS_EXTRA_HEIGHT}
                    xAxisLabelTextStyle={axisTextStyle}
                    hideRules
                    curved={false}
                    thickness={2}
                    thickness2={2}
                    thickness3={2}
                    thickness4={2}
                    thickness5={2}
                    initialSpacing={CHART_INITIAL_SPACING}
                    width={plotWidth}
                    adjustToWidth
                    pointerConfig={{
                      pointerStripHeight: CHART_HEIGHT,
                      pointerStripColor: colors.border,
                      pointerStripWidth: 2,
                      radius: 5,
                      pointer1Color: colorAtOrUndefined(colorById, siteAt(0)),
                      pointer2Color: colorAtOrUndefined(colorById, siteAt(1)),
                      pointer3Color: colorAtOrUndefined(colorById, siteAt(2)),
                      pointer4Color: colorAtOrUndefined(colorById, siteAt(3)),
                      pointer5Color: colorAtOrUndefined(colorById, siteAt(4)),
                      activatePointersInstantlyOnTouch: true,
                      activatePointersOnLongPress: false,
                      persistPointer: true,
                      autoAdjustPointerLabelPosition: true,
                      pointerLabelWidth: 200,
                      pointerLabelHeight: 24 * (activeSiteIds.length + 1) + spacing.md,
                      pointerLabelComponent: (_items: unknown, _secondary: unknown, pointerIndex: number) => renderTooltip(pointerIndex),
                    }}
                  />
                  {evenTicks(MAX_VALUE, 1).map((value) => {
                    const top = plotTop(value, MAX_VALUE, CHART_HEIGHT) - TICK_LABEL_HEIGHT / 2;
                    return (
                      <View key={value} pointerEvents="none" style={[styles.yAxisTick, { top }]}>
                        <AppText variant="caption" color={colors.textSecondary}>
                          {value}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </View>
        )}
      </ViewShot>
      {hasAnyValue ? (
        <AppText variant="caption" color={colors.textSecondary}>
          Touch or drag the chart to see each site's score for a day.
        </AppText>
      ) : null}
      {controls}
    </ChartCard>
  );
}

function colorAtOrUndefined(colorById: Record<string, string>, id: string | undefined): string | undefined {
  return id ? colorById[id] : undefined;
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  shotArea: {
    backgroundColor: colors.surfaceAlt,
  },
  emptyNote: {
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  chartMargin: {
    paddingHorizontal: CHART_SIDE_MARGIN,
  },
  chartArea: {
    position: 'relative',
  },
  yAxisTick: {
    position: 'absolute',
    left: 0,
    width: Y_AXIS_LABEL_WIDTH - 4,
    alignItems: 'flex-end',
  },
  tooltip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.xs,
    gap: 2,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tooltipSwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
