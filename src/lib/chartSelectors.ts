/**
 * chartSelectors.ts — turning the normalized SQLite data into chart-ready arrays.
 *
 * The pattern: STORE long/normalized (see schema.ts), then SELECT + reshape
 * into exactly what a chart needs. Toggling features = which rows you pull.
 * Changing time scale = the date filter + whether you aggregate.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import type { CadenceUnit, DeliveryMethod, TreatmentType, WindowUnit } from '../../content/treatmentLibrary';
import { todayISO, type ObservationWindow } from './calendarMath';

/** A tidy data point most chart libraries can consume directly. */
export interface SeriesPoint {
  date: string; // 'YYYY-MM-DD' (or week/month bucket)
  series: string; // e.g. site name, or 'stress'
  value: number | null;
}

/**
 * Site severity over time, one row per (site, logged day) — raw daily rows, never pre-bucketed.
 * Time-scale aggregation (daily/weekly/monthly) is the CALLER's job via chartSeries.ts's
 * buildBuckets, not this query's: that lets a caller choose 'max' (the calendar's "worst site"
 * convention, so a flare doesn't get averaged away over a week view) instead of this always
 * silently averaging.
 *
 * @param siteIds  which sites to include -> this IS the on/off toggle. Pass the
 *                 currently-enabled site ids; leave one out and its line vanishes.
 * @param from/to  the visible date window.
 *
 * LEFT JOINs site_scores (not an inner join) so a day the user logged but didn't score THIS site
 * still comes back as a real row with value: null — distinct from a day with no daily_logs row at
 * all, which simply doesn't appear in the result. That distinction is what lets a chart tell "no
 * check-in" apart from "logged, not scored" (see chartSeries.ts's Bucket.logged) instead of
 * collapsing both into the same gap.
 */
