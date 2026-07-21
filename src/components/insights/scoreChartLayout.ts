// scoreChartLayout.ts
// -----------------------------------------------------------------------------
// Pure date-math/segment-math shared by every weekly-assessment trend chart
// (POEM, RECAP, ...) — kept separate from rendering so the gap contract
// (skipped weeks are holes, never 0) can be reasoned about — and stepped
// through by hand against a sparse seeded profile — independent of
// react-native-gifted-charts. Metric-agnostic: only looks at weekStart/score.
// -----------------------------------------------------------------------------
import type { LineSegment } from 'react-native-gifted-charts';
import { daysBetween } from '../../lib/calendarMath';
import type { GapMode } from '../../lib/chartSeries';

export interface ScoreChartPoint {
  weekStart: string;
  score: number;
  /** e.g. poemBand(score) — null when the metric has no published bands (RECAP). */
  band: string | null;
}

export function toScoreChartPoints(
  rows: { weekStart: string; score: number }[],
  band: (score: number) => string | null
): ScoreChartPoint[] {
  return rows.map((r) => ({ weekStart: r.weekStart, score: r.score, band: band(r.score) }));
}

/** A gap wider than this (days) breaks the line in 'break' mode — comfortably past the 7-day
 * cadence so a few days' late submission doesn't falsely break, but any actually-skipped week does. */
const DEFAULT_BREAK_THRESHOLD_DAYS = 10;

export interface ScoreChartLayout {
  /** Per-point pixel spacing (distance from the previous point), same order as the input points. */
  spacing: number[];
  /** Which index ranges the line should actually connect. */
  lineSegments: LineSegment[];
}

/**
 * Lays out already-gap-filtered points (no null/placeholder entries — see getPoemSeries/
 * getRecapSeries) onto a true time axis ('break') or an evenly-spaced "nth recording" axis
 * ('omit'), per chartSeries.ts's documented GapMode semantics, just applied to free-floating
 * points instead of fixed buckets.
 */
export function buildScoreChartLayout(
  points: ScoreChartPoint[],
  opts: { gapMode: GapMode; plotWidth: number; breakThresholdDays?: number }
): ScoreChartLayout {
  const { gapMode, plotWidth, breakThresholdDays = DEFAULT_BREAK_THRESHOLD_DAYS } = opts;

  if (points.length === 0) return { spacing: [], lineSegments: [] };
  if (points.length === 1) return { spacing: [0], lineSegments: [{ startIndex: 0, endIndex: 0 }] };

  if (gapMode === 'omit') {
    const evenSpacing = plotWidth / (points.length - 1);
    return {
      spacing: points.map((_, i) => (i === 0 ? 0 : evenSpacing)),
      lineSegments: [{ startIndex: 0, endIndex: points.length - 1 }],
    };
  }

  const totalDays = daysBetween(points[0].weekStart, points[points.length - 1].weekStart) || 1;
  const pxPerDay = plotWidth / totalDays;

  const spacing: number[] = [0];
  const lineSegments: LineSegment[] = [];
  let segmentStart = 0;

  for (let i = 1; i < points.length; i++) {
    const gapDays = daysBetween(points[i - 1].weekStart, points[i].weekStart);
    spacing.push(pxPerDay * gapDays);
    if (gapDays > breakThresholdDays) {
      lineSegments.push({ startIndex: segmentStart, endIndex: i - 1 });
      segmentStart = i;
    }
  }
  lineSegments.push({ startIndex: segmentStart, endIndex: points.length - 1 });

  return { spacing, lineSegments };
}
