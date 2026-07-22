// chartSeries.ts
// -----------------------------------------------------------------------------
// Pure, framework-agnostic helpers for turning sparse (date -> value) health data
// into chart-ready series, with EXPLICIT gap handling.
//
// WHY THIS EXISTS
// Prickle's core invariant: a missing day is "not recorded", NOT zero. That rule
// has to survive all the way into the charts. If you interpolate through gaps or
// coerce them to 0, the chart silently lies (a 3-week silence would read as a run
// of "great" days). These helpers keep every gap explicit and let each chart
// decide how to *show* it.
//
// No React / React Native imports on purpose — this is testable logic. When the
// Jest setup lands (jest-expo), buildBuckets / toCsv-style pure functions are
// exactly what to unit-test (bucketing, aggregation, gap handling, date math).
//
// NOTE FOR THE IMPLEMENTER: this file produces a library-agnostic Bucket[]. The
// final hop — mapping Bucket[] into react-native-gifted-charts `data` and making
// the LINE BREAK at null buckets — must be verified against the installed
// gifted-charts version (the exact prop for line interruptions has changed across
// releases). Do not assume; check node_modules / the current docs.
// -----------------------------------------------------------------------------

export type Granularity = 'day' | 'week' | 'month';

/**
 * Picks a bucket granularity for a chart that always plots full history: fine enough to be useful
 * over a short span, coarse enough that the bucket count — and so the x-axis label count — stays
 * readable once the history stretches over many months or years. Thresholds are chosen to keep the
 * bucket count in roughly the same 40-60 range regardless of span.
 */
export function autoGranularity(spanDays: number): Granularity {
  if (spanDays <= 60) return 'day';
  if (spanDays <= 420) return 'week';
  return 'month';
}

/**
 * How to render missing data:
 *  - 'break': keep a TRUE time axis; leave a hole where there's no value. Honest
 *             about elapsed time. This is the recommended default.
 *  - 'omit' : drop empty buckets and space recorded points evenly by index. The
 *             x-axis then means "nth recording", not real time. Cleaner for very
 *             sparse profiles (e.g. Jason: 232 no-log days / 365).
 */
export type GapMode = 'break' | 'omit';

export type Aggregate = 'max' | 'min' | 'mean' | 'last';

export interface RawEntry {
  /** ISO calendar date, day precision, e.g. '2025-04-12'. */
  date: string;
  /**
   * null  = logged but not scored / not applicable (a recorded gap).
   * number = a real value.
   * Days with NO entry at all should simply be ABSENT from the array
   * (no row = no entry, per the schema). Do not pass them in as null.
   */
  value: number | null;
}

export interface Bucket {
  /** ISO date of the bucket's start (the day, the week-start, or the 1st of month). */
  date: string;
  /** null when there is nothing to plot in this bucket (a gap on the line). */
  value: number | null;
  /** true when this bucket had at least one real (non-null) value. */
  recorded: boolean;
  /**
   * true when this bucket had at least one entry, even if only null ones.
   * Mirrors the calendar's tri-state: you can use this to draw a small "checked
   * in, no score" tick that is visually distinct from a total no-data gap.
   */
  logged: boolean;
}

// --- date utils (calendar-date safe: no timezone drift) ----------------------

const DAY_MS = 86_400_000;

function parseISO(d: string): [number, number, number] {
  const [y, m, day] = d.split('-').map(Number);
  return [y, m, day];
}