export async function getSiteSeries(
  db: SQLiteDatabase,
  userId: string,
  siteIds: string[],
  from: string,
  to: string
): Promise<SeriesPoint[]> {
  if (siteIds.length === 0) return [];
  const placeholders = siteIds.map(() => '?').join(',');

  const rows = await db.getAllAsync<{ date: string; series: string; value: number | null }>(
    `SELECT d.log_date AS date,
            s.name     AS series,
            ss.score   AS value
       FROM daily_logs d
       JOIN sites s ON s.user_id = d.user_id AND s.deleted_at IS NULL AND s.id IN (${placeholders})
       LEFT JOIN site_scores ss ON ss.log_id = d.id AND ss.site_id = s.id AND ss.deleted_at IS NULL
      WHERE d.user_id = ?
        AND d.log_date BETWEEN ? AND ?
        AND d.deleted_at IS NULL
      ORDER BY d.log_date ASC, s.name ASC`,
    [...siteIds, userId, from, to]
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
 * Every currently-active site, id + name only, no score join — for chart
 * controls (e.g. the Insights site-toggle list) rather than a specific day.
 */
export async function getActiveSites(
  db: SQLiteDatabase,
  userId: string
): Promise<{ id: string; name: string }[]> {
  return db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name
       FROM sites
      WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL
      ORDER BY sort_order ASC, name ASC`,
    [userId]
  );
}

/**
 * Every currently-active trigger, id + name only — for the comparison chart's trigger chip
 * switcher. Deliberately not manageTriggers.ts's getSearchableTriggers: that one merges in the
 * whole catalog (for the Log modal's add-a-trigger search); this is just the user's own active
 * rows, same shape/role as getActiveSites.
 */
export async function getActiveTriggers(
  db: SQLiteDatabase,
  userId: string
): Promise<{ id: string; name: string }[]> {
  return db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name
       FROM triggers
      WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL
      ORDER BY name ASC`,
    [userId]
  );
}

/**
 * Every currently-active medication, id + name only — for the comparison chart's medication
 * chip switcher, same role as getActiveSites plays for the severity chart's site toggle.
 * Ordered by name: unlike sites, medications has no sort_order column.
 */
export async function getActiveMedications(
  db: SQLiteDatabase,
  userId: string
): Promise<{ id: string; name: string }[]> {
  return db.getAllAsync<{ id: string; name: string }>(
    `SELECT id, name
       FROM medications
      WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL
      ORDER BY name ASC`,
    [userId]
  );
}

/**
 * Weekly POEM totals, most-recent last (chart order). A week with no row (never
 * taken) and a week with a null score (2+ blanks, voided per scoreAssessment.ts)
 * both simply don't appear — same "absence = no entry" convention as every other
 * selector here. Band is NOT computed here — call poemBand() from
 * content/scoreAssessment.ts at the point of use, same as AssessmentHistoryRow
 * does.
 *
 * `from`/`to` are optional: omit both for the chart's actual full history (the
 * earliest/latest real rows), rather than filtering against a guessed-wide date
 * constant — there's no bound that's truly guaranteed to cover "all of it."
 */
export async function getPoemSeries(
  db: SQLiteDatabase,
  userId: string,
  from?: string,
  to?: string
): Promise<{ weekStart: string; score: number }[]> {
  const range = from && to ? 'AND week_start BETWEEN ? AND ?' : '';
  const params = from && to ? [userId, from, to] : [userId];
  const rows = await db.getAllAsync<{ week_start: string; poem_score: number }>(
    `SELECT week_start, poem_score
       FROM weekly_assessments
      WHERE user_id = ?
        ${range}
        AND deleted_at IS NULL
        AND poem_score IS NOT NULL
      ORDER BY week_start ASC`,
    params
  );
  return rows.map((r) => ({ weekStart: r.week_start, score: r.poem_score }));
}

/** Weekly RECAP totals — same shape/gap contract and optional-range convention as getPoemSeries above, see its comment. */
export async function getRecapSeries(
  db: SQLiteDatabase,
  userId: string,
  from?: string,
  to?: string
): Promise<{ weekStart: string; score: number }[]> {
  const range = from && to ? 'AND week_start BETWEEN ? AND ?' : '';
  const params = from && to ? [userId, from, to] : [userId];
  const rows = await db.getAllAsync<{ week_start: string; recap_score: number }>(
    `SELECT week_start, recap_score
       FROM weekly_assessments
      WHERE user_id = ?
        ${range}
        AND deleted_at IS NULL
        AND recap_score IS NOT NULL
      ORDER BY week_start ASC`,
    params
  );
  return rows.map((r) => ({ weekStart: r.week_start, score: r.recap_score }));
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
 * Days a given medication was taken in the window — same rug/marker-row role as getTriggerDays,
 * just joined through log_medications/medications instead of log_triggers/triggers. Medication
 * use is binary per day (a log_medications row = taken that day), never a 0-5 severity value.
 */
export async function getMedicationDays(
  db: SQLiteDatabase,
  userId: string,
  medicationId: string,
  from: string,
  to: string
): Promise<string[]> {
  const rows = await db.getAllAsync<{ log_date: string }>(
    `SELECT d.log_date
       FROM log_medications lm
       JOIN daily_logs d ON d.id = lm.log_id
      WHERE d.user_id = ?
        AND lm.medication_id = ?
        AND d.log_date BETWEEN ? AND ?
        AND d.deleted_at IS NULL
        AND lm.deleted_at IS NULL
      ORDER BY d.log_date ASC`,
    [userId, medicationId, from, to]
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
 * Active trigger-observation windows (experiments rows with a trigger_id/
 * start_date/end_date) overlapping a date range — for the calendar's
 * observation bands. A window covers a date regardless of whether that date
 * has a daily_logs row.
 */
export async function getMonthObservations(
  db: SQLiteDatabase,
  userId: string,
  from: string,
  to: string
): Promise<ObservationWindow[]> {
  const rows = await db.getAllAsync<{ id: string; label: string; start_date: string; end_date: string }>(
    `SELECT e.id AS id, t.name AS label, e.start_date AS start_date, e.end_date AS end_date
       FROM experiments e
       JOIN triggers t ON t.id = e.trigger_id
      WHERE e.user_id = ?
        AND e.deleted_at IS NULL
        AND e.trigger_id IS NOT NULL
        AND e.start_date IS NOT NULL AND e.end_date IS NOT NULL
        AND e.start_date <= ? AND e.end_date >= ?
      ORDER BY e.start_date ASC, e.id ASC`,
    [userId, to, from]
  );
  return rows.map((r) => ({ id: r.id, label: r.label, startDate: r.start_date, endDate: r.end_date }));
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
  /** The live observation window's start/end date, present iff watched is true. */
  observationStart: string | null;
  observationEnd: string | null;
  /** The live observation window's experiments.id, present iff watched is true. */
  experimentId: string | null;
}

export interface DayEntryMedication {
  id: string;
  name: string;
  category: string;
  /** true iff a log_medications row exists for this day. */
  checked: boolean;
  type: TreatmentType | null;
  deliveryMethod: DeliveryMethod | null;
  /** null = unknown (never set, e.g. a free-typed add) — distinct from "known false". */
  isSteroid: boolean | null;
  cadenceEvery: number | null;
  cadenceUnit: CadenceUnit | null;
  isPrn: boolean;
  /** Optional on/off cycle — both null unless the user has set one. */
  activeCount: number | null;
  activeUnit: WindowUnit | null;
  restCount: number | null;
  restUnit: WindowUnit | null;
  /** 'YYYY-MM-DD' the user tapped "Start rest," or null if not currently resting. */
  restStartedAt: string | null;
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
 * Every currently-active site/trigger/medication, LEFT JOINed against a
 * specific log_id — the shared shape behind both getDayEntry (logId = that
 * exact day's log, or null) and getPreviousDayEntry (logId = the most recent
 * prior day's log). Because the WHERE clauses always filter on *currently*
 * active items regardless of which logId is passed in, an item deactivated
 * since that log simply never appears, and one added since just comes back
 * with no join match (score null / checked false) — no special-casing needed.
 */
async function getDayEntryItems(
  db: SQLiteDatabase,
  userId: string,
  logId: string | null
): Promise<{
  sites: DayEntrySite[];
  triggers: DayEntryTrigger[];
  medications: DayEntryMedication[];
}> {
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
    observation_start: string | null;
    observation_end: string | null;
    experiment_id: string | null;
  }>(
    `SELECT t.id, t.name, t.category,
            CASE WHEN lt.id IS NOT NULL THEN 1 ELSE 0 END AS checked,
            CASE WHEN EXISTS (
              SELECT 1 FROM experiments e
               WHERE e.trigger_id = t.id AND e.deleted_at IS NULL AND e.end_date > ?
            ) THEN 1 ELSE 0 END AS watched,
            (SELECT e.start_date FROM experiments e
              WHERE e.trigger_id = t.id AND e.deleted_at IS NULL AND e.end_date > ?
              ORDER BY e.start_date DESC LIMIT 1) AS observation_start,
            (SELECT e.end_date FROM experiments e
              WHERE e.trigger_id = t.id AND e.deleted_at IS NULL AND e.end_date > ?
              ORDER BY e.start_date DESC LIMIT 1) AS observation_end,
            (SELECT e.id FROM experiments e
              WHERE e.trigger_id = t.id AND e.deleted_at IS NULL AND e.end_date > ?
              ORDER BY e.start_date DESC LIMIT 1) AS experiment_id
       FROM triggers t
       LEFT JOIN log_triggers lt ON lt.trigger_id = t.id AND lt.log_id = ? AND lt.deleted_at IS NULL
      WHERE t.user_id = ? AND t.is_active = 1 AND t.deleted_at IS NULL
      ORDER BY watched DESC, t.name ASC`,
    [todayISO(), todayISO(), todayISO(), todayISO(), logId, userId]
  );

  const medicationRows = await db.getAllAsync<{
    id: string;
    name: string;
    category: string;
    checked: number;
    type: TreatmentType | null;
    delivery_method: DeliveryMethod | null;
    is_steroid: number | null;
    cadence_every: number | null;
    cadence_unit: CadenceUnit | null;
    is_prn: number;
    active_count: number | null;
    active_unit: WindowUnit | null;
    rest_count: number | null;
    rest_unit: WindowUnit | null;
    rest_started_at: string | null;
  }>(
    `SELECT m.id, m.name, m.category, CASE WHEN lm.id IS NOT NULL THEN 1 ELSE 0 END AS checked,
            m.type, m.delivery_method, m.is_steroid,
            m.cadence_every, m.cadence_unit, m.is_prn,
            m.active_count, m.active_unit, m.rest_count, m.rest_unit, m.rest_started_at
       FROM medications m
       LEFT JOIN log_medications lm ON lm.medication_id = m.id AND lm.log_id = ? AND lm.deleted_at IS NULL
      WHERE m.user_id = ? AND m.is_active = 1 AND m.deleted_at IS NULL
      ORDER BY m.name ASC`,
    [logId, userId]
  );

  return {
    sites,
    triggers: triggerRows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      checked: r.checked === 1,
      watched: r.watched === 1,
      observationStart: r.observation_start,
      observationEnd: r.observation_end,
      experimentId: r.experiment_id,
    })),
    medications: medicationRows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      checked: r.checked === 1,
      type: r.type,
      deliveryMethod: r.delivery_method,
      isSteroid: r.is_steroid === null ? null : r.is_steroid === 1,
      cadenceEvery: r.cadence_every,
      cadenceUnit: r.cadence_unit,
      isPrn: r.is_prn === 1,
      activeCount: r.active_count,
      activeUnit: r.active_unit,
      restCount: r.rest_count,
      restUnit: r.rest_unit,
      restStartedAt: r.rest_started_at,
    })),
  };
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

  const { sites, triggers, medications } = await getDayEntryItems(db, userId, logId);

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
    triggers,
    medications,
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

