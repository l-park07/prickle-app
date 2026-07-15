/**
 * notificationScheduler — turns NotificationSettings + actual due-ness
 * (a log for today, an assessment due this week) into actually-scheduled
 * local notifications.
 *
 * expo-notifications' repeating DAILY/WEEKLY triggers bake in static content
 * forever (the OS never re-runs JS to refresh it) and can't be conditioned on
 * app state (e.g. "skip today if already logged") — so both reminders are
 * instead a single recomputed one-off `date` trigger, refreshed every time
 * rescheduleNotifications runs: app launch, foreground-resume, settings
 * changes, after saving a log (daily), and after submitting/editing a weekly
 * assessment (weekly). Known limitation: since there's no background refresh
 * (would need expo-task-manager, unreliable under Android Doze — out of
 * scope), a reminder only advances when app JS actually runs; go more than a
 * day or so without opening the app and the next reminder doesn't get queued
 * until it's reopened.
 *
 * Daily: fires at dailyTime, but only if today has no log yet by the time
 * this runs — don't nudge someone who's already done it. Content rotates via
 * getNotification('daily', date), which is why this can't be a single
 * long-lived repeating trigger.
 *
 * Weekly: tracks actual due-ness (see NotificationSettings.weeklyPreferredDay's
 * doc comment in content/getNotification.ts) rather than a fixed weekly
 * clock — once due, fire at the next occurrence of weeklyTime (today or
 * tomorrow) rather than waiting for the preferred day to come back around;
 * once not-yet-due, aim for the preferred day on/after the due date.
 */
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getNotification, NotificationSettings, Weekday } from '../../content/getNotification';
import { hasLogForDate } from './chartSelectors';
import { parseISODate, shiftISODate, toISODate, todayISO } from './calendarMath';
import { getNotificationSettings } from './notificationSettingsStore';
import { getNextAssessmentDate } from './nextAssessments';

const CHANNEL_ID = 'prickle-reminders';

/** Android 13+ needs a channel to exist before the permission prompt appears. No-op on iOS. */
export async function ensureNotificationChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    description: 'Daily log nudges and weekly check-in reminders.',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

/** The next date >= fromISO whose weekday matches, 0-6 days out. */
function nextOccurrenceOfWeekday(fromISO: string, weekday: Weekday): string {
  const offset = (weekday - parseISODate(fromISO).getDay() + 7) % 7;
  return shiftISODate(fromISO, offset);
}

/**
 * Single next fire moment for the weekly reminder. `dueDate` is
 * getNextAssessmentDate's result: null means due now/overdue/never taken,
 * a future ISO date means not yet due.
 */
function computeWeeklyFireDate(
  dueDate: string | null,
  preferredDay: Weekday,
  time: string
): Date {
  const { hour, minute } = parseTime(time);

  if (dueDate === null) {
    // Already due — fire at the next occurrence of `time`, today if it
    // hasn't passed yet, else tomorrow. This naturally lands on the
    // preferred day when it's today/tomorrow, and otherwise fires anyway
    // rather than waiting up to a week for the preferred day to return.
    const fireDate = new Date();
    fireDate.setHours(hour, minute, 0, 0);
    if (fireDate <= new Date()) fireDate.setDate(fireDate.getDate() + 1);
    return fireDate;
  }

  // Not yet due — aim squarely for the preferred day, on or after due-date.
  const fireISO = nextOccurrenceOfWeekday(dueDate, preferredDay);
  const fireDate = parseISODate(fireISO);
  fireDate.setHours(hour, minute, 0, 0);
  return fireDate;
}

async function cancelPriorPrickleNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prickleIds = scheduled
    .filter((n) => n.content.data?.source === 'prickle')
    .map((n) => n.identifier);
  await Promise.all(prickleIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

/** Today at `time` if that hasn't passed yet and today has no log; otherwise tomorrow. */
function nextDailyFireDate(loggedToday: boolean, time: string): Date {
  const { hour, minute } = parseTime(time);
  const todayTarget = new Date();
  todayTarget.setHours(hour, minute, 0, 0);

  if (!loggedToday && todayTarget > new Date()) return todayTarget;

  const tomorrowTarget = new Date(todayTarget);
  tomorrowTarget.setDate(tomorrowTarget.getDate() + 1);
  return tomorrowTarget;
}

async function scheduleDaily(
  db: SQLiteDatabase,
  userId: string,
  settings: NotificationSettings
): Promise<void> {
  const loggedToday = await hasLogForDate(db, userId, todayISO());
  const fireDate = nextDailyFireDate(loggedToday, settings.dailyTime);
  const notification = getNotification('daily', toISODate(fireDate));
  if (!notification) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: { source: 'prickle', kind: 'daily' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: CHANNEL_ID,
    },
  });
}

async function scheduleWeekly(
  db: SQLiteDatabase,
  userId: string,
  settings: NotificationSettings
): Promise<void> {
  const dueDate = await getNextAssessmentDate(db, userId);
  const fireDate = computeWeeklyFireDate(dueDate, settings.weeklyPreferredDay, settings.weeklyTime);
  const notification = getNotification('weekly', toISODate(fireDate));
  if (!notification) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: { source: 'prickle', kind: 'weekly' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: CHANNEL_ID,
    },
  });
}

/**
 * Recomputes and reschedules every Prickle-owned notification from current
 * settings + assessment due-ness. Loads settings itself (rather than taking
 * them as a param) since most call sites — app launch, foreground-resume,
 * post-assessment-submit — have no other reason to have them in scope.
 */
export async function rescheduleNotifications(db: SQLiteDatabase, userId: string): Promise<void> {
  await cancelPriorPrickleNotifications();

  const settings = await getNotificationSettings();
  if (!settings.enabled) return;

  if (settings.dailyEnabled) {
    await scheduleDaily(db, userId, settings);
  }
  if (settings.weeklyEnabled) {
    await scheduleWeekly(db, userId, settings);
  }
}
