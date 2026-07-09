/**
 * insertDailyLog — the single write path for one day's entry.
 *
 * Fans one day out across daily_logs, site_scores, log_medications, log_triggers
 * inside ONE transaction. Used by both the seed script and (later) the Log screen.
 *
 * CRITICAL null semantics — these drive the whole UI:
 *   * score === null  -> site was NOT recorded that day. Stored as NULL.
 *   * score === 0     -> site WAS recorded and is clear. Stored as 0.
 *   Never coerce null to 0. A missing score and a clear score look different
 *   on the calendar and in Today.
 *   * A day with no entry at all simply has NO daily_logs row (don't call this).
 *
 * Triggers/medications: a row here means "checked that day". No row = unchecked.
 *
 * Place at: db/insertDailyLog.ts
 */
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface DailyLogInput {
  userId: string;
  date: string;                       // 'YYYY-MM-DD'
  stress: number | null;              // 0-5, null = not recorded
  mood?: number | null;
  /** siteId -> score. null score = site not recorded that day. */
  siteScores: Record<string, number | null>;
  /** medication ids checked that day. */
  medicationIds: string[];
  /** trigger ids checked that day. */
  triggerIds: string[];
  experimentId?: string | null;
  note?: string | null;
}

const uuid = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

export async function insertDailyLog(
  db: SQLiteDatabase,
  input: DailyLogInput
): Promise<string> {
  const ts = now();
  let logId = uuid();

  await db.withTransactionAsync(async () => {
    // Idempotent: if a live log already exists for this user+date, reuse and
    // replace its children rather than creating a duplicate.
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM daily_logs
        WHERE user_id = ? AND log_date = ? AND deleted_at IS NULL`,
      [input.userId, input.date]
    );

    if (existing) {
      logId = existing.id;
      await db.runAsync(
        `UPDATE daily_logs
            SET stress = ?, mood = ?, experiment_id = ?, note = ?, updated_at = ?
          WHERE id = ?`,
        [input.stress, input.mood ?? null, input.experimentId ?? null,
         input.note ?? null, ts, logId]
      );
      await db.runAsync(`DELETE FROM site_scores     WHERE log_id = ?`, [logId]);
      await db.runAsync(`DELETE FROM log_medications WHERE log_id = ?`, [logId]);
      await db.runAsync(`DELETE FROM log_triggers    WHERE log_id = ?`, [logId]);
    } else {
      await db.runAsync(
        `INSERT INTO daily_logs
           (id, user_id, log_date, stress, mood, experiment_id, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [logId, input.userId, input.date, input.stress, input.mood ?? null,
         input.experimentId ?? null, input.note ?? null, ts, ts]
      );
    }

    // One row per site per day. `score` may legitimately be NULL.
    for (const [siteId, score] of Object.entries(input.siteScores)) {
      await db.runAsync(
        `INSERT INTO site_scores (id, log_id, site_id, score, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuid(), logId, siteId, score, ts, ts]   // score: number | null, passed through
      );
    }

    // Presence == checked.
    for (const medicationId of input.medicationIds) {
      await db.runAsync(
        `INSERT INTO log_medications (id, log_id, medication_id, created_at)
         VALUES (?, ?, ?, ?)`,
        [uuid(), logId, medicationId, ts]
      );
    }
    for (const triggerId of input.triggerIds) {
      await db.runAsync(
        `INSERT INTO log_triggers (id, log_id, trigger_id, created_at)
         VALUES (?, ?, ?, ?)`,
        [uuid(), logId, triggerId, ts]
      );
    }
  });

  return logId;
}
