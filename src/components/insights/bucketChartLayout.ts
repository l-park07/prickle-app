// bucketChartLayout.ts
// -----------------------------------------------------------------------------
// Layout math for charts built on chartSeries.ts's buildBuckets() — MULTIPLE
// simultaneous series (e.g. several sites' severity lines) sharing one dense,
// evenly-spaced bucket axis. Kept separate from scoreChartLayout.ts on purpose:
// that file lays out free-floating real-world dates (POEM/RECAP, one point per
// actual assessment) with variable day-gap spacing, while a bucketed series is
// ALREADY a regular grid by construction (every day/week/month in [from,to] gets
// a slot, real or null) — so it only ever needs uniform pixel spacing, never
// scoreChartLayout's day-gap math.
// -----------------------------------------------------------------------------
import type { LineSegment } from 'react-native-gifted-charts';
import { formatFriendlyDate, formatLongDate, formatMonthYear, formatShortDate } from '../../lib/calendarMath';
import type { Bucket, Granularity } from '../../lib/chartSeries';

/** Bucket date -> a worded label matching that bucket's own granularity (a week bucket's date is
 *  its Monday start, a month bucket's is the 1st — neither reads well as a bare day name). Shared
 *  by every chart built on buildBuckets() so tooltip/summary date wording stays consistent. */
export function formatBucketDate(date: string, granularity: Granularity): string {
  if (granularity === 'month') {
    const [year, month] = date.split('-').map(Number);
    return formatMonthYear(year, month - 1);
  }
  if (granularity === 'week') return `Week of ${formatLongDate(date)}`;
  return formatFriendlyDate(date);
}

/**
 * At most `maxLabels` x-axis labels, evenly spaced by INDEX (never one per bucket — that's an
 * unreadable smear at fine/daily granularity), always including the first and last bucket. Uses
 * formatShortDate rather than formatBucketDate: axis space is tight regardless of granularity, so
 * every tick gets the same compact "1 Apr" form instead of a scheme tied to calendar-month starts.
 */
export function evenlySpacedBucketLabels(bucketDates: string[], maxLabels = 5): string[] {
  const labels = bucketDates.map(() => '');
  const count = Math.min(maxLabels, bucketDates.length);
  if (count === 0) return labels;
  if (count === 1) {
    labels[0] = formatShortDate(bucketDates[0]);
    return labels;
  }
  const shown = new Set<number>();
  for (let k = 0; k < count; k++) {
    shown.add(Math.round((k * (bucketDates.length - 1)) / (count - 1)));
  }
  shown.forEach((index) => {
    labels[index] = formatShortDate(bucketDates[index]);
  });
  return labels;
}

/** Indices of single-bucket runs from bucketsToLineSegments' output — a gifted-charts line segment
 *  needs 2 points to draw anything, so these are the isolated logged days that need their own dot. */
export function isolatedSegmentIndices(segments: LineSegment[]): number[] {
  return segments.filter((s) => s.startIndex === s.endIndex).map((s) => s.startIndex);
}

/**
 * Consecutive-non-null runs in one series' buckets, as gifted-charts LineSegment ranges. Unlike
 * scoreChartLayout's day-gap threshold (needed because POEM/RECAP points sit at irregular real
 * dates), a bucketed axis is already evenly spaced — any single null bucket IS the gap, so no
 * distance threshold is needed here.
 */
export function bucketsToLineSegments(buckets: Bucket[]): LineSegment[] {
  const segments: LineSegment[] = [];
  let start: number | null = null;
  buckets.forEach((bucket, index) => {
    if (bucket.value !== null) {
      if (start === null) start = index;
    } else if (start !== null) {
      segments.push({ startIndex: start, endIndex: index - 1 });
      start = null;
    }
  });
  if (start !== null) segments.push({ startIndex: start, endIndex: buckets.length - 1 });
  return segments;
}

/**
 * 'omit' mode across MULTIPLE simultaneous series (e.g. several active site lines): a bucket
 * index survives only if AT LEAST ONE of the given series has a real value there. Filtering each
 * series' own nulls independently (each dropping a different set of buckets) would silently
 * misalign which calendar date sits at a given pixel between two lines — this keeps every visible
 * series on the same shared x-axis. Callers apply the same keep[] to every series (including ones
 * that end up all-null in the kept range — that's an honest "no data for this site in this
 * window", not a bug).
 */
export function sharedOmitKeepIndex(seriesList: Bucket[][]): boolean[] {
  const length = seriesList.find((s) => s.length > 0)?.length ?? 0;
  return Array.from({ length }, (_, index) => seriesList.some((series) => series[index]?.value !== null));
}

export function applyKeepIndex(buckets: Bucket[], keep: boolean[]): Bucket[] {
  return buckets.filter((_, index) => keep[index]);
}
