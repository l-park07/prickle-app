import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import { colors, spacing } from '../../app/theme';
import { formatFriendlyDate } from '../../lib/calendarMath';
import type { GapMode } from '../../lib/chartSeries';
import { AppText } from '../AppText';
import { axisTextStyle } from './chartTheme';
import { ChartCard } from './ChartCard';
import { ScoreDataPoint } from './ScoreDataPoint';
import { buildScoreChartLayout, toScoreChartPoints } from './scoreChartLayout';

type ScoreOverTimeBackground =
  | { type: 'bands'; sectionColors: string[] }
  | { type: 'gradient'; colors: [string, string] }; // [top, bottom] of the vertical LinearGradient

interface ScoreOverTimeProps {
  title: string; // "POEM" | "RECAP" — also the accessibility label prefix
  copyright: string;
  data: { weekStart: string; score: number }[];
  gapMode: GapMode;
  maxValue: number;
  noOfSections: number;
  yAxisLabelTexts: string[];
  background: ScoreOverTimeBackground;
  /** Omitted when the metric has no published bands (RECAP) — never invented here. */
  band?: (score: number) => string | null;
  emptyMessage: string;
}

const CHART_HEIGHT = 220;
const INITIAL_SPACING = spacing.lg;
const END_SPACING = spacing.lg;
const MIN_PLOT_WIDTH = 100;

function formatScoreWithBand(score: number, band: string | null): string {
  return band ? `${score} (${band})` : `${score}`;
}

/** Shared weekly-assessment trend chart (POEM, RECAP, ...): true-time-axis line, gap-aware, tap-to-tooltip. */
export function ScoreOverTime({
  title,
  copyright,
  data,
  gapMode,
  maxValue,
  noOfSections,
  yAxisLabelTexts,
  background,
  band,
  emptyMessage,
}: ScoreOverTimeProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const points = useMemo(() => toScoreChartPoints(data, band ?? (() => null)), [data, band]);
  const selectedPoint = selectedIndex != null ? (points[selectedIndex] ?? null) : null;

  const plotWidth = Math.max(MIN_PLOT_WIDTH, containerWidth - INITIAL_SPACING - END_SPACING);
  const layout = useMemo(
    () => buildScoreChartLayout(points, { gapMode, plotWidth }),
    [points, gapMode, plotWidth]
  );

  const handleLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  const attribution = (
    <AppText variant="caption" color={colors.textSecondary}>
      {copyright}
    </AppText>
  );

  if (points.length < 2) {
    return (
      <ChartCard
        title={title}
        attribution={attribution}
        empty={
          <AppText variant="caption" color={colors.textSecondary}>
            {emptyMessage}
          </AppText>
        }
      />
    );
  }

  const scores = points.map((p) => p.score);
  const lowest = points[scores.indexOf(Math.min(...scores))];
  const highest = points[scores.indexOf(Math.max(...scores))];
  const summary = `Weekly ${title} scores from ${formatFriendlyDate(points[0].weekStart)} to ${formatFriendlyDate(points[points.length - 1].weekStart)}, ranging from ${formatScoreWithBand(lowest.score, lowest.band)} to ${formatScoreWithBand(highest.score, highest.band)}.`;

  const chartData = points.map((point, i) => ({
    value: point.score,
    spacing: layout.spacing[i],
    label: i === 0 || i === points.length - 1 ? formatFriendlyDate(point.weekStart) : '',
  }));

  return (
    <ChartCard title={title} attribution={attribution} summary={summary}>
      <View onLayout={handleLayout}>
        {containerWidth > 0 ? (
          <View style={styles.chartArea}>
            {background.type === 'gradient' ? (
              <LinearGradient
                colors={background.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <LineChart
              data={chartData}
              height={CHART_HEIGHT}
              maxValue={maxValue}
              noOfSections={noOfSections}
              backgroundColor="transparent"
              sectionColors={background.type === 'bands' ? background.sectionColors : undefined}
              overflowTop={0}
              yAxisLabelTexts={yAxisLabelTexts}
              yAxisTextStyle={axisTextStyle}
              yAxisLabelWidth={28}
              xAxisLabelTextStyle={axisTextStyle}
              rotateLabel
              hideRules
              curved={false}
              color={colors.primary}
              thickness={2}
              initialSpacing={INITIAL_SPACING}
              endSpacing={END_SPACING}
              lineSegments={layout.lineSegments}
              customDataPoint={(_item: unknown, index: number) => (
                <ScoreDataPoint
                  point={points[index]}
                  metricLabel={title}
                  selected={index === selectedIndex}
                  onSelect={() => setSelectedIndex(index)}
                />
              )}
            />
          </View>
        ) : null}
      </View>

      {selectedPoint ? (
        <AppText variant="body" color={colors.textPrimary}>
          {formatFriendlyDate(selectedPoint.weekStart)} · {title} {selectedPoint.score}
          {selectedPoint.band ? ` · ${selectedPoint.band}` : ''}
        </AppText>
      ) : null}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  chartArea: {
    position: 'relative',
  },
});
