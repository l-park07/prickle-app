/**
 * insertWeeklyAssessment — the single write path for one week's POEM/RECAP scores.
 *
 * Mirrors insertDailyLog's idempotent upsert: one live row per user per
 * week_start. Scores are stored raw; a null score means "not scored" (the
 * assessment's blank-answer rule voided it) and must never be coerced to 0.
 */
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface WeeklyAssessmentInput {
  userId: string;
  weekStart: string;              // 'YYYY-MM-DD', Monday of the ISO week
  poemScore: number | null;       // 0-28, or null if not scored
  recapScore: number | null;      // 0-28, or null if not scored
}

const uuid = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

export async function insertWeeklyAssessment(
  db: SQLiteDatabase,
  input: WeeklyAssessmentInput
): Promise<string> {
  const ts = now();
  let id = uuid();

  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM weekly_assessments
        WHERE user_id = ? AND week_start = ? AND deleted_at IS NULL`,
      [input.userId, input.weekStart]
    );

    if (existing) {
      id = existing.id;
      await db.runAsync(
        `UPDATE weekly_assessments
            SET poem_score = ?, recap_score = ?, updated_at = ?
          WHERE id = ?`,
        [input.poemScore, input.recapScore, ts, id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO weekly_assessments
           (id, user_id, week_start, poem_score, recap_score, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, input.userId, input.weekStart, input.poemScore, input.recapScore, ts, ts]
      );
    }
  });

  return id;
}
