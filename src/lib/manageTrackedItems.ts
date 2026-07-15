/**
 * Add/soft-delete for the three per-user master lists (sites, triggers,
 * medications) that daily_logs' children reference. These edit the shared
 * list, not just one day's entry — never hard-delete, so history stays intact
 * (see is_active/deleted_at convention in schema.ts).
 */
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

const uuid = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

export async function addSite(
  db: SQLiteDatabase,
  userId: string,
  name: string
): Promise<string> {
  const id = uuid();
  const ts = now();
  const row = await db.getFirstAsync<{ maxOrder: number | null }>(
    `SELECT MAX(sort_order) as maxOrder FROM sites WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  const sortOrder = (row?.maxOrder ?? -1) + 1;
  await db.runAsync(
    `INSERT INTO sites (id, user_id, name, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?, ?)`,
    [id, userId, name, sortOrder, ts, ts]
  );
  return id;
}

export async function removeSite(db: SQLiteDatabase, siteId: string): Promise<void> {
  const ts = now();
  await db.runAsync(
    `UPDATE sites SET is_active = 0, deleted_at = ?, updated_at = ? WHERE id = ?`,
    [ts, ts, siteId]
  );
}

/**
 * Category is a UI-only grouping used to help the user pick a name (see
 * triggerCategories.ts) — the triggers table has no category column, and only
 * the chosen name is persisted here.
 */
export async function addTrigger(
  db: SQLiteDatabase,
  userId: string,
  name: string
): Promise<string> {
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO triggers (id, user_id, name, is_testing, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 0, 1, ?, ?)`,
    [id, userId, name, ts, ts]
  );
  return id;
}

export async function removeTrigger(db: SQLiteDatabase, triggerId: string): Promise<void> {
  const ts = now();
  await db.runAsync(
    `UPDATE triggers SET is_active = 0, deleted_at = ?, updated_at = ? WHERE id = ?`,
    [ts, ts, triggerId]
  );
}

export interface AddMedicationInput {
  name: string;
  deliveryMethod: string;
  frequency: string;
}

/**
 * category defaults to 'other' — this flow collects delivery method and
 * frequency, not the drug-class category the column was originally built for.
 */
export async function addMedication(
  db: SQLiteDatabase,
  userId: string,
  input: AddMedicationInput
): Promise<string> {
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO medications
       (id, user_id, name, category, delivery_method, frequency, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'other', ?, ?, 1, ?, ?)`,
    [id, userId, input.name, input.deliveryMethod, input.frequency, ts, ts]
  );
  return id;
}

export async function removeMedication(db: SQLiteDatabase, medicationId: string): Promise<void> {
  const ts = now();
  await db.runAsync(
    `UPDATE medications SET is_active = 0, deleted_at = ?, updated_at = ? WHERE id = ?`,
    [ts, ts, medicationId]
  );
}

export interface TrackedItemCounts {
  sites: number;
  triggers: number;
  medications: number;
}

/** Live counts of each active master list — for a summary display, not a cache to keep in sync. */
export async function getActiveTrackedItemCounts(
  db: SQLiteDatabase,
  userId: string
): Promise<TrackedItemCounts> {
  const count = async (table: 'sites' | 'triggers' | 'medications') => {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${table} WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL`,
      [userId]
    );
    return row?.count ?? 0;
  };
  const [sites, triggers, medications] = await Promise.all([
    count('sites'),
    count('triggers'),
    count('medications'),
  ]);
  return { sites, triggers, medications };
}
