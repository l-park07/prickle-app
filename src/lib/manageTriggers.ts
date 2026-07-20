/**
 * The shared trigger data-layer: the ONE add/remove path for the `triggers`
 * table (onboarding, the Log modal, and the Triggers tab all call into this —
 * don't duplicate this logic at a call site) plus the search index selector
 * that merges the static catalog with the user's own list.
 *
 * Known vs watched: this file only ever touches the `triggers` table. It never
 * writes log_triggers (a day's checklist) or experiments (a watch window) —
 * those are separate concerns callers own. See content/triggerCatalog.ts's
 * header comment for the full data-flow explanation.
 *
 * Callers must resolve user_id via useActiveUserId() — never user.uid — and
 * pass it in; these are plain db functions, not hooks.
 */
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { TRIGGER_CATALOG, type TriggerCategoryId } from '../../content/triggerCatalog';
import { shiftISODate, todayISO } from './calendarMath';

const uuid = () => Crypto.randomUUID();
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);

/** A watch window must run at least this long once started. */
export const MIN_OBSERVATION_DAYS = 14;

export type TriggerRowCategory = TriggerCategoryId | 'other';

/** Short display label per category — used as row subtext and in the category picker. */
export const CATEGORY_LABELS: Record<TriggerRowCategory, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  ingesting: 'Diet',
  applying: 'Applying', // catalog's own label is "Cosmetics & irritants" — too long for inline subtext
  touching: 'Contact',
  other: 'Other',
};

export const TRIGGER_CATEGORY_OPTIONS: { id: TriggerRowCategory; label: string }[] = [
  ...TRIGGER_CATALOG.map((c) => ({ id: c.id as TriggerRowCategory, label: CATEGORY_LABELS[c.id] })),
  { id: 'other', label: CATEGORY_LABELS.other },
];

interface TriggerRow {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  watched: number;
}

export interface SearchableTrigger {
  /** Stable list key: the catalog slug, or the user's own trigger row id for customs. */
  key: string;
  label: string;
  category: TriggerRowCategory;
  /** The catalog slug this came from, or null for a custom trigger. */
  slug: string | null;
  /** The user's triggers.id if they've added this one, else null. */
  triggerId: string | null;
  /** True iff the user already has a live triggers row for this. */
  added: boolean;
  /** True iff there's a live observation window (experiments row) for this trigger. */
  watched: boolean;
}

// slug -> examples, built once so search can match against them without a join per call.
const examplesBySlug = new Map<string, string[]>();
for (const category of TRIGGER_CATALOG) {
  for (const trigger of category.triggers) {
    if (trigger.examples?.length) examplesBySlug.set(trigger.id, trigger.examples);
  }
}

/**
 * Catalog ∪ the user's own non-deleted triggers, deduped by slug (a catalog
 * trigger the user already added appears once, with added: true). Custom
 * triggers (slug null) are always included — they're searchable/re-loggable
 * from the Log modal, but callers rendering the educational catalog accordion
 * should read TRIGGER_CATALOG directly, not this list, so customs never leak
 * into it (per content/triggerCatalog.ts's header comment).
 */
export async function getSearchableTriggers(
  db: SQLiteDatabase,
  userId: string
): Promise<SearchableTrigger[]> {
  const rows = await db.getAllAsync<TriggerRow>(
    `SELECT t.id, t.name, t.slug, t.category,
            CASE WHEN EXISTS (
              SELECT 1 FROM experiments e
               WHERE e.trigger_id = t.id AND e.deleted_at IS NULL AND e.end_date > ?
            ) THEN 1 ELSE 0 END AS watched
       FROM triggers t
      WHERE t.user_id = ? AND t.is_active = 1 AND t.deleted_at IS NULL`,
    [todayISO(), userId]
  );
  const bySlug = new Map(rows.filter((r) => r.slug).map((r) => [r.slug as string, r]));
  const claimedSlugs = new Set<string>();
  const result: SearchableTrigger[] = [];

  for (const category of TRIGGER_CATALOG) {
    for (const trigger of category.triggers) {
      if (trigger.retired) continue;
      claimedSlugs.add(trigger.id);
      const row = bySlug.get(trigger.id);
      result.push({
        key: trigger.id,
        label: trigger.label,
        category: category.id,
        slug: trigger.id,
        triggerId: row?.id ?? null,
        added: !!row,
        watched: row?.watched === 1,
      });
    }
  }

  for (const row of rows) {
    if (row.slug && claimedSlugs.has(row.slug)) continue; // already represented via the catalog pass above
    result.push({
      key: row.id,
      label: row.name,
      category: (row.category as TriggerRowCategory) || 'other',
      slug: row.slug,
      triggerId: row.id,
      added: true,
      watched: row.watched === 1,
    });
  }

  return result;
}

