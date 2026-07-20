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
