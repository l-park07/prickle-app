/**
 * Prickle — notification copy
 * =============================================================================
 * THIS IS THE FILE YOU EDIT. Content only, no logic.
 *
 * TO ADD A NOTIFICATION: append one object to the relevant array.
 *   { id: 'daily-013', title: 'Prickle', body: 'Your new line here.' }
 *
 * Rules:
 *   - `id` is stable and never reused (the picker is deterministic).
 *   - `body` under ~120 chars — notifications truncate on the lock screen.
 *   - Never delete an id; set `retired: true` instead.
 *
 * VOICE — this matters more here than anywhere else in the app.
 * A notification arrives uninvited, on a day we know nothing about. It might
 * land on someone mid-flare, exhausted, at 8pm. So:
 *   - INVITE, never nag. "If you have a minute" not "Don't forget!"
 *   - NO streak pressure, no "you've missed X days", no counting.
 *   - NO guilt, urgency, or implied failure. Skipping is always fine.
 *   - NO medical advice, no implication that logging improves their skin.
 *   - Never claim to know how they are ("Hope your skin is better!").
 *   - Short. This is a lock screen, not a letter.
 *
 * DAILY vs WEEKLY:
 *   daily  -> optional nudge to log the day. Light, low-stakes, forgettable.
 *   weekly -> POEM/RECAP is due. Slightly more substantial; it's a real task
 *             (~5 min) and worth naming as such so it isn't a surprise.
 * =============================================================================
 */

export type NotificationKind = 'daily' | 'weekly';

export interface PrickleNotification {
  id: string;
  /** Bold line on the notification. Keep it plain — usually just 'Prickle'. */
  title: string;
  /** The message body. */
  body: string;
  /** Set true to stop using without deleting the id. */
  retired?: boolean;
}

// ------------------------------------------------------------------- DAILY
// Rotating nudges for the optional daily log reminder.
export const DAILY_NOTIFICATIONS: PrickleNotification[] = [
  { id: 'daily-001', title: 'Prickle', body: 'How was your skin today? A log takes about a minute.' },
  { id: 'daily-002', title: 'Prickle', body: 'Got a minute? Today is waiting to be logged.' },
  { id: 'daily-003', title: 'Prickle', body: 'Quick check-in whenever you are ready.' },
  { id: 'daily-004', title: 'Prickle', body: 'Even a quiet day is worth writing down.' },
  { id: 'daily-005', title: 'Prickle', body: 'Log today if it suits. If not, no worries.' },
  { id: 'daily-006', title: 'Prickle', body: 'A minute now saves guessing later.' },
  { id: 'daily-007', title: 'Prickle', body: 'How are things today? Tap to log.' },
  { id: 'daily-008', title: 'Prickle', body: 'Your cactus is here whenever you want to check in.' },
  { id: 'daily-009', title: 'Prickle', body: 'Today in one minute: sites, triggers, mood.' },
  { id: 'daily-010', title: 'Prickle', body: 'Nothing much to report? That still counts as data.' },
  { id: 'daily-011', title: 'Prickle', body: 'Ready when you are.' },
  { id: 'daily-012', title: 'Prickle', body: 'Log today while it is still fresh.' },
];

// ------------------------------------------------------------------ WEEKLY
// Fires when a POEM/RECAP is actually due (>= 7 days since the last one),
// on the user's preferred day when possible. Names the task honestly.
export const WEEKLY_NOTIFICATIONS: PrickleNotification[] = [
  { id: 'weekly-001', title: 'Weekly check', body: 'Your POEM and RECAP are ready — about 5 minutes when you have them.' },
  { id: 'weekly-002', title: 'Weekly check', body: 'Time for this week’s check-in. 14 short questions.' },
  { id: 'weekly-003', title: 'Weekly check', body: 'A week has gone by. Ready to log how it went?' },
  { id: 'weekly-004', title: 'Weekly check', body: 'Your weekly assessment is due whenever you have five minutes.' },
  { id: 'weekly-005', title: 'Weekly check', body: 'This week’s POEM and RECAP are waiting. No rush.' },
  { id: 'weekly-006', title: 'Weekly check', body: 'Five minutes to capture the week — this is the one your derm will want.' },
  { id: 'weekly-007', title: 'Weekly check', body: 'Weekly check-in time. Any question can be left blank.' },
  { id: 'weekly-008', title: 'Weekly check', body: 'How has the last week been? Tap to answer.' },
];
