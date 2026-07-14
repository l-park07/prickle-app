/**
 * Ad hoc column migrations for changes that came after the initial
 * CREATE TABLE. CREATE TABLE/INDEX IF NOT EXISTS in schema.ts is naturally
 * idempotent; ALTER TABLE ADD COLUMN is not (it errors if the column already
 * exists), so each addition needs this existence check first.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

export async function ensureColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
  ddl: string
): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}
