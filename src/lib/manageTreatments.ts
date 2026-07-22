/**
 * The add path + type-to-filter matching for treatments (the `medications`
 * table — schema.ts's own comment already calls it "the treatments a user
 * tracks"; only the Log modal's UI says "treatment"). Mirrors
 * manageTriggers.ts's role as the one place that merges static content
 * (content/treatmentLibrary.ts) with the user's own saved list, but the
 * tiering is different enough from triggers (three distinct, orderable
 * tiers rather than one deduped catalog-∪-user list) that it isn't a
 * drop-in reuse of matchesTriggerSearch.
 *
 * Callers must resolve user_id via useActiveUserId() — never user.uid — and
 * pass it in; these are plain db functions, not hooks.
 */
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  TREATMENT_LIBRARY,
  type CadenceUnit,
  type DeliveryMethod,
  type SeedTreatment,
  type TreatmentType,
  type WindowUnit,
} from '../../content/treatmentLibrary';
import { shiftISODate, todayISO } from './calendarMath';

const uuid = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

const MAX_FUZZY_DISTANCE = 2;
/** Below this many raw (pre-normalize) characters, don't even attempt a fuzzy pass. */
const MIN_QUERY_LENGTH_TO_ATTEMPT_FUZZY = 3;
/** Below this many normalized characters, a fuzzy candidate is never accepted (avoids short strings matching everything). */
const MIN_NORMALIZED_LENGTH_TO_ACCEPT_FUZZY = 4;

/**
 * Lowercase, trim, collapse whitespace, and strip "%" and standalone
 * strength tokens (1, 0.05, 2.5, ...) and punctuation, so "Hydrocortisone",
 * "hydrocortisone 1%", and "hydrocortisone  1 %" all resolve to the same
 * string. Run on both the query and every candidate name/alias before
 * comparing — never compare raw text.
 */
export function normalizeTreatmentQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/%/g, '')
    .replace(/\b\d+(\.\d+)?\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Hand-rolled Levenshtein distance — no dependency for a ~50-entry list. */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    prev = curr;
  }
  return prev[n];
}

export interface SavedTreatmentForMatch {
  id: string;
  name: string;
}

export interface SavedTreatmentMatch {
  kind: 'saved';
  treatmentId: string;
  name: string;
}

export interface LibraryTreatmentMatch {
  kind: 'library';
  entry: SeedTreatment;
  /** Whichever of entry.name/aliases the query actually matched — e.g. "Opzelura" rather
   *  than "Ruxolitinib cream" when that's what the user typed/recognized. This is what gets
   *  displayed AND saved as the treatment's name (see addTreatmentFromLibrary), so a brand
   *  name the user searched under keeps showing up as that brand name later, not the generic. */
  matchedName: string;
}

export type TreatmentMatch = SavedTreatmentMatch | LibraryTreatmentMatch;

/** A fuzzy "Did you mean X?" — only ever produced when tiers 1 and 2 are both empty. */
export interface TreatmentSuggestion {
  kind: 'suggestion';
  match: TreatmentMatch;
}

export type TreatmentSearchResult = TreatmentMatch | TreatmentSuggestion;

function activeLibraryEntries(): SeedTreatment[] {
  return TREATMENT_LIBRARY.filter((e) => !e.retired);
}

/** Which of entry.name/aliases the (normalized) query matches, or null if none do —
 *  entry.name takes priority so an exact generic-name match never loses to an alias. */
function matchingNameForQuery(entry: SeedTreatment, normalizedQuery: string): string | null {
  if (normalizeTreatmentQuery(entry.name).includes(normalizedQuery)) return entry.name;
  return entry.aliases.find((alias) => normalizeTreatmentQuery(alias).includes(normalizedQuery)) ?? null;
}

function fuzzySuggestions(
  normalizedQuery: string,
  saved: SavedTreatmentForMatch[]
): TreatmentSuggestion[] {
  if (normalizedQuery.length < MIN_NORMALIZED_LENGTH_TO_ACCEPT_FUZZY) return [];

  const candidates: { match: TreatmentMatch; distance: number }[] = [];

  for (const treatment of saved) {
    const distance = levenshteinDistance(normalizedQuery, normalizeTreatmentQuery(treatment.name));
    if (distance <= MAX_FUZZY_DISTANCE) {
      candidates.push({
        match: { kind: 'saved', treatmentId: treatment.id, name: treatment.name },
        distance,
      });
    }
  }

  for (const entry of activeLibraryEntries()) {
    const names = [entry.name, ...entry.aliases];
    let bestName = entry.name;
    let bestDistance = Infinity;
    for (const name of names) {
      const distance = levenshteinDistance(normalizedQuery, normalizeTreatmentQuery(name));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestName = name;
      }
    }
    if (bestDistance <= MAX_FUZZY_DISTANCE) {
      candidates.push({ match: { kind: 'library', entry, matchedName: bestName }, distance: bestDistance });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, 2).map((c) => ({ kind: 'suggestion', match: c.match }));
}

/**
 * Tier 1 (the user's own saved treatments — this IS the dedup safeguard;
 * selecting one checks the existing row instead of inserting a new one) then
 * tier 2 (library, by name or alias). If both are empty and the query is
 * long enough, falls back to tier 3 (fuzzy "Did you mean?", checked against
 * saved treatments and the library together). The literal "Add "<query>""
 * action is NOT part of this result — callers always append that themselves
 * as the true last item, unconditionally (suggest, never block).
 */
