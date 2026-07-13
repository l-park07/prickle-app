import type { SQLiteDatabase } from 'expo-sqlite';
import { shiftISODate, todayISO } from './calendarMath';

/**
 * The next POEM/RECAP due date, or null if one is available right now.
 *
 * `null` covers two cases on purpose: the user has never done one (nothing to
 * wait for), and more than a week has passed since the last one (it's
 * overdue, not "due in the past") — both should read as "Available Now" to
 * the UI, not as a stale or negative date.
 */
export async function getNextAssessmentDate(
  db: SQLiteDatabase,
  userId: string
): Promise<string | null> {
  const last = await db.getFirstAsync<{ week_start: string }>(
    `SELECT week_start FROM weekly_assessments
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY week_start DESC LIMIT 1`,
    [userId]
  );
  if (!last) return null;

  const nextDue = shiftISODate(last.week_start, 7);
  return nextDue <= todayISO() ? null : nextDue;
}

export interface DateAssessment {
  weekStart: string;
  poemScore: number | null;
  recapScore: number | null;
}

/**
 * The assessment (if any) covering the given date — i.e. the week whose
 * 7-day span (week_start .. week_start+6) contains `date`. Powers the Today
 * tab's POEM/RECAP display: shows the score recorded for "that week" when the
 * entry date falls inside it.
 */
export async function getAssessmentForDate(
  db: SQLiteDatabase,
  userId: string,
  date: string
): Promise<DateAssessment | null> {
  const row = await db.getFirstAsync<{
    week_start: string;
    poem_score: number | null;
    recap_score: number | null;
  }>(
    `SELECT week_start, poem_score, recap_score
       FROM weekly_assessments
      WHERE user_id = ?
        AND deleted_at IS NULL
        AND date(?) BETWEEN date(week_start) AND date(week_start, '+6 days')
      ORDER BY week_start DESC LIMIT 1`,
    [userId, date]
  );
  if (!row) return null;
  return { weekStart: row.week_start, poemScore: row.poem_score, recapScore: row.recap_score };
}
