/**
 * chartSelectors.ts — turning the normalized SQLite data into chart-ready arrays.
 *
 * The pattern: STORE long/normalized (see schema.ts), then SELECT + reshape
 * into exactly what a chart needs. Toggling features = which rows you pull.
 * Changing time scale = the date filter + whether you aggregate.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { todayISO } from './calendarMath';

/** A tidy data point most chart libraries can consume directly. */
export interface SeriesPoint {
  date: string; // 'YYYY-MM-DD' (or week/month bucket)
  series: string; // e.g. site name, or 'stress'
  value: number | null;
}

type Granularity = 'daily' | 'weekly' | 'monthly';

/**
 * Site severity over time. This is your main toggleable, time-scalable chart.
 *
 * @param siteIds  which sites to include -> this IS the on/off toggle. Pass the
 *                 currently-enabled site ids; leave one out and its line vanishes.
 * @param from/to  the visible date window -> this is the time-scale filter.
 * @param granularity  'daily' shows raw scores; 'weekly'/'monthly' average them
 *                 so a year view isn't 365 cramped points.
 */
export async function getSiteSeries(
  db: SQLiteDatabase,
  userId: string,
  siteIds: string[],
  from: string,
  to: string,
  granularity: Granularity = 'daily'
): Promise<SeriesPoint[]> {
  if (siteIds.length === 0) return [];
  const placeholders = siteIds.map(() => '?').join(',');

  // strftime buckets let SQLite do the time-scaling for us.
  const bucket =
    granularity === 'monthly'
      ? "strftime('%Y-%m', d.log_date)"
      : granularity === 'weekly'
      ? "strftime('%Y-W%W', d.log_date)"
      : 'd.log_date';

  const rows = await db.getAllAsync<{ date: string; series: string; value: number }>(
    `SELECT ${bucket} AS date,
            s.name     AS series,
            AVG(ss.score) AS value      -- AVG == raw value when granularity is daily
       FROM site_scores ss
       JOIN daily_logs d ON d.id = ss.log_id
       JOIN sites s      ON s.id = ss.site_id
      WHERE d.user_id = ?
        AND d.log_date BETWEEN ? AND ?
        AND ss.site_id IN (${placeholders})
        AND d.deleted_at IS NULL
        AND ss.deleted_at IS NULL
      GROUP BY date, s.name
      ORDER BY date ASC`,
    [userId, from, to, ...siteIds]
  );
  return rows;
}

/**
 * Stress over the same window — overlay this as a second series on the chart.
 * Same shape as getSiteSeries, so your chart component treats them uniformly.
 */
export async function getStressSeries(
  db: SQLiteDatabase,
  userId: string,
  from: string,
  to: string
): Promise<SeriesPoint[]> {
  const rows = await db.getAllAsync<{ date: string; value: number | null }>(
    `SELECT log_date AS date, stress AS value
       FROM daily_logs
      WHERE user_id = ? AND log_date BETWEEN ? AND ? AND deleted_at IS NULL
      ORDER BY log_date ASC`,
    [userId, from, to]
  );
  return rows.map((r) => ({ date: r.date, series: 'stress', value: r.value }));
}

/**
 * Days a given trigger was contacted in the window — render these as markers/
 * shaded bands behind the severity lines to spot correlations. Same idea works
 * for medications (join log_medications) or an experiment's date range.
 */
export async function getTriggerDays(
  db: SQLiteDatabase,
  userId: string,
  triggerId: string,
  from: string,
  to: string
): Promise<string[]> {
  const rows = await db.getAllAsync<{ log_date: string }>(
    `SELECT d.log_date
       FROM log_triggers lt
       JOIN daily_logs d ON d.id = lt.log_id
      WHERE d.user_id = ?
        AND lt.trigger_id = ?
        AND d.log_date BETWEEN ? AND ?
        AND d.deleted_at IS NULL
        AND lt.deleted_at IS NULL
      ORDER BY d.log_date ASC`,
    [userId, triggerId, from, to]
  );
  return rows.map((r) => r.log_date);
}