/** Case-insensitive substring match on label, and on the catalog entry's examples (if any). */
export function matchesTriggerSearch(item: SearchableTrigger, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (item.label.toLowerCase().includes(q)) return true;
  const examples = item.slug ? examplesBySlug.get(item.slug) : undefined;
  return examples?.some((e) => e.toLowerCase().includes(q)) ?? false;
}

export interface AddKnownTriggerInput {
  /** Catalog slug, or omit/null for a custom trigger. */
  slug?: string | null;
  label: string;
  category: TriggerRowCategory;
}

/**
 * The one path that creates/revives a `triggers` row. Creates ONLY the
 * triggers row — never log_triggers, never experiments. No duplicates: a
 * repeat add of the same slug (or the same case-insensitive custom label +
 * category) returns the existing row, reviving it first if it was soft-deleted.
 */
export async function addKnownTrigger(
  db: SQLiteDatabase,
  userId: string,
  input: AddKnownTriggerInput
): Promise<string> {
  const slug = input.slug ?? null;
  const label = input.label.trim();
  const ts = now();

  const existing = slug
    ? await db.getFirstAsync<{ id: string; deleted_at: string | null }>(
        `SELECT id, deleted_at FROM triggers
          WHERE user_id = ? AND slug = ?
          ORDER BY (deleted_at IS NULL) DESC
          LIMIT 1`,
        [userId, slug]
      )
    : await db.getFirstAsync<{ id: string; deleted_at: string | null }>(
        `SELECT id, deleted_at FROM triggers
          WHERE user_id = ? AND slug IS NULL AND category = ? AND LOWER(name) = LOWER(?)
          ORDER BY (deleted_at IS NULL) DESC
          LIMIT 1`,
        [userId, input.category, label]
      );

  if (existing) {
    if (existing.deleted_at) {
      await db.runAsync(
        `UPDATE triggers SET is_active = 1, deleted_at = NULL, name = ?, category = ?, updated_at = ? WHERE id = ?`,
        [label, input.category, ts, existing.id]
      );
    }
    return existing.id;
  }

  const id = uuid();
  await db.runAsync(
    `INSERT INTO triggers (id, user_id, name, slug, category, is_testing, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
    [id, userId, label, slug, input.category, ts, ts]
  );
  return id;
}

/**
 * Soft-deletes the triggers row. If it has an active watch window (an
 * experiments row with trigger_id = this, deleted_at IS NULL, end_date not
 * yet passed), end that window too by setting end_date to today — the window's
 * history stays, it just stops counting as "watched."
 */
export async function removeKnownTrigger(db: SQLiteDatabase, triggerId: string): Promise<void> {
  const ts = now();
  await db.runAsync(
    `UPDATE triggers SET is_active = 0, deleted_at = ?, updated_at = ? WHERE id = ?`,
    [ts, ts, triggerId]
  );
  const date = today();
  await db.runAsync(
    `UPDATE experiments
        SET end_date = ?, updated_at = ?
      WHERE trigger_id = ?
        AND deleted_at IS NULL
        AND (end_date IS NULL OR end_date >= ?)`,
    [date, ts, triggerId, date]
  );
}

export interface ActiveObservation {
  experimentId: string;
  triggerId: string;
  label: string;
  category: TriggerRowCategory;
  startDate: string;
  endDate: string;
}

/** Active (deleted_at IS NULL, end_date in the future) observation windows, for section A. */
export async function getActiveObservations(
  db: SQLiteDatabase,
  userId: string
): Promise<ActiveObservation[]> {
  return db.getAllAsync<ActiveObservation>(
    `SELECT e.id AS experimentId, e.trigger_id AS triggerId, t.name AS label, t.category AS category,
            e.start_date AS startDate, e.end_date AS endDate
       FROM experiments e
       JOIN triggers t ON t.id = e.trigger_id
      WHERE t.user_id = ? AND e.deleted_at IS NULL AND e.end_date > ?
      ORDER BY e.end_date ASC`,
    [userId, todayISO()]
  );
}

export interface StartObservationInput {
  triggerId: string;
  /** 'YYYY-MM-DD' */
  startDate: string;
  /** Clamped up to MIN_OBSERVATION_DAYS if lower. */
  durationDays: number;
}

/**
 * Starts a watch window. The triggers row must already exist — call
 * addKnownTrigger first (it's idempotent, so this is safe to do unconditionally
 * regardless of whether the trigger was already known). Defensively ends any
 * other active window on the same trigger first, so a trigger never has two
 * overlapping active observations.
 */
export async function startObservation(
  db: SQLiteDatabase,
  userId: string,
  input: StartObservationInput
): Promise<string> {
  const trigger = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM triggers WHERE id = ?`,
    [input.triggerId]
  );
  const ts = now();
  const date = today();
  await db.runAsync(
    `UPDATE experiments
        SET end_date = ?, updated_at = ?
      WHERE trigger_id = ?
        AND deleted_at IS NULL
        AND (end_date IS NULL OR end_date >= ?)`,
    [date, ts, input.triggerId, date]
  );

  const duration = Math.max(input.durationDays, MIN_OBSERVATION_DAYS);
  const endDate = shiftISODate(input.startDate, duration);
  const id = uuid();
  await db.runAsync(
    `INSERT INTO experiments (id, user_id, name, trigger_id, start_date, end_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, `Watching ${trigger?.name ?? 'trigger'}`, input.triggerId, input.startDate, endDate, ts, ts]
  );
  return id;
}

/** Ends a watch window early. The trigger itself is untouched — it stays known. */
export async function endObservation(db: SQLiteDatabase, experimentId: string): Promise<void> {
  const ts = now();
  await db.runAsync(
    `UPDATE experiments SET end_date = ?, updated_at = ? WHERE id = ?`,
    [today(), ts, experimentId]
  );
}

export interface ObservationHistoryItem {
  experimentId: string;
  triggerId: string;
  label: string;
  category: TriggerRowCategory;
  startDate: string;
  endDate: string;
}

/** Ended (end_date <= today) AND reviewed windows, most recent first — the Triggers Watch Archive. */
export async function getObservationHistory(
  db: SQLiteDatabase,
  userId: string
): Promise<ObservationHistoryItem[]> {
  return db.getAllAsync<ObservationHistoryItem>(
    `SELECT e.id AS experimentId, e.trigger_id AS triggerId, t.name AS label, t.category AS category,
            e.start_date AS startDate, e.end_date AS endDate
       FROM experiments e
       JOIN triggers t ON t.id = e.trigger_id
      WHERE t.user_id = ? AND e.deleted_at IS NULL AND e.end_date <= ? AND e.reviewed_at IS NOT NULL
      ORDER BY e.end_date DESC`,
    [userId, todayISO()]
  );
}

/** Ended but not-yet-reviewed windows — drives the end-of-period add/remove + note prompt. */
export async function getPendingReviewObservations(
  db: SQLiteDatabase,
  userId: string
): Promise<ObservationHistoryItem[]> {
  return db.getAllAsync<ObservationHistoryItem>(
    `SELECT e.id AS experimentId, e.trigger_id AS triggerId, t.name AS label, t.category AS category,
            e.start_date AS startDate, e.end_date AS endDate
       FROM experiments e
       JOIN triggers t ON t.id = e.trigger_id
      WHERE t.user_id = ? AND e.deleted_at IS NULL AND e.end_date <= ? AND e.reviewed_at IS NULL
      ORDER BY e.end_date ASC`,
    [userId, todayISO()]
  );
}

export interface CompleteObservationReviewInput {
  experimentId: string;
  triggerId: string;
  /** false removes the trigger from "Your triggers" (via removeKnownTrigger); true leaves it as-is. */
  keepTrigger: boolean;
  /** Optional closing note, saved the same way as a mid-observation note. */
  note?: string;
}

/**
 * Completes the end-of-window prompt: stamps reviewed_at so it stops showing
 * up as pending and moves into the archive, optionally removes the trigger,
 * and optionally saves a closing note.
 */
export async function completeObservationReview(
  db: SQLiteDatabase,
  userId: string,
  input: CompleteObservationReviewInput
): Promise<void> {
  const ts = now();
  await db.runAsync(`UPDATE experiments SET reviewed_at = ?, updated_at = ? WHERE id = ?`, [
    ts,
    ts,
    input.experimentId,
  ]);
  if (!input.keepTrigger) {
    await removeKnownTrigger(db, input.triggerId);
  }
  const note = input.note?.trim();
  if (note) {
    await addObservationNote(db, userId, input.experimentId, note);
  }
}

export interface ObservationNote {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** Notes for one watch window, newest first. */
export async function getObservationNotes(
  db: SQLiteDatabase,
  experimentId: string
): Promise<ObservationNote[]> {
  return db.getAllAsync<ObservationNote>(
    `SELECT id, body, created_at AS createdAt, COALESCE(updated_at, created_at) AS updatedAt
       FROM observation_notes
      WHERE experiment_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [experimentId]
  );
}

