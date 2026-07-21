import { openDatabaseSync } from 'expo-sqlite';
import { ensureColumn } from './dbMigrations';
import { SCHEMA_SQL } from './schema';

export const db = openDatabaseSync('prickle.db');

// Runs once per module load. CREATE TABLE IF NOT EXISTS is idempotent, so
// re-running this on every launch (or Fast Refresh) is safe. Column additions
// after the fact go through ensureColumn since ALTER TABLE isn't idempotent.
export const dbReady = db.execAsync(SCHEMA_SQL).then(async () => {
  await ensureColumn(db, 'medications', 'delivery_method', 'TEXT');
  await ensureColumn(db, 'medications', 'frequency', 'TEXT');
  await ensureColumn(db, 'medications', 'type', 'TEXT'); // 'rx' | 'otc' | 'both' | 'therapy', NULL = unset
  await ensureColumn(db, 'medications', 'is_steroid', 'INTEGER'); // 0/1, NULL = unset (unknown, not "no")
  await ensureColumn(db, 'medications', 'cadence_every', 'INTEGER'); // NULL = not set
  await ensureColumn(db, 'medications', 'cadence_unit', 'TEXT'); // 'day' | 'week' | 'month', NULL = not set
  await ensureColumn(db, 'medications', 'is_prn', 'INTEGER NOT NULL DEFAULT 0'); // "as needed" toggle
  await ensureColumn(db, 'medications', 'active_count', 'INTEGER'); // NULL = no on/off cycle
  await ensureColumn(db, 'medications', 'active_unit', 'TEXT'); // 'day' | 'week', NULL = not set
  await ensureColumn(db, 'medications', 'rest_count', 'INTEGER'); // NULL = no on/off cycle
  await ensureColumn(db, 'medications', 'rest_unit', 'TEXT'); // 'day' | 'week', NULL = not set
  await ensureColumn(db, 'medications', 'rest_started_at', 'TEXT'); // 'YYYY-MM-DD', NULL = not resting
  await ensureColumn(db, 'weekly_assessments', 'answers', 'TEXT');
  await ensureColumn(db, 'triggers', 'slug', 'TEXT');
  await ensureColumn(db, 'triggers', 'category', "TEXT NOT NULL DEFAULT 'other'");
  await ensureColumn(db, 'experiments', 'trigger_id', 'TEXT REFERENCES triggers(id)');
  await ensureColumn(db, 'experiments', 'start_date', 'TEXT');
  await ensureColumn(db, 'experiments', 'end_date', 'TEXT');
  await ensureColumn(db, 'experiments', 'note', 'TEXT');
  await ensureColumn(db, 'experiments', 'reviewed_at', 'TEXT');
  await ensureColumn(db, 'observation_notes', 'updated_at', 'TEXT');
});
