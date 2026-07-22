import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import { colors, radius, spacing } from '../../app/theme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import {
  getActiveMedications,
  getActiveTriggers,
  getMedicationDays,
  getStressSeries,
  getTriggerDays,
} from '../../lib/chartSelectors';
import { buildBuckets, type Bucket, type GapMode } from '../../lib/chartSeries';
import { db } from '../../lib/db';
import { AppText } from '../AppText';
import { bucketMonthLabels, bucketsToLineSegments, formatBucketDate } from './bucketChartLayout';
import { ChipSelect, type ChipOption } from './ChipSelect';
import { axisTextStyle, CHART_END_SPACING, CHART_INITIAL_SPACING, compareLineColors, plotTop, Y_AXIS_LABEL_WIDTH } from './chartTheme';
import { ChartCard } from './ChartCard';
import { ChartExportButton } from './ChartExportButton';
import { GapModeControl } from './GapModeControl';
import { defaultRangeState, RangeAndGranularityControls, type RangeState } from './RangeAndGranularityControls';
import { evenTicks } from './scoreChartLayout';
import { SiteToggleLegend } from './SiteToggleLegend';
import { useActiveSiteSelection, useSiteSeverityBuckets } from './useSiteSeverityBuckets';

const CHART_HEIGHT = 200;
const MIN_PLOT_WIDTH = 100;
const TICK_LABEL_HEIGHT = 20;
const LABELS_EXTRA_HEIGHT = 40;
const CHART_SIDE_MARGIN = spacing.sm;
const MAX_VALUE = 5;
const RUG_HEIGHT = 10;
const RUG_MARK_SIZE = 8;

// The single non-site "comparison" color, reused whether the compare series renders as a
// secondary line (stress) or a rug mark row (trigger/medication) — distinct from sitePalette so a
// comparison series can never be mistaken for a site's own severity line.
const COMPARE_COLOR = compareLineColors[0];

type CompareSelection = { kind: 'stress' } | { kind: 'trigger'; id: string } | { kind: 'medication'; id: string };

function selectionKey(selection: CompareSelection): string {
  return selection.kind === 'stress' ? 'stress' : `${selection.kind}:${selection.id}`;
}

interface SeverityComparisonChartProps {
  /** Every currently-active site, sort_order-ordered (see getActiveSites) — used for name lookups and to seed this chart's own site toggle. */
  sites: { id: string; name: string }[];
  /** From chartTheme.ts's assignSiteColors — at most MAX_SITE_LINES entries. */
  colorById: Record<string, string>;
}

/**
 * Severity plotted against exactly one other signal at a time (stress, a trigger's contact days,
 * or a medication's use days), switched via a chip row — never more than one comparison at once,
 * to stay legible. Stress shares the model's own 1-5 scale, so it renders as a genuine second
 * line on a secondary y-axis; trigger/medication contact is binary (a join-table row = contact
 * that day), so it renders as a marker row under the axis instead of a fabricated 0-5 value.
 */