export interface PreviousDayEntry {
  logDate: string;
  stress: number | null;
  mood: number | null;
  sites: DayEntrySite[];
  triggers: DayEntryTrigger[];
  medications: DayEntryMedication[];
}

/**
 * The most recent previously-logged day strictly before `beforeDate` — used
 * to pre-fill a brand-new day's form (sites/triggers/medications/mood) with
 * "whatever it was last time," mirroring getPreviousSiteScore's "most recent
 * prior log" semantics but for a whole day at once. Returns null if the user
 * has never logged before this date. Never includes photos — a photo from a
 * prior day is never appropriate to carry forward.
 */
export async function getPreviousDayEntry(
  db: SQLiteDatabase,
  userId: string,
  beforeDate: string
): Promise<PreviousDayEntry | null> {
  const log = await db.getFirstAsync<{
    id: string;
    log_date: string;
    stress: number | null;
    mood: number | null;
  }>(
    `SELECT id, log_date, stress, mood
       FROM daily_logs
      WHERE user_id = ? AND log_date < ? AND deleted_at IS NULL
      ORDER BY log_date DESC
      LIMIT 1`,
    [userId, beforeDate]
  );
  if (!log) return null;

  const { sites, triggers, medications } = await getDayEntryItems(db, userId, log.id);

  return {
    logDate: log.log_date,
    stress: log.stress,
    mood: log.mood,
    sites,
    triggers,
    medications,
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
