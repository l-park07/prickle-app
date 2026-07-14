import type { SQLiteDatabase } from 'expo-sqlite';
import type { FlowAnswers } from '../hooks/useAssessmentFlow';
import { shiftISODate, todayISO } from './calendarMath';

/**
 * Queries against weekly_assessments: which week is next due, the assessment
 * covering a given date, and the full past history — not just "what's next"
 * despite the file name.
 */

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

export interface WeeklyAssessmentRecord {
  id: string;
  weekStart: string;
  poemScore: number | null;
  recapScore: number | null;
  updatedAt: string; // ISO timestamp — when these scores were last (re)submitted
}

/** All of a user's past weekly assessments, most recent week first. */
export async function getWeeklyAssessmentHistory(
  db: SQLiteDatabase,
  userId: string
): Promise<WeeklyAssessmentRecord[]> {
  const rows = await db.getAllAsync<{
    id: string;
    week_start: string;
    poem_score: number | null;
    recap_score: number | null;
    updated_at: string;
  }>(
    `SELECT id, week_start, poem_score, recap_score, updated_at
       FROM weekly_assessments
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY week_start DESC`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    weekStart: r.week_start,
    poemScore: r.poem_score,
    recapScore: r.recap_score,
    updatedAt: r.updated_at,
  }));
}

export interface CurrentWeekAssessment {
  /** A row already exists for this week (scored or blank-voided). */
  exists: boolean;
  /** Stored per-question answers, or {} if none/no row. */
  answers: FlowAnswers;
}

/**
 * Whether this week already has an assessment, and its stored answers if so —
 * powers the assessment modal's edit-vs-fresh decision and pre-fill.
 */
export async function getCurrentWeekAssessment(
  db: SQLiteDatabase,
  userId: string,
  weekStart: string
): Promise<CurrentWeekAssessment> {
  const row = await db.getFirstAsync<{ answers: string | null }>(
    `SELECT answers FROM weekly_assessments
      WHERE user_id = ? AND week_start = ? AND deleted_at IS NULL`,
    [userId, weekStart]
  );
  if (!row) return { exists: false, answers: {} };
  return { exists: true, answers: row.answers ? JSON.parse(row.answers) : {} };
}
