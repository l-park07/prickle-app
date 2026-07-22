import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors, radius, spacing } from '../../app/theme';
import type { Granularity } from '../../lib/chartSeries';
import { hasEnoughBucketData } from '../../lib/chartSeries';
import { AppText } from '../AppText';
import { bucketsToLineSegments, evenlySpacedBucketLabels, formatBucketDate, isolatedSegmentIndices } from './bucketChartLayout';
import { axisTextStyle, CHART_INITIAL_SPACING, plotTop, Y_AXIS_LABEL_WIDTH } from './chartTheme';
import { EventBackgroundBands } from './EventBackgroundBands';
import { EventLanes, type EventLaneSeries } from './EventLanes';
import { evenTicks } from './scoreChartLayout';
import type { OverlayLineSeries } from './useOverlayChartData';

const CHART_HEIGHT = 220;
const MIN_PLOT_WIDTH = 100;
const TICK_LABEL_HEIGHT = 20;
// Smaller than SeverityOverTimeChart's own 40 — that value leaves blank buffer below the short
// single-line "14 Jul" labels this chart uses, which just pushed EventLanes further from the axis
// than needed. Tightened here (not touched globally) since only this chart has lanes to bring in.
// 20 is close to axisTextStyle's own line height (16) — little room left before the date labels
// themselves would start clipping, so this is close to the floor for this approach.
const LABELS_EXTRA_HEIGHT = 20;
const CHART_SIDE_MARGIN = spacing.sm;
const ISOLATED_DOT_SIZE = 8;
const MAX_VALUE = 5;
const LEADING_WIDTH = Y_AXIS_LABEL_WIDTH + CHART_INITIAL_SPACING;

interface OverlayChartProps {
  title: string;
  bucketDates: string[];
  bucketGranularity: Granularity;
  /** At most 5 — the gifted-charts line-slot cap. Paint order: earlier entries render behind
   *  later ones (see useOverlayChartData's line budget — stress/mood come first on purpose). */
  lineSeries: OverlayLineSeries[];
  eventSeries: EventLaneSeries[];
}

function colorAt(series: OverlayLineSeries[], i: number): string | undefined {
  return series[i]?.color;
}

/**
 * The overlay chart's plot: site/stress/mood lines, y-axis ticks, isolated-day dots, and
 * (behind/beneath the lines) EventBackgroundBands/EventLanes for trigger/medication series.
 * Mirrors SeverityOverTimeChart.tsx's rendering approach closely (same shared layout helpers) but
 * driven by a config-resolved series list instead of a fixed sites prop.
 */
