/**
 * managePhotos — DB layer for the photos table. Mirrors manageTrackedItems.ts's
 * conventions (uuid/timestamp helpers, plain runAsync calls).
 *
 * Photos are write-once at capture (score is a permanent snapshot, never
 * recomputed) and removed only via explicit soft-delete here — see the
 * warning in insertDailyLog.ts about never folding photos into its
 * delete-and-reinsert sweep.
 */
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { deletePhotoFile } from './photoCapture';

const uuid = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

export interface AddPhotoInput {
  userId: string;
  logId: string;
  /** null = untagged, day-level photo. */
  siteId: string | null;
  localUri: string;
  /** Snapshot of the tagged site's score at capture time, or null if unscored/untagged. */
  score: number | null;
  takenAt: string;
}

export async function addPhoto(db: SQLiteDatabase, input: AddPhotoInput): Promise<string> {
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO photos (id, user_id, log_id, site_id, local_uri, score, taken_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.userId, input.logId, input.siteId, input.localUri, input.score, input.takenAt, ts, ts]
  );
  return id;
}

export async function removePhoto(db: SQLiteDatabase, photoId: string): Promise<void> {
  const row = await db.getFirstAsync<{ local_uri: string }>(
    `SELECT local_uri FROM photos WHERE id = ?`,
    [photoId]
  );

  const ts = now();
  await db.runAsync(
    `UPDATE photos SET deleted_at = ?, updated_at = ? WHERE id = ?`,
    [ts, ts, photoId]
  );

  if (row) {
    try {
      deletePhotoFile(row.local_uri);
    } catch {
      // Best-effort: a filesystem hiccup must never leave the row un-soft-deleted.
    }
  }
}