export function SeverityComparisonChart({ sites, colorById }: SeverityComparisonChartProps) {
  const activeUserId = useActiveUserId();
  const router = useRouter();
  const [containerWidth, setContainerWidth] = useState(0);
  const shotRef = useRef<ViewShotRef>(null);
  // Toggled true only for the instant the export button captures the chart — reveals
  // exportHeader (title, date range, and a static site/compare-series key) inside the ViewShot so
  // a saved/shared image is self-contained, without permanently duplicating the SiteToggleLegend
  // and range controls already shown live above the chart.
  const [isExporting, setIsExporting] = useState(false);

  const chartableSites = useMemo(() => sites.filter((s) => colorById[s.id]), [sites, colorById]);
  const [requestedActiveSiteIds, setRequestedActiveSiteIds] = useActiveSiteSelection(chartableSites);
  const sitesById = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites]);

  const [range, setRange] = useState<RangeState>(defaultRangeState);
  const [gapMode, setGapMode] = useState<GapMode>('break');
  const [selection, setSelection] = useState<CompareSelection>({ kind: 'stress' });

  const [triggers, setTriggers] = useState<{ id: string; name: string }[]>([]);
  const [medications, setMedications] = useState<{ id: string; name: string }[]>([]);

  // Re-fetch on focus, same as insights.tsx's site list — a trigger/medication added or retired
  // elsewhere should show up here without needing to leave and re-enter the tab.
  useFocusEffect(
    useCallback(() => {
      if (!activeUserId) return;
      getActiveTriggers(db, activeUserId).then(setTriggers);
      getActiveMedications(db, activeUserId).then(setMedications);
    }, [activeUserId])
  );

  // A selected trigger/medication that's since been deactivated/deleted falls back to stress
  // rather than silently querying a dangling id.
  useEffect(() => {
    if (selection.kind === 'trigger' && !triggers.some((t) => t.id === selection.id)) {
      setSelection({ kind: 'stress' });
    }
    if (selection.kind === 'medication' && !medications.some((m) => m.id === selection.id)) {
      setSelection({ kind: 'stress' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggers, medications]);

  const { activeSiteIds, bucketDates, displayBySite } = useSiteSeverityBuckets({
    userId: activeUserId,
    sites,
    colorById,
    requestedActiveSiteIds,
    from: range.from,
    to: range.to,
    granularity: range.granularity,
    gapMode,
  });

  // The compare series' own raw fetch — re-runs whenever the selection or range changes.
  const [stressRaw, setStressRaw] = useState<{ date: string; value: number | null }[]>([]);
  const [contactDays, setContactDays] = useState<string[]>([]);

  useEffect(() => {
    if (!activeUserId) return;
    let cancelled = false;
    if (selection.kind === 'stress') {
      getStressSeries(db, activeUserId, range.from, range.to).then((rows) => {
        if (!cancelled) setStressRaw(rows);
      });
    } else if (selection.kind === 'trigger') {
      getTriggerDays(db, activeUserId, selection.id, range.from, range.to).then((rows) => {
        if (!cancelled) setContactDays(rows);
      });
    } else {
      getMedicationDays(db, activeUserId, selection.id, range.from, range.to).then((rows) => {
        if (!cancelled) setContactDays(rows);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, selectionKey(selection), range.from, range.to]);

  const stressBuckets = useMemo(
    () =>
      selection.kind === 'stress'
        ? buildBuckets(stressRaw, { from: range.from, to: range.to, granularity: range.granularity, weekStartsOn: 1, aggregate: 'mean' })
        : [],
    [selection.kind, stressRaw, range.from, range.to, range.granularity]
  );

  // Binary contact reused through buildBuckets by treating a contact day as value:1 — 'max'
  // aggregation means a bucket reads as contact iff ANY day inside it was a contact day. A day
  // absent from contactDays is simply never passed in, so it stays a true gap (never a 0).
  const contactBuckets = useMemo(
    () =>
      selection.kind !== 'stress'
        ? buildBuckets(
            contactDays.map((date) => ({ date, value: 1 })),
            { from: range.from, to: range.to, granularity: range.granularity, weekStartsOn: 1, aggregate: 'max' }
          )
        : [],
    [selection.kind, contactDays, range.from, range.to, range.granularity]
  );

  const chipOptions = useMemo<ChipOption<string>[]>(() => {
    const options: ChipOption<string>[] = [{ value: 'stress', label: 'Stress', color: COMPARE_COLOR }];
    for (const t of triggers) options.push({ value: `trigger:${t.id}`, label: t.name });
    for (const m of medications) options.push({ value: `medication:${m.id}`, label: m.name });
    return options;
  }, [triggers, medications]);

  const chipValue = selection.kind === 'stress' ? 'stress' : `${selection.kind}:${selection.id}`;
  const handleChipChange = (value: string) => {
    if (value === 'stress') {
      setSelection({ kind: 'stress' });
    } else if (value.startsWith('trigger:')) {
      setSelection({ kind: 'trigger', id: value.slice('trigger:'.length) });
    } else if (value.startsWith('medication:')) {
      setSelection({ kind: 'medication', id: value.slice('medication:'.length) });
    }
  };

  const compareLabel =
    selection.kind === 'stress' ? 'stress' : selection.kind === 'trigger' ? (triggers.find((t) => t.id === selection.id)?.name ?? 'trigger') : (medications.find((m) => m.id === selection.id)?.name ?? 'medication');

  const labels = useMemo(
    () => bucketMonthLabels(bucketDates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucketDates.join(',')]
  );

  const plotWidth = Math.max(MIN_PLOT_WIDTH, containerWidth - Y_AXIS_LABEL_WIDTH - CHART_INITIAL_SPACING - CHART_END_SPACING);
  const spacingPx = bucketDates.length > 1 ? plotWidth / (bucketDates.length - 1) : 0;

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

  const colorAtOrUndefined = (id: string | undefined): string | undefined => (id ? colorById[id] : undefined);

  // Only a single real day maps cleanly to "view this day" — a week/month bucket covers several,
  // so the affordance is withheld rather than guessing which day inside it the user meant.
  const canViewDay = range.granularity === 'day';

  const renderTooltip = (pointerIndex: number) => {
    const date = bucketDates[pointerIndex];
    if (!date) return null;
    return (
      <View style={styles.tooltip}>
        <AppText variant="label" color={colors.textPrimary}>
          {formatBucketDate(date, range.granularity)}
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
        <View style={styles.tooltipRow}>
          <View style={[styles.tooltipSwatch, { backgroundColor: COMPARE_COLOR }]} />
          <AppText variant="caption" color={colors.textSecondary}>
            {selection.kind === 'stress'
              ? (() => {
                  const bucket = stressBuckets[pointerIndex];
                  const valueText = !bucket || !bucket.logged ? 'no check-in' : bucket.value === null ? 'not scored' : String(bucket.value);
                  return `Stress: ${valueText}`;
                })()
              : `${compareLabel}: ${contactBuckets[pointerIndex]?.value === 1 ? 'yes' : 'not marked'}`}
          </AppText>
        </View>
        {canViewDay ? (
          <Pressable
            onPress={() => router.push({ pathname: '/today', params: { date } })}
            accessibilityRole="button"
            style={styles.viewDayButton}
          >
            <AppText variant="label" color={colors.accent}>
              View this day
            </AppText>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const exportButton = (
    <ChartExportButton
      shotRef={shotRef}
      chartTitle="Severity comparison"
      beforeCapture={() => setIsExporting(true)}
      afterCapture={() => setIsExporting(false)}
    />
  );

  const controls = (
    <>
      {chartableSites.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" color={colors.textSecondary}>
            Sites
          </AppText>
          <SiteToggleLegend sites={chartableSites} colorById={colorById} activeSiteIds={requestedActiveSiteIds} onChange={setRequestedActiveSiteIds} />
        </View>
      ) : null}
      <View style={styles.section}>
        <AppText variant="label" color={colors.textSecondary}>
          Compare against
        </AppText>
        <ChipSelect options={chipOptions} value={chipValue} onChange={handleChipChange} />
      </View>
      <RangeAndGranularityControls value={range} onChange={setRange} />
      <GapModeControl value={gapMode} onChange={setGapMode} />
    </>
  );

  if (activeSiteIds.length === 0) {
    return (
      <ChartCard title="Severity comparison" headerRight={exportButton}>
        {controls}
        <AppText variant="caption" color={colors.textSecondary} style={styles.emptyNote}>
          {chartableSites.length === 0 ? 'Add a site to compare its trend here.' : 'Turn on a site above to compare its trend.'}
        </AppText>
      </ChartCard>
    );
  }

  const hasSeverity = activeSiteIds.some((id) => (displayBySite[id] ?? []).some((b) => b.value !== null));
  const hasCompareData = selection.kind === 'stress' ? stressBuckets.some((b) => b.value !== null) : contactBuckets.some((b) => b.value === 1);

  if (!hasSeverity && !hasCompareData) {
    return (
      <ChartCard title="Severity comparison" headerRight={exportButton}>
        {controls}
        <AppText variant="caption" color={colors.textSecondary} style={styles.emptyNote}>
          Nothing logged in this stretch yet — that's alright.
        </AppText>
      </ChartCard>
    );
  }

  const dateRangeLabel = `${formatBucketDate(bucketDates[0], range.granularity)} – ${formatBucketDate(bucketDates[bucketDates.length - 1], range.granularity)}`;

  const summary =
    selection.kind === 'stress'
      ? `Severity 0 to 5 vs stress 0 to 5, ${formatBucketDate(bucketDates[0], range.granularity)} to ${formatBucketDate(bucketDates[bucketDates.length - 1], range.granularity)}.`
      : `Severity 0 to 5, ${formatBucketDate(bucketDates[0], range.granularity)} to ${formatBucketDate(bucketDates[bucketDates.length - 1], range.granularity)}. ${compareLabel} contact days marked below the axis.`;

  // Static key for the exported/shared image only (see isExporting) — each active site's line
  // color + name, plus the one comparison series currently plotted (stress, or the selected
  // trigger/medication's contact-day color).
  const exportLegendEntries: { key: string; color: string; label: string }[] = [
    ...activeSiteIds.map((id) => ({ key: id, color: colorById[id], label: sitesById.get(id) ?? 'Site' })),
    { key: 'compare', color: COMPARE_COLOR, label: selection.kind === 'stress' ? 'Stress' : compareLabel },
  ];

  return (
    <ChartCard title="Severity comparison" headerRight={exportButton}>
      {controls}
      <ViewShot ref={shotRef} style={styles.shotArea}>
        {isExporting ? (
          <View style={styles.exportHeader}>
            <AppText variant="title" color={colors.textPrimary}>
              Severity comparison
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {dateRangeLabel}
            </AppText>
            <View style={styles.exportLegend}>
              {exportLegendEntries.map((entry) => (
                <View key={entry.key} style={styles.exportLegendItem}>
                  <View style={[styles.exportLegendSwatch, { backgroundColor: entry.color }]} />
                  <AppText variant="caption" color={colors.textPrimary}>
                    {entry.label}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}
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
                  color={colorAtOrUndefined(siteAt(0))}
                  color2={colorAtOrUndefined(siteAt(1))}
                  color3={colorAtOrUndefined(siteAt(2))}
                  color4={colorAtOrUndefined(siteAt(3))}
                  color5={colorAtOrUndefined(siteAt(4))}
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
                  labelsExtraHeight={LABELS_EXTRA_HEIGHT + (selection.kind !== 'stress' ? RUG_HEIGHT : 0)}
                  xAxisLabelTextStyle={axisTextStyle}
                  hideRules
                  curved={false}
                  thickness={2}
                  thickness2={2}
                  thickness3={2}
                  thickness4={2}
                  thickness5={2}
                  initialSpacing={CHART_INITIAL_SPACING}
                  endSpacing={CHART_END_SPACING}
                  spacing={spacingPx}
                  secondaryData={
                    selection.kind === 'stress'
                      ? stressBuckets.map((b, i) => ({ value: b.value === null ? undefined : b.value, label: labels[i] }))
                      : undefined
                  }
                  secondaryLineConfig={selection.kind === 'stress' ? { color: COMPARE_COLOR, thickness: 2 } : undefined}
                  secondaryYAxis={
                    selection.kind === 'stress'
                      ? { maxValue: MAX_VALUE, noOfSections: MAX_VALUE, yAxisColor: COMPARE_COLOR, yAxisTextStyle: axisTextStyle }
                      : undefined
                  }
                  pointerConfig={{
                    pointerStripHeight: CHART_HEIGHT,
                    pointerStripColor: colors.border,
                    pointerStripWidth: 2,
                    radius: 5,
                    pointer1Color: colorAtOrUndefined(siteAt(0)),
                    pointer2Color: colorAtOrUndefined(siteAt(1)),
                    pointer3Color: colorAtOrUndefined(siteAt(2)),
                    pointer4Color: colorAtOrUndefined(siteAt(3)),
                    pointer5Color: colorAtOrUndefined(siteAt(4)),
                    secondaryPointerColor: COMPARE_COLOR,
                    activatePointersInstantlyOnTouch: true,
                    activatePointersOnLongPress: false,
                    persistPointer: true,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelWidth: 220,
                    pointerLabelHeight: 24 * (activeSiteIds.length + 2) + spacing.md,
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
                {selection.kind !== 'stress'
                  ? bucketDates.map((_, i) => {
                      if (contactBuckets[i]?.value !== 1) return null;
                      const left = Y_AXIS_LABEL_WIDTH + CHART_INITIAL_SPACING + i * spacingPx - RUG_MARK_SIZE / 2;
                      const top = plotTop(0, MAX_VALUE, CHART_HEIGHT) + spacing.xs;
                      return <View key={i} pointerEvents="none" style={[styles.rugMark, { left, top }]} />;
                    })
                  : null}
              </View>
            ) : null}
          </View>
        </View>
      </ViewShot>
      <AppText variant="caption" color={colors.textSecondary}>
        {selection.kind === 'stress'
          ? 'Touch or drag the chart to see each site and stress for a day.'
          : `Touch or drag the chart to see each site and whether ${compareLabel.toLowerCase()} was marked for a day. Marks below the axis show contact days.`}
      </AppText>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  shotArea: {
    backgroundColor: colors.surfaceAlt,
  },
  exportHeader: {
    gap: spacing.xs,
    paddingHorizontal: CHART_SIDE_MARGIN,
    paddingTop: spacing.sm,
  },
  exportLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exportLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exportLegendSwatch: {
    width: 10,
    height: 10,
    borderRadius: radius.sm,
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
  rugMark: {
    position: 'absolute',
    width: RUG_MARK_SIZE,
    height: RUG_MARK_SIZE,
    borderRadius: RUG_MARK_SIZE / 2,
    backgroundColor: COMPARE_COLOR,
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
  viewDayButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
});
