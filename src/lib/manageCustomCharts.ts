/**
 * Data layer for user-created overlay charts on the Insights tab (custom_charts
 * table). Config is stored as JSON — series membership AND each row's
 * enabled/disabled state live in the same array, which is what lets the
 * legend stay curated instead of listing every site/trigger/medication the
 * user has ever tracked.
 *
 * Callers must resolve user_id via useActiveUserId() — never user.uid — and
 * pass it in; these are plain db functions, not hooks.
 */
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

const uuid = () => Crypto.randomUUID();
const now = () => new Date().toISOString();

export type CustomChartSeries =
  | { kind: 'site'; id: string; enabled: boolean }
  | { kind: 'stress' | 'mood'; enabled: boolean }
  | { kind: 'trigger' | 'medication'; id: string; enabled: boolean };

export interface CustomChartConfig {
  series: CustomChartSeries[];
  range: '30d' | '90d' | '6mo' | '1yr' | 'all';
  granularity: 'auto' | 'daily' | 'weekly' | 'monthly';
  showGaps: boolean;
}

export interface CustomChart {
  id: string;
  title: string;
  config: CustomChartConfig;
  sortOrder: number;
  includeInExport: boolean;
}

export const DEFAULT_CUSTOM_CHART_CONFIG: CustomChartConfig = {
  series: [],
  range: '90d',
  granularity: 'auto',
  showGaps: true,
};

const RANGE_VALUES = new Set(['30d', '90d', '6mo', '1yr', 'all']);
const GRANULARITY_VALUES = new Set(['auto', 'daily', 'weekly', 'monthly']);

function isValidSeries(value: unknown): value is CustomChartSeries {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.enabled !== 'boolean') return false;
  if (v.kind === 'stress' || v.kind === 'mood') return true;
  if (v.kind === 'site' || v.kind === 'trigger' || v.kind === 'medication') {
    return typeof v.id === 'string' && v.id.length > 0;
  }
  return false;
}

/**
 * Parses a stored config, falling back to DEFAULT_CUSTOM_CHART_CONFIG on
 * anything unparseable or structurally wrong — a corrupt row must never crash
 * the Insights tab. Does NOT check whether series ids still exist; that's
 * dropDeadSeriesRefs's job, since it needs live data this function doesn't have.
 */
export function parseCustomChartConfig(raw: string | null): CustomChartConfig {
  if (!raw) return DEFAULT_CUSTOM_CHART_CONFIG;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_CUSTOM_CHART_CONFIG;
  }
  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_CUSTOM_CHART_CONFIG;
  const p = parsed as Record<string, unknown>;

  if (!Array.isArray(p.series) || !p.series.every(isValidSeries)) return DEFAULT_CUSTOM_CHART_CONFIG;
  if (typeof p.range !== 'string' || !RANGE_VALUES.has(p.range)) return DEFAULT_CUSTOM_CHART_CONFIG;
  if (typeof p.granularity !== 'string' || !GRANULARITY_VALUES.has(p.granularity)) {
    return DEFAULT_CUSTOM_CHART_CONFIG;
  }
  if (typeof p.showGaps !== 'boolean') return DEFAULT_CUSTOM_CHART_CONFIG;

  return {
    series: p.series as CustomChartSeries[],
    range: p.range as CustomChartConfig['range'],
    granularity: p.granularity as CustomChartConfig['granularity'],
    showGaps: p.showGaps,
  };
}

export interface LiveSeriesIds {
  siteIds: Set<string>;
  triggerIds: Set<string>;
  medicationIds: Set<string>;
}

/**
 * Drops series entries that reference a site/trigger/medication that no
 * longer exists (removed since the chart was configured) — silently, not as
 * an error, per the plan's read contract. stress/mood entries have no id to
 * check and always pass through.
 */
export function dropDeadSeriesRefs(config: CustomChartConfig, liveIds: LiveSeriesIds): CustomChartConfig {
  return {
    ...config,
    series: config.series.filter((s) => {
      switch (s.kind) {
        case 'stress':
        case 'mood':
          return true;
        case 'site':
          return liveIds.siteIds.has(s.id);
        case 'trigger':
          return liveIds.triggerIds.has(s.id);
        case 'medication':
          return liveIds.medicationIds.has(s.id);
      }
    }),
  };
}