export function OverlayChart({ title, bucketDates, bucketGranularity, lineSeries, eventSeries }: OverlayChartProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const handleLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  const plotWidth = Math.max(MIN_PLOT_WIDTH, containerWidth - Y_AXIS_LABEL_WIDTH);
  const spacingPx = bucketDates.length > 1 ? (plotWidth - CHART_INITIAL_SPACING) / (bucketDates.length - 1) : 0;

  const labels = evenlySpacedBucketLabels(bucketDates);

  const toLineData = (series: OverlayLineSeries, withLabels: boolean) =>
    series.buckets.map((b, i) => ({
      value: b.value === null ? undefined : b.value,
      ...(withLabels ? { label: labels[i] } : {}),
    }));

  const segmentsAt = (i: number) => (lineSeries[i] ? bucketsToLineSegments(lineSeries[i].buckets) : undefined);

  // A gifted-charts line segment needs 2 points to draw anything, so a single logged day
  // surrounded by gaps otherwise renders nothing (hideDataPoints is set globally below) — render
  // those as their own small dot, same formula SeverityOverTimeChart/SeverityComparisonChart use.
  const isolatedDotsAt = (i: number) => {
    const series = lineSeries[i];
    if (!series) return [];
    return isolatedSegmentIndices(bucketsToLineSegments(series.buckets)).map((index) => ({
      index,
      value: series.buckets[index].value as number,
      color: series.color,
    }));
  };

  const renderTooltip = (pointerIndex: number) => {
    const date = bucketDates[pointerIndex];
    if (!date) return null;
    return (
      <View style={styles.tooltip}>
        <AppText variant="label" color={colors.textPrimary}>
          {formatBucketDate(date, bucketGranularity)}
        </AppText>
        {lineSeries.map((series) => {
          const bucket = series.buckets[pointerIndex];
          const valueText = !bucket || !bucket.logged ? 'no check-in' : bucket.value === null ? 'not scored' : String(bucket.value);
          return (
            <View key={series.id} style={styles.tooltipRow}>
              <View style={[styles.tooltipSwatch, { backgroundColor: series.color }]} />
              <AppText variant="caption" color={colors.textSecondary}>
                {series.label}: {valueText}
              </AppText>
            </View>
          );
        })}
      </View>
    );
  };

  const hasEnoughData = hasEnoughBucketData(lineSeries.map((s) => s.buckets));

  if (!hasEnoughData) {
    return (
      <AppText variant="caption" color={colors.textSecondary} style={styles.emptyNote}>
        Not enough logged days yet to show this. It'll fill in as you go.
      </AppText>
    );
  }

  const lineNames = lineSeries.map((s) => s.label).join(', ');
  const eventNames = eventSeries.map((s) => s.label).join(', ');
  const dateRangeLabel = `${formatBucketDate(bucketDates[0], bucketGranularity)} to ${formatBucketDate(bucketDates[bucketDates.length - 1], bucketGranularity)}`;
  const summary = `${title}: ${lineNames}, ${dateRangeLabel}${eventNames ? `, with ${eventNames} markers` : ''}.`;

  return (
    <View style={styles.chartMargin}>
      <View onLayout={handleLayout} accessible accessibilityLabel={summary}>
        {containerWidth > 0 ? (
          <>
            <View style={styles.chartArea}>
              <EventBackgroundBands
                bucketDates={bucketDates}
                spacingPx={spacingPx}
                leadingWidth={LEADING_WIDTH}
                series={eventSeries}
                plotHeight={CHART_HEIGHT}
              />
              <LineChart
                data={lineSeries[0] ? toLineData(lineSeries[0], true) : []}
                data2={lineSeries[1] ? toLineData(lineSeries[1], false) : undefined}
                data3={lineSeries[2] ? toLineData(lineSeries[2], false) : undefined}
                data4={lineSeries[3] ? toLineData(lineSeries[3], false) : undefined}
                data5={lineSeries[4] ? toLineData(lineSeries[4], false) : undefined}
                color={colorAt(lineSeries, 0)}
                color2={colorAt(lineSeries, 1)}
                color3={colorAt(lineSeries, 2)}
                color4={colorAt(lineSeries, 3)}
                color5={colorAt(lineSeries, 4)}
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
                thickness={lineSeries[0]?.thin ? 1 : 2}
                thickness2={lineSeries[1]?.thin ? 1 : 2}
                thickness3={lineSeries[2]?.thin ? 1 : 2}
                thickness4={lineSeries[3]?.thin ? 1 : 2}
                thickness5={lineSeries[4]?.thin ? 1 : 2}
                initialSpacing={CHART_INITIAL_SPACING}
                width={plotWidth}
                adjustToWidth
                pointerConfig={{
                  pointerStripHeight: CHART_HEIGHT,
                  pointerStripColor: colors.border,
                  pointerStripWidth: 2,
                  radius: 5,
                  pointer1Color: colorAt(lineSeries, 0),
                  pointer2Color: colorAt(lineSeries, 1),
                  pointer3Color: colorAt(lineSeries, 2),
                  pointer4Color: colorAt(lineSeries, 3),
                  pointer5Color: colorAt(lineSeries, 4),
                  activatePointersInstantlyOnTouch: true,
                  activatePointersOnLongPress: false,
                  persistPointer: true,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelWidth: 200,
                  pointerLabelHeight: 24 * (lineSeries.length + 1) + spacing.md,
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
              {lineSeries.map((_, i) =>
                isolatedDotsAt(i).map((dot) => {
                  const left = LEADING_WIDTH + dot.index * spacingPx - ISOLATED_DOT_SIZE / 2;
                  const top = plotTop(dot.value, MAX_VALUE, CHART_HEIGHT) - ISOLATED_DOT_SIZE / 2;
                  return (
                    <View
                      key={`${i}-${dot.index}`}
                      pointerEvents="none"
                      style={[styles.isolatedDot, { left, top, backgroundColor: dot.color }]}
                    />
                  );
                })
              )}
            </View>
            <EventLanes bucketDates={bucketDates} spacingPx={spacingPx} leadingWidth={LEADING_WIDTH} series={eventSeries} />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  isolatedDot: {
    position: 'absolute',
    width: ISOLATED_DOT_SIZE,
    height: ISOLATED_DOT_SIZE,
    borderRadius: ISOLATED_DOT_SIZE / 2,
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