/**
 * Worst (MAX) site severity per day over a window — for a calendar/heatmap view.
 *
 * Three distinguishable states in the result:
 *   * key absent      -> no daily_logs row that day (nothing recorded at all)
 *   * value === null  -> a log exists, but no site had a recorded score that
 *                        day (e.g. only stress was logged). Do not count this
 *                        toward any metric — it is not a "0".
 *   * value === 0..5  -> the worst score actually recorded that day.
 */
export async function getMonthWorstSeverity(
  db: SQLiteDatabase,
  userId: string,
  from: string,
  to: string
): Promise<Record<string, number | null>> {
  const rows = await db.getAllAsync<{ date: string; worst: number | null }>(
    `SELECT d.log_date AS date, MAX(ss.score) AS worst
       FROM daily_logs d
       LEFT JOIN site_scores ss ON ss.log_id = d.id AND ss.deleted_at IS NULL
      WHERE d.user_id = ? AND d.log_date BETWEEN ? AND ? AND d.deleted_at IS NULL
      GROUP BY d.log_date
      ORDER BY d.log_date ASC`,
    [userId, from, to]
  );
  return Object.fromEntries(rows.map((r) => [r.date, r.worst]));
}

/**
 * Cheap existence check — a non-deleted daily_logs row for this exact date,
 * without getDayEntry's full sites/triggers/medications/photos joins.
 * Used to decide whether a day still needs its daily reminder (don't nudge
 * someone who's already logged today).
 */
