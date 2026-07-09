/**
 * getDailyMessage — picks one message per user per day, deterministically.
 *
 * You should not need to edit this file to add content. Edit `messages.ts`.
 *
 * Deterministic means: the same user on the same date always sees the same
 * message, across re-renders, app restarts, and rebuilds. That's what stops
 * the Home screen flickering to a new line every time React re-renders.
 */
import { MESSAGES, PrickleMessage, MessageKind } from './messages';

/** Small, stable string hash (FNV-1a). Same input -> same number, always. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const active = (kind?: MessageKind): PrickleMessage[] =>
  MESSAGES.filter((m) => !m.retired && (kind ? m.kind === kind : true));

/**
 * The message for a given user + date.
 *
 * @param userId  keeps two users on the same day from seeing the same line
 * @param date    'YYYY-MM-DD'
 * @param kind    omit to draw from both encouragement and facts
 */
export function getDailyMessage(
  userId: string,
  date: string,
  kind?: MessageKind
): PrickleMessage | null {
  const pool = active(kind);
  if (pool.length === 0) return null;
  return pool[hash(`${userId}:${date}`) % pool.length];
}

/**
 * Alternate encouragement and fact by day, so Home doesn't feel like a
 * fortune cookie every morning. Even days lean encouragement, odd days fact.
 */
export function getDailyMessageAlternating(
  userId: string,
  date: string
): PrickleMessage | null {
  const dayNum = parseInt(date.slice(8, 10), 10);
  const kind: MessageKind = dayNum % 2 === 0 ? 'encouragement' : 'fact';
  return getDailyMessage(userId, date, kind) ?? getDailyMessage(userId, date);
}
