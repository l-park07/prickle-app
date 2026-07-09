import { openDatabaseSync } from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

export const db = openDatabaseSync('prickle.db');

// Runs once per module load. CREATE TABLE IF NOT EXISTS is idempotent, so
// re-running this on every launch (or Fast Refresh) is safe.
export const dbReady = db.execAsync(SCHEMA_SQL);
