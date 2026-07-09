/**
 * chartSelectors.ts — turning the normalized SQLite data into chart-ready arrays.
 *
 * The pattern: STORE long/normalized (see schema.sql), then SELECT + reshape
 * into exactly what a chart needs. Toggling features = which rows you pull.
 * Changing time scale = the date filter + whether you aggregate.
 *
 * Uses the expo-sqlite async API. Assumes: const db = await openDatabaseAsync('prickle.db').
 */
import type { SQLiteDatabase } from 'expo-sqlite';

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