interface CustomChartRow {
  id: string;
  title: string;
  config: string;
  sort_order: number;
  include_in_export: number;
}

function fromRow(row: CustomChartRow): CustomChart {
  return {
    id: row.id,
    title: row.title,
    config: parseCustomChartConfig(row.config),
    sortOrder: row.sort_order,
    includeInExport: row.include_in_export === 1,
  };
}

/**
 * A user's custom charts, sort_order ASC, soft-deleted excluded. Each row's
 * config is parsed defensively and has dead series refs dropped against
 * liveIds (fetch via getActiveSites/getActiveTriggers/getActiveMedications in
 * chartSelectors.ts and pass in — no new existence queries here).
 */
export async function listCustomCharts(
  db: SQLiteDatabase,
  userId: string,
  liveIds: LiveSeriesIds
): Promise<CustomChart[]> {
  const rows = await db.getAllAsync<CustomChartRow>(
    `SELECT id, title, config, sort_order, include_in_export
       FROM custom_charts
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY sort_order ASC`,
    [userId]
  );
  return rows.map((row) => {
    const chart = fromRow(row);
    return { ...chart, config: dropDeadSeriesRefs(chart.config, liveIds) };
  });
}

export async function createCustomChart(
  db: SQLiteDatabase,
  userId: string,
  title: string,
  config: CustomChartConfig
): Promise<string> {
  const id = uuid();
  const ts = now();
  const row = await db.getFirstAsync<{ maxOrder: number | null }>(
    `SELECT MAX(sort_order) as maxOrder FROM custom_charts WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  const sortOrder = (row?.maxOrder ?? -1) + 1;
  await db.runAsync(
    `INSERT INTO custom_charts (id, user_id, title, config, sort_order, include_in_export, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, userId, title, JSON.stringify(config), sortOrder, ts, ts]
  );
  return id;
}

export interface UpdateCustomChartPatch {
  title?: string;
  config?: CustomChartConfig;
}

export async function updateCustomChart(
  db: SQLiteDatabase,
  chartId: string,
  patch: UpdateCustomChartPatch
): Promise<void> {
  const sets: string[] = [];
  const params: (string | number)[] = [];
  if (patch.title !== undefined) {
    sets.push('title = ?');
    params.push(patch.title);
  }
  if (patch.config !== undefined) {
    sets.push('config = ?');
    params.push(JSON.stringify(patch.config));
  }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  params.push(now());
  params.push(chartId);
  await db.runAsync(`UPDATE custom_charts SET ${sets.join(', ')} WHERE id = ?`, params);
}

/** Sets sort_order to match array position for each id, in one transaction. */
export async function reorderCustomCharts(
  db: SQLiteDatabase,
  userId: string,
  orderedIds: string[]
): Promise<void> {
  const ts = now();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        `UPDATE custom_charts SET sort_order = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
        [i, ts, orderedIds[i], userId]
      );
    }
  });
}

export async function setIncludeInExport(db: SQLiteDatabase, chartId: string, include: boolean): Promise<void> {
  await db.runAsync(`UPDATE custom_charts SET include_in_export = ?, updated_at = ? WHERE id = ?`, [
    include ? 1 : 0,
    now(),
    chartId,
  ]);
}

export async function softDeleteCustomChart(db: SQLiteDatabase, chartId: string): Promise<void> {
  const ts = now();
  await db.runAsync(`UPDATE custom_charts SET deleted_at = ?, updated_at = ? WHERE id = ?`, [ts, ts, chartId]);
}

/** Undoes softDeleteCustomChart — clears deleted_at so the chart reappears in listCustomCharts,
 *  wherever its sort_order already placed it. */
export async function restoreCustomChart(db: SQLiteDatabase, chartId: string): Promise<void> {
  await db.runAsync(`UPDATE custom_charts SET deleted_at = NULL, updated_at = ? WHERE id = ?`, [now(), chartId]);
}
