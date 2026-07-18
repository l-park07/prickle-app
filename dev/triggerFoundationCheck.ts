/**
 * Dev-only proof that the shared trigger foundation (manageTriggers.ts) does
 * what it claims: no duplicate rows on a repeat add, a soft-deleted trigger
 * revives instead of duplicating, and the search index merges catalog + user
 * triggers with correct `added` flags. Run from DebugScreen; not imported by
 * any production screen.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { TRIGGER_CATALOG } from '../content/triggerCatalog';
import { addKnownTrigger, getSearchableTriggers, removeKnownTrigger } from '../src/lib/manageTriggers';

export interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string;
}

export async function runTriggerFoundationCheck(
  db: SQLiteDatabase,
  userId: string
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const check = (name: string, pass: boolean, detail?: string) => results.push({ name, pass, detail });

  const category = TRIGGER_CATALOG[0];
  const catalogTrigger = category.triggers[0]; // will be added
  const otherCatalogTrigger = category.triggers[1]; // left un-added, for the "added: false" check

  try {
    // 1. Adding a catalog slug twice yields one row.
    const firstId = await addKnownTrigger(db, userId, {
      slug: catalogTrigger.id,
      label: catalogTrigger.label,
      category: category.id,
    });
    const secondId = await addKnownTrigger(db, userId, {
      slug: catalogTrigger.id,
      label: catalogTrigger.label,
      category: category.id,
    });
    check('duplicate slug add returns the same row', firstId === secondId, `${firstId} vs ${secondId}`);

    const rowCount = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM triggers WHERE user_id = ? AND slug = ?`,
      [userId, catalogTrigger.id]
    );
    check('exactly one triggers row exists for that slug', rowCount?.c === 1, `count=${rowCount?.c}`);

    // 2. Soft-deleted trigger revives instead of duplicating.
    await removeKnownTrigger(db, firstId);
    const revivedId = await addKnownTrigger(db, userId, {
      slug: catalogTrigger.id,
      label: catalogTrigger.label,
      category: category.id,
    });
    check('soft-deleted trigger revives to the same id', revivedId === firstId, `${revivedId} vs ${firstId}`);

    const rowCountAfterRevive = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM triggers WHERE user_id = ? AND slug = ?`,
      [userId, catalogTrigger.id]
    );
    check('revive did not create a second row', rowCountAfterRevive?.c === 1, `count=${rowCountAfterRevive?.c}`);

    // 3. Custom trigger dedupe (case-insensitive) + revive.
    const customLabel = `Test Custom Trigger ${Date.now()}`;
    const customA = await addKnownTrigger(db, userId, { label: customLabel, category: 'other' });
    const customB = await addKnownTrigger(db, userId, { label: customLabel.toUpperCase(), category: 'other' });
    check('custom trigger dedupes case-insensitively', customA === customB, `${customA} vs ${customB}`);

    // 4. getSearchableTriggers merges catalog ∪ user triggers with correct added flags.
    const searchable = await getSearchableTriggers(db, userId);

    const addedEntry = searchable.find((s) => s.slug === catalogTrigger.id);
    check(
      'added catalog trigger appears once with added=true',
      !!addedEntry && addedEntry.added === true && addedEntry.triggerId === firstId,
      JSON.stringify(addedEntry)
    );
    check(
      'no duplicate entries for the added slug',
      searchable.filter((s) => s.slug === catalogTrigger.id).length === 1
    );

    const unaddedEntry = searchable.find((s) => s.slug === otherCatalogTrigger.id);
    check(
      'un-added catalog trigger appears with added=false, triggerId=null',
      !!unaddedEntry && unaddedEntry.added === false && unaddedEntry.triggerId === null,
      JSON.stringify(unaddedEntry)
    );

    const customEntry = searchable.find((s) => s.triggerId === customA);
    check(
      'custom trigger appears in the search index with slug=null',
      !!customEntry && customEntry.slug === null && customEntry.added === true,
      JSON.stringify(customEntry)
    );

    // cleanup so re-running this check stays idempotent
    await removeKnownTrigger(db, firstId);
    await removeKnownTrigger(db, customA);
  } catch (e) {
    check('check ran without throwing', false, String(e));
  }

  return results;
}