export function getTreatmentSearchResults(
  query: string,
  saved: SavedTreatmentForMatch[]
): TreatmentSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const normalizedQuery = normalizeTreatmentQuery(trimmed);
  if (!normalizedQuery) return [];

  const savedMatches: SavedTreatmentMatch[] = saved
    .filter((t) => normalizeTreatmentQuery(t.name).includes(normalizedQuery))
    .map((t) => ({ kind: 'saved', treatmentId: t.id, name: t.name }));

  const libraryMatches: LibraryTreatmentMatch[] = activeLibraryEntries()
    .map((entry) => ({ entry, matchedName: matchingNameForQuery(entry, normalizedQuery) }))
    .filter((x): x is { entry: SeedTreatment; matchedName: string } => x.matchedName !== null)
    .map(({ entry, matchedName }) => ({ kind: 'library', entry, matchedName }));

  if (savedMatches.length > 0 || libraryMatches.length > 0) {
    return [...savedMatches, ...libraryMatches];
  }

  if (trimmed.length < MIN_QUERY_LENGTH_TO_ATTEMPT_FUZZY) return [];
  return fuzzySuggestions(normalizedQuery, saved);
}

/**
 * Creates a treatment from a library entry: type, delivery method, and
 * isSteroid come from the library row. Cadence/dosing/rest length are NOT
 * prefilled — those belong to the schedule editor. Plain insert, no
 * revive/dedup at this layer (tier-1 matching in getTreatmentSearchResults
 * is what steers the user to the existing row instead of calling this).
 *
 * `displayName` is whichever of entry.name/aliases the user actually matched
 * on (LibraryTreatmentMatch.matchedName) — stored as the row's name so a
 * brand name searched under (e.g. "Opzelura") keeps showing up as that brand
 * name later, rather than reverting to the generic name once saved.
 */
export async function addTreatmentFromLibrary(
  db: SQLiteDatabase,
  userId: string,
  entry: SeedTreatment,
  displayName: string
): Promise<string> {
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO medications
       (id, user_id, name, category, delivery_method, type, is_steroid, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'other', ?, ?, ?, 1, ?, ?)`,
    [id, userId, displayName, entry.method, entry.type, entry.isSteroid ? 1 : 0, ts, ts]
  );
  return id;
}

/**
 * Creates a treatment from a free-typed name: type, delivery method, and
 * isSteroid are left unset (NULL) — classification wasn't asked for at add
 * time, so the row shows "Add details" later rather than guessing.
 */
export async function addFreeTypedTreatment(
  db: SQLiteDatabase,
  userId: string,
  name: string
): Promise<string> {
  const id = uuid();
  const ts = now();
  await db.runAsync(
    `INSERT INTO medications (id, user_id, name, category, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'other', 1, ?, ?)`,
    [id, userId, name.trim(), ts, ts]
  );
  return id;
}

/** Type/method/schedule for a treatment — everything the details editor can set, minus
 * `isSteroid` (set once from the library at add time; this panel never touches it). */
export interface TreatmentDetails {
  type: TreatmentType | null;
  deliveryMethod: DeliveryMethod | null;
  cadenceEvery: number | null;
  cadenceUnit: CadenceUnit | null;
  isPrn: boolean;
  activeCount: number | null;
  activeUnit: WindowUnit | null;
  restCount: number | null;
  restUnit: WindowUnit | null;
}

/**
 * Writes the details panel's full state to the treatment's master row. Each
 * field change from the editor calls this with the panel's current combined
 * state (not just the one field that changed) — a plain full-row UPDATE, same
 * immediacy as addTreatmentFromLibrary/removeMedication rather than deferred
 * to the modal's Save button, since this edits the master list, not a day.
 */
export async function updateTreatmentDetails(
  db: SQLiteDatabase,
  treatmentId: string,
  details: TreatmentDetails
): Promise<void> {
  await db.runAsync(
    `UPDATE medications
        SET type = ?, delivery_method = ?, cadence_every = ?, cadence_unit = ?, is_prn = ?,
            active_count = ?, active_unit = ?, rest_count = ?, rest_unit = ?, updated_at = ?
      WHERE id = ?`,
    [
      details.type,
      details.deliveryMethod,
      details.cadenceEvery,
      details.cadenceUnit,
      details.isPrn ? 1 : 0,
      details.activeCount,
      details.activeUnit,
      details.restCount,
      details.restUnit,
      now(),
      treatmentId,
    ]
  );
}

/** Stamps today as the start of a rest period — purely descriptive, reflects what the user
 * tapped, never inferred or auto-started. */
export async function startTreatmentRest(db: SQLiteDatabase, treatmentId: string): Promise<void> {
  await db.runAsync(`UPDATE medications SET rest_started_at = ?, updated_at = ? WHERE id = ?`, [
    todayISO(),
    now(),
    treatmentId,
  ]);
}

/** Clears an in-progress rest. Only called by the auto-complete path today — no manual
 * "cancel rest" UI exists yet. */
export async function clearTreatmentRest(db: SQLiteDatabase, treatmentId: string): Promise<void> {
  await db.runAsync(`UPDATE medications SET rest_started_at = NULL, updated_at = ? WHERE id = ?`, [
    now(),
    treatmentId,
  ]);
}

/**
 * Derives a rest period's end date from what's already stored (rest_started_at +
 * rest_count/rest_unit) — nothing persists the end date itself, so editing the cycle length
 * mid-rest can never leave a stale end date behind.
 */
export function getRestEndDate(treatment: {
  restStartedAt: string | null;
  restCount: number | null;
  restUnit: WindowUnit | null;
}): string | null {
  if (!treatment.restStartedAt || !treatment.restCount || !treatment.restUnit) return null;
  const days = treatment.restUnit === 'week' ? treatment.restCount * 7 : treatment.restCount;
  return shiftISODate(treatment.restStartedAt, days);
}
