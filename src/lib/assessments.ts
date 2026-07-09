import type { SQLiteDatabase } from 'expo-sqlite';

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

  const todayISO = toISODate(new Date());
  const nextDue = toISODate(addDays(parseISODate(last.week_start), 7));
  return nextDue <= todayISO ? null : nextDue;
}
