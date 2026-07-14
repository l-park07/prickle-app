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
});