function toISO(y: number, m: number, day: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(m)}-${p(day)}`;
}

/** Parse a YYYY-MM-DD string to a UTC-midnight epoch so day math is TZ-stable. */
function toUTC(d: string): number {
  const [y, m, day] = parseISO(d);
  return Date.UTC(y, m - 1, day);
}

function fromUTC(ms: number): string {
  const dt = new Date(ms);
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * @param weekStartsOn 0=Sun … 6=Sat (JS convention). MUST match the app's
 * weekly_assessments week_start convention, or POEM/RECAP weeks won't line up.
 */
function startOfWeekISO(d: string, weekStartsOn: number): string {
  const ms = toUTC(d);
  const dow = new Date(ms).getUTCDay(); // 0..6
  const diff = (dow - weekStartsOn + 7) % 7;
  return fromUTC(ms - diff * DAY_MS);
}

function startOfMonthISO(d: string): string {
  const [y, m] = parseISO(d);
  return toISO(y, m, 1);
}

function bucketKey(d: string, g: Granularity, weekStartsOn: number): string {
  if (g === 'day') return d;
  if (g === 'week') return startOfWeekISO(d, weekStartsOn);
  return startOfMonthISO(d);
}

function nextBucketStart(d: string, g: Granularity): string {
  if (g === 'day') return fromUTC(toUTC(d) + DAY_MS);
  if (g === 'week') return fromUTC(toUTC(d) + 7 * DAY_MS);
  const [y, m] = parseISO(d);
  return m === 12 ? toISO(y + 1, 1, 1) : toISO(y, m + 1, 1);
}

/** Every bucket start from `from`..`to` inclusive, in order. */
function enumerateBuckets(
  from: string,
  to: string,
  g: Granularity,
  weekStartsOn: number,
): string[] {
  let cur = bucketKey(from, g, weekStartsOn);
  const end = toUTC(bucketKey(to, g, weekStartsOn));
  const out: string[] = [];
  let guard = 0; // belt-and-braces against a bad range causing an infinite loop
  while (toUTC(cur) <= end && guard < 100_000) {
    out.push(cur);
    cur = nextBucketStart(cur, g);
    guard++;
  }
  return out;
}

function aggregate(values: number[], mode: Aggregate): number {
  if (mode === 'max') return Math.max(...values);
  if (mode === 'min') return Math.min(...values);
  if (mode === 'last') return values[values.length - 1];
  return values.reduce((a, b) => a + b, 0) / values.length; // mean
}

// --- the main builder --------------------------------------------------------

/**
 * Turn sparse entries into a DENSE, ordered array of buckets across [from, to].
 *
 * Every bucket in the range is present. Missing buckets have value:null so a
 * chart can render a hole; they are never filled with 0.
 *
 * @param opts.aggregate how to collapse multiple values in one bucket at coarse
 *   granularity. Default 'max' to match the calendar's "worst site" convention,
 *   so weekly/monthly severity shows the worst day, not an average that hides
 *   flares. Use 'mean' for something like average stress if you prefer.
 */
export function buildBuckets(
  entries: RawEntry[],
  opts: {
    from: string;
    to: string;
    granularity: Granularity;
    weekStartsOn?: number;
    aggregate?: Aggregate;
  },
): Bucket[] {
  const {
    from,
    to,
    granularity,
    weekStartsOn = 1, // Monday default — CHANGE to match the app's week_start
    aggregate: agg = 'max',
  } = opts;

  const valuesByKey = new Map<string, number[]>();
  const loggedKeys = new Set<string>();

  for (const e of entries) {
    const key = bucketKey(e.date, granularity, weekStartsOn);
    loggedKeys.add(key);
    if (e.value !== null && e.value !== undefined && !Number.isNaN(e.value)) {
      const arr = valuesByKey.get(key) ?? [];
      arr.push(e.value);
      valuesByKey.set(key, arr);
    }
  }

  return enumerateBuckets(from, to, granularity, weekStartsOn).map((date) => {
    const vals = valuesByKey.get(date);
    if (vals && vals.length) {
      return { date, value: aggregate(vals, agg), recorded: true, logged: true };
    }
    return { date, value: null, recorded: false, logged: loggedKeys.has(date) };
  });
}

// --- gap-mode adapters -------------------------------------------------------

/**
 * 'break' view: return every bucket, holes intact. Feed to a chart configured to
 * BREAK the line where value === null (true time axis, honest about elapsed time).
 */
export function toBreakSeries(buckets: Bucket[]): Bucket[] {
  return buckets;
}

/**
 * 'omit' view: only buckets with a real value, spaced evenly by index. The
 * x-axis becomes "nth recording", not real elapsed time — label it accordingly.
 */
export function toOmitSeries(buckets: Bucket[]): Bucket[] {
  return buckets.filter((b) => b.value !== null);
}

/** Fraction of buckets that carry a real value, 0..1. */
export function recordedDensity(buckets: Bucket[]): number {
  if (buckets.length === 0) return 0;
  return buckets.filter((b) => b.recorded).length / buckets.length;
}

/**
 * Sparse data reads badly as a broken line — too many holes. Below the threshold,
 * suggest the closed-gap ('omit') view. This is only a suggestion; always let the
 * user override via the gap-mode control. Jason is the profile that trips this.
 */
export function suggestGapMode(buckets: Bucket[], threshold = 0.35): GapMode {
  return recordedDensity(buckets) < threshold ? 'omit' : 'break';
}

// --- example (delete once wired up) ------------------------------------------
// const buckets = buildBuckets(
//   [ { date: '2025-04-01', value: 2 }, { date: '2025-04-03', value: null },
//     { date: '2025-04-20', value: 4 } ],
//   { from: '2025-04-01', to: '2025-04-30', granularity: 'day', aggregate: 'max' },
// );
// April 2 and 4–19 come back as { value: null } => the chart shows holes there,
// NOT zeros. suggestGapMode(buckets) === 'omit' (very sparse month).