/** Adds a date-stamped note to a watch window, mid-observation or from the archive. */
export async function addObservationNote(
  db: SQLiteDatabase,
  userId: string,
  experimentId: string,
  body: string
): Promise<string> {
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO observation_notes (id, user_id, experiment_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, experimentId, body.trim(), ts, ts]
  );
  return id;
}

/** Edits an existing note's text. */
export async function updateObservationNote(db: SQLiteDatabase, noteId: string, body: string): Promise<void> {
  await db.runAsync(`UPDATE observation_notes SET body = ?, updated_at = ? WHERE id = ?`, [
    body.trim(),
    now(),
    noteId,
  ]);
}

/** Soft-deletes a note. */
export async function deleteObservationNote(db: SQLiteDatabase, noteId: string): Promise<void> {
  await db.runAsync(`UPDATE observation_notes SET deleted_at = ? WHERE id = ?`, [now(), noteId]);
}

// --- Local search-index reconciliation ------------------------------------
// Pure helpers so every screen that keeps its own optimistic copy of
// getSearchableTriggers' result (Log modal, onboarding, ...) updates it the
// same way after calling addKnownTrigger/removeKnownTrigger, instead of each
// screen reinventing the merge.

/** After addKnownTrigger creates a row for a previously-unadded result, mark it added. */
export function markSearchableTriggerAdded(
  list: SearchableTrigger[],
  key: string,
  triggerId: string
): SearchableTrigger[] {
  return list.map((r) => (r.key === key ? { ...r, added: true, triggerId } : r));
}

/** A brand-new custom trigger's own search-index entry (slug null, already added, never watched yet). */
export function customSearchableTrigger(
  triggerId: string,
  input: { label: string; category: TriggerRowCategory }
): SearchableTrigger {
  return {
    key: triggerId,
    label: input.label,
    category: input.category,
    slug: null,
    triggerId,
    added: true,
    watched: false,
  };
}

/**
 * After removeKnownTrigger, reflect it in the search index: a catalog
 * trigger falls back to un-added (still searchable); a custom trigger has no
 * catalog entry to fall back to, so it drops out entirely.
 */
export function markSearchableTriggerRemoved(
  list: SearchableTrigger[],
  triggerId: string
): SearchableTrigger[] {
  return list.flatMap((r) => {
    if (r.triggerId !== triggerId) return [r];
    if (r.slug) return [{ ...r, added: false, triggerId: null }];
    return [];
  });
}