export async function hasLogForDate(db: SQLiteDatabase, userId: string, date: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM daily_logs WHERE user_id = ? AND log_date = ? AND deleted_at IS NULL`,
    [userId, date]
  );
  return row !== null;
}

export interface DayEntrySite {
  id: string;
  name: string;
  /** null = not recorded that day. Never coerced to 0. */
  score: number | null;
}

export interface DayEntryTrigger {
  id: string;
  name: string;
  category: string;
  /** true iff a log_triggers row exists for this day. */
  checked: boolean;
  /** true iff there's a live observation window (an experiments row with
   *  trigger_id = this, deleted_at IS NULL, end_date in the future). */
  watched: boolean;
}

export interface DayEntryMedication {
  id: string;
  name: string;
  category: string;
  /** true iff a log_medications row exists for this day. */
  checked: boolean;
}

export interface DayEntryPhoto {
  id: string;
  siteId: string | null;
  localUri: string;
  cloudUrl: string | null;
  score: number | null;
  takenAt: string;
}

export interface DayEntry {
  date: string;
  /** null if the user hasn't logged this day at all yet. */
  logId: string | null;
  stress: number | null;
  mood: number | null;
  note: string | null;
  /** every active site, in sort order, whether or not it was scored today. */
  sites: DayEntrySite[];
  /** every active trigger, whether or not it was checked today. */
  triggers: DayEntryTrigger[];
  /** every active medication, whether or not it was checked today. */
  medications: DayEntryMedication[];
  photos: DayEntryPhoto[];
}

/**
 * One day's full detail — every active site/trigger/medication the user
 * tracks, joined against that day's log (if any). Powers the Log screen: it
 * returns a complete checklist shape even on a day with no entry yet (scores
 * all null, checked all false), so the form always has something to render.
 */
export async function getDayEntry(
  db: SQLiteDatabase,
  userId: string,
  date: string
): Promise<DayEntry> {
  const log = await db.getFirstAsync<{
    id: string;
    stress: number | null;
    mood: number | null;
    note: string | null;
  }>(
    `SELECT id, stress, mood, note
       FROM daily_logs
      WHERE user_id = ? AND log_date = ? AND deleted_at IS NULL`,
    [userId, date]
  );
  const logId = log?.id ?? null;

  const sites = await db.getAllAsync<DayEntrySite>(
    `SELECT s.id, s.name, ss.score AS score
       FROM sites s
       LEFT JOIN site_scores ss ON ss.site_id = s.id AND ss.log_id = ? AND ss.deleted_at IS NULL
      WHERE s.user_id = ? AND s.is_active = 1 AND s.deleted_at IS NULL
      ORDER BY s.sort_order ASC, s.name ASC`,
    [logId, userId]
  );

  const triggerRows = await db.getAllAsync<{
    id: string;
    name: string;
    category: string;
    checked: number;
    watched: number;
  }>(
    `SELECT t.id, t.name, t.category,
            CASE WHEN lt.id IS NOT NULL THEN 1 ELSE 0 END AS checked,
            CASE WHEN EXISTS (
              SELECT 1 FROM experiments e
               WHERE e.trigger_id = t.id AND e.deleted_at IS NULL AND e.end_date > ?
            ) THEN 1 ELSE 0 END AS watched
       FROM triggers t
       LEFT JOIN log_triggers lt ON lt.trigger_id = t.id AND lt.log_id = ? AND lt.deleted_at IS NULL
      WHERE t.user_id = ? AND t.is_active = 1 AND t.deleted_at IS NULL
      ORDER BY watched DESC, t.name ASC`,
    [todayISO(), logId, userId]
  );

  const medicationRows = await db.getAllAsync<{
    id: string;
    name: string;
    category: string;
    checked: number;
  }>(
    `SELECT m.id, m.name, m.category, CASE WHEN lm.id IS NOT NULL THEN 1 ELSE 0 END AS checked
       FROM medications m
       LEFT JOIN log_medications lm ON lm.medication_id = m.id AND lm.log_id = ? AND lm.deleted_at IS NULL
      WHERE m.user_id = ? AND m.is_active = 1 AND m.deleted_at IS NULL
      ORDER BY m.name ASC`,
    [logId, userId]
  );

  const photoRows = await db.getAllAsync<{
    id: string;
    site_id: string | null;
    local_uri: string;
    cloud_url: string | null;
    score: number | null;
    taken_at: string;
  }>(
    `SELECT id, site_id, local_uri, cloud_url, score, taken_at
       FROM photos
      WHERE log_id = ? AND deleted_at IS NULL
      ORDER BY taken_at ASC`,
    [logId]
  );

  return {
    date,
    logId,
    stress: log?.stress ?? null,
    mood: log?.mood ?? null,
    note: log?.note ?? null,
    sites,
    triggers: triggerRows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      checked: r.checked === 1,
      watched: r.watched === 1,
    })),
    medications: medicationRows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      checked: r.checked === 1,
    })),
    photos: photoRows.map((r) => ({
      id: r.id,
      siteId: r.site_id,
      localUri: r.local_uri,
      cloudUrl: r.cloud_url,
      score: r.score,
      takenAt: r.taken_at,
    })),
  };
}

/**
 * The most recent recorded (non-null) score for a site strictly before a
 * given date — used to default a SeverityInput's starting position to
 * "whatever this site was scored last time," rather than an arbitrary value.
 */
export async function getPreviousSiteScore(
  db: SQLiteDatabase,
  userId: string,
  siteId: string,
  beforeDate: string
): Promise<number | null> {
  const row = await db.getFirstAsync<{ score: number | null }>(
    `SELECT ss.score
       FROM site_scores ss
       JOIN daily_logs d ON d.id = ss.log_id
      WHERE d.user_id = ?
        AND ss.site_id = ?
        AND d.log_date < ?
        AND d.deleted_at IS NULL
        AND ss.deleted_at IS NULL
        AND ss.score IS NOT NULL
      ORDER BY d.log_date DESC
      LIMIT 1`,
    [userId, siteId, beforeDate]
  );
  return row?.score ?? null;
}

/**
 * OPTIONAL: pivot the tidy series into the wide { date, Neck, Elbows, stress }
 * shape — only if a specific chart library wants columns instead of rows.
 * This is also the exact shape your PCP/derm export table wants.
 */
export function pivotToWide(points: SeriesPoint[]): Record<string, unknown>[] {
  const byDate = new Map<string, Record<string, unknown>>();
  for (const p of points) {
    const row = byDate.get(p.date) ?? { date: p.date };
    row[p.series] = p.value;
    byDate.set(p.date, row);
  }
  return Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
}
