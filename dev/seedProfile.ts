/**
 * seedProfile — dev-only seeder that loads one sample profile from
 * scratch/seed-data.json and writes it to the local db via insertDailyLog.
 *
 * scratch/seed-data.json must never ship in a production bundle, so it's
 * loaded with a require() lexically inside an `if (__DEV__)` block — Metro
 * folds __DEV__ to a constant and dead-code-eliminates that branch (and the
 * require it guards) in production builds. Do not hoist this to a top-level
 * import.
 *
 * Idempotent: reference rows (sites/medications/triggers/experiments) are
 * upserted by (user_id, name); daily logs are upserted by insertDailyLog
 * itself (user_id, log_date); weekly assessments are upserted by
 * (user_id, week_start). Re-running for the same profile is safe.
 */
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { insertDailyLog } from '../src/lib/insertDailyLog';

export type ProfileKey = 'elizabeth' | 'georgie' | 'jason';

export interface SeedCounts {
  sites: number;
  medications: number;
  triggers: number;
  experiments: number;
  daily_logs: number;
  site_scores: number;
  weekly_assessments: number;
}

interface SeedMedication {
  name: string;
  category: string;
}

interface SeedLog {
  date: string;
  stress: number | null;
  siteScores: Record<string, number | null>;
  medications: string[];
  triggers: string[];
  /** name of the experiment active that day, if any (e.g. Jason's profile). */
  experiment?: string;
}

interface SeedWeeklyAssessment {
  weekStart: string;
  poem: number | null;
  recap: number | null;
}

interface SeedProfile {
  key: ProfileKey;
  userId: string;
  sites: string[];
  medications: SeedMedication[];
  triggers: string[];
  experiments: string[];
  logs: SeedLog[];
  weeklyAssessments: SeedWeeklyAssessment[];
}

const uuid = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

// Shared find-by-name lookup for the reference tables (sites/medications/
// triggers/experiments), which have no DB-level unique constraint on
// (user_id, name) — uniqueness is enforced here at the application level.
async function findLiveId(
  db: SQLiteDatabase,
  table: 'sites' | 'medications' | 'triggers' | 'experiments',
  userId: string,
  name: string
): Promise<string | null> {
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM ${table} WHERE user_id = ? AND name = ? AND deleted_at IS NULL`,
    [userId, name]
  );
  return row?.id ?? null;
}

async function upsertSite(db: SQLiteDatabase, userId: string, name: string): Promise<string> {
  const existing = await findLiveId(db, 'sites', userId, name);
  if (existing) return existing;
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO sites (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [id, userId, name, ts, ts]
  );
  return id;
}

async function upsertMedication(
  db: SQLiteDatabase,
  userId: string,
  name: string,
  category: string
): Promise<string> {
  const existing = await findLiveId(db, 'medications', userId, name);
  const ts = now();
  if (existing) {
    await db.runAsync(`UPDATE medications SET category = ?, updated_at = ? WHERE id = ?`, [category, ts, existing]);
    return existing;
  }
  const id = uuid();
  await db.runAsync(
    `INSERT INTO medications (id, user_id, name, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, name, category, ts, ts]
  );
  return id;
}

async function upsertTrigger(db: SQLiteDatabase, userId: string, name: string): Promise<string> {
  const existing = await findLiveId(db, 'triggers', userId, name);
  if (existing) return existing;
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO triggers (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [id, userId, name, ts, ts]
  );
  return id;
}

async function upsertExperiment(db: SQLiteDatabase, userId: string, name: string): Promise<string> {
  const existing = await findLiveId(db, 'experiments', userId, name);
  if (existing) return existing;
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO experiments (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [id, userId, name, ts, ts]
  );
  return id;
}

async function upsertWeeklyAssessment(
  db: SQLiteDatabase,
  userId: string,
  weekStart: string,
  poem: number | null,
  recap: number | null
): Promise<void> {
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM weekly_assessments WHERE user_id = ? AND week_start = ? AND deleted_at IS NULL`,
    [userId, weekStart]
  );
  const ts = now();
  if (existing) {
    await db.runAsync(
      `UPDATE weekly_assessments SET poem_score = ?, recap_score = ?, updated_at = ? WHERE id = ?`,
      [poem, recap, ts, existing.id]
    );
    return;
  }
  await db.runAsync(
    `INSERT INTO weekly_assessments (id, user_id, week_start, poem_score, recap_score, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), userId, weekStart, poem, recap, ts, ts]
  );
}

function requireId(map: Map<string, string>, name: string, kind: string, date: string): string {
  const id = map.get(name);
  if (!id) throw new Error(`Unknown ${kind} "${name}" referenced in log ${date}`);
  return id;
}

export async function seedProfile(db: SQLiteDatabase, profileKey: ProfileKey): Promise<SeedCounts> {
  // The require() must be lexically inside this `if (__DEV__)` block, not just
  // guarded by an early-throw above it — Metro's production minifier folds
  // __DEV__ to `false` and dead-code-eliminates an `if (false) {...}` block
  // wholesale (require call included). An early-throw-then-require shape does
  // NOT form that eliminable block, so the JSON would still ship in prod.
  if (__DEV__) {
    const { profiles } = require('../scratch/seed-data.json') as { profiles: SeedProfile[] };
    const profile = profiles.find((p) => p.key === profileKey);
    if (!profile) {
      throw new Error(`No seed profile found for key "${profileKey}"`);
    }

    const counts: SeedCounts = {
      sites: 0,
      medications: 0,
      triggers: 0,
      experiments: 0,
      daily_logs: 0,
      site_scores: 0,
      weekly_assessments: 0,
    };
    const userId = profile.userId;

    const siteIds = new Map<string, string>();
    for (const name of profile.sites) {
      siteIds.set(name, await upsertSite(db, userId, name));
      counts.sites++;
    }

    const medicationIds = new Map<string, string>();
    for (const med of profile.medications) {
      medicationIds.set(med.name, await upsertMedication(db, userId, med.name, med.category));
      counts.medications++;
    }

    const triggerIds = new Map<string, string>();
    for (const name of profile.triggers) {
      triggerIds.set(name, await upsertTrigger(db, userId, name));
      counts.triggers++;
    }

    const experimentIds = new Map<string, string>();
    for (const name of profile.experiments) {
      experimentIds.set(name, await upsertExperiment(db, userId, name));
      counts.experiments++;
    }

    for (const log of profile.logs) {
      const siteScores: Record<string, number | null> = {};
      for (const [siteName, score] of Object.entries(log.siteScores)) {
        siteScores[requireId(siteIds, siteName, 'site', log.date)] = score;
      }
      await insertDailyLog(db, {
        userId,
        date: log.date,
        stress: log.stress,
        siteScores,
        medicationIds: log.medications.map((name) => requireId(medicationIds, name, 'medication', log.date)),
        triggerIds: log.triggers.map((name) => requireId(triggerIds, name, 'trigger', log.date)),
        experimentId: log.experiment ? requireId(experimentIds, log.experiment, 'experiment', log.date) : null,
      });
      counts.daily_logs++;
      counts.site_scores += Object.keys(siteScores).length;
    }

    for (const wa of profile.weeklyAssessments) {
      await upsertWeeklyAssessment(db, userId, wa.weekStart, wa.poem, wa.recap);
      counts.weekly_assessments++;
    }

    console.log(`[seedProfile:${profileKey}]`, counts);
    return counts;
  }

  throw new Error('seedProfile() is dev-only and must not run in production.');
}
