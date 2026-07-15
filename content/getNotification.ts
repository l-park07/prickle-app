/**
 * getNotification — picks notification copy. You should not need to edit this
 * file to add messages; edit notifications.ts.
 *
 * Deterministic per (kind + date): the same reminder on the same day is always
 * the same message, so a rescheduled or re-fired notification doesn't change
 * text mid-flight. Sequential cycling (not hashing) so a small pool walks the
 * whole set before repeating — same reasoning as getDailyCactus.
 *
 * Place at: content/getNotification.ts
 */
import {
  DAILY_NOTIFICATIONS,
  WEEKLY_NOTIFICATIONS,
  PrickleNotification,
  NotificationKind,
} from './notifications';

function dayNumber(date: string): number {
  const ms = Date.parse(`${date}T00:00:00Z`);
  return Math.floor(ms / 86_400_000);
}

const pool = (kind: NotificationKind): PrickleNotification[] =>
  (kind === 'daily' ? DAILY_NOTIFICATIONS : WEEKLY_NOTIFICATIONS).filter(
    (n) => !n.retired
  );

/**
 * The notification for a given kind + date.
 * @param date 'YYYY-MM-DD' — the day the notification will fire.
 */
export function getNotification(
  kind: NotificationKind,
  date: string
): PrickleNotification | null {
  const list = pool(kind);
  if (list.length === 0) return null;
  const n = dayNumber(date);
  if (Number.isNaN(n)) return list[0];
  // Offset weekly by a prime so daily and weekly on the same day don't
  // land on the same index position in their respective pools.
  const offset = kind === 'weekly' ? 3 : 0;
  const index = (((n + offset) % list.length) + list.length) % list.length;
  return list[index];
}

// ---------------------------------------------------------------------------
// Settings shape — what "Configure notifications" reads and writes.
// Persist locally (not in SQLite; these are device preferences, not health data).
// ---------------------------------------------------------------------------

/** 0 = Sunday ... 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Full weekday names, indexed the same way as Weekday (0 = Sunday). */
export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export interface NotificationSettings {
  /** Master switch. If false, nothing is scheduled regardless of the below. */
  enabled: boolean;

  /** Optional nudge to log the day. */
  dailyEnabled: boolean;
  /** Local time for the daily nudge, 'HH:mm'. */
  dailyTime: string;

  /** Reminder that a POEM/RECAP is due. */
  weeklyEnabled: boolean;
  /**
   * Preferred day for the weekly reminder. This is a PREFERENCE, not a gate:
   * the reminder fires when an assessment is actually due (>= 7 days since the
   * last one), on this day when possible — but if the user is overdue past
   * their preferred day, it fires anyway rather than waiting a whole week.
   */
  weeklyPreferredDay: Weekday;
  /** Local time for the weekly reminder, 'HH:mm'. */
  weeklyTime: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false, // opt-in, never on by default
  dailyEnabled: false,
  dailyTime: '20:00',
  weeklyEnabled: false,
  weeklyPreferredDay: 0, // Sunday
  weeklyTime: '10:00',
};
