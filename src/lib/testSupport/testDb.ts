import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_SQL } from '../schema';

/**
 * A real in-memory SQLite database for tests, backed by Node's built-in
 * node:sqlite (no native expo module available under Jest). Runs the actual
 * SCHEMA_SQL so selector tests exercise the real schema, not a hand-rolled
 * stand-in. Only wraps the subset of SQLiteDatabase that chartSelectors.ts
 * calls — cast covers the rest.
 */
export function createTestDb(): SQLiteDatabase {
  const raw = new DatabaseSync(':memory:');
  raw.exec(SCHEMA_SQL);

  const db = {
    execAsync: async (source: string) => {
      raw.exec(source);
    },
    getAllAsync: async (source: string, params: unknown[] = []) => {
      return raw.prepare(source).all(...(params as never[]));
    },
    getFirstAsync: async (source: string, params: unknown[] = []) => {
      return raw.prepare(source).get(...(params as never[])) ?? null;
    },
    runAsync: async (source: string, params: unknown[] = []) => {
      return raw.prepare(source).run(...(params as never[]));
    },
    withTransactionAsync: async (task: () => Promise<void>) => {
      await task();
    },
  };

  return db as unknown as SQLiteDatabase;
}
