/**
 * exportData.ts — shapes the active user's on-device data into a downloadable CSV.
 *
 * Pipeline: chartSelectors (tidy SeriesPoint rows + trigger/medication day lists) -> pivotToWide
 * (wide, one-row-per-day) -> toCsv (RFC-4180 string). Nothing here touches the filesystem or the
 * share sheet — that's ExportDataSection's job — so this stays pure and testable.
 *
 * Trigger/medication presence is folded into the same pivotToWide pass as the numeric site/stress
 * series by encoding each "contacted this day" row as a SeriesPoint with value: 1, keyed under a
 * prefix (trigger:/medication:) so a trigger or medication can never collide with a site name or
 * the 'date'/'stress' keys pivotToWide itself writes.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  getActiveMedications,
  getActiveSites,
  getActiveTriggers,
  getMedicationDays,
  getSiteSeries,
  getStressSeries,
  getTriggerDays,
  pivotToWide,
  type SeriesPoint,
} from './chartSelectors';
import { toCsv, type CsvColumn } from './toCsv';

type WideRow = Record<string, unknown>;

const TRIGGER_PREFIX = 'trigger:';
const MEDICATION_PREFIX = 'medication:';

/** Site score cell: not recorded -> blank, recorded-clear -> 'Clear', else the 1-5 score. Never
 *  coerces the not-recorded case to 0 — see toCsv.ts's null-invariant contract. */
function formatSiteScore(value: unknown): string {
  if (value == null) return '';
  return value === 0 ? 'Clear' : String(value);
}

/** Trigger/medication cell: presence semantics, always 0 or 1, never blank — a day that has no
 *  matching SeriesPoint reads back as undefined here, which is falsy, so it renders '0'. */
function formatPresence(value: unknown): string {
  return value ? '1' : '0';
}

async function presencePoints(
  ids: { id: string; name: string }[],
  prefix: string,
  fetchDays: (id: string) => Promise<string[]>
): Promise<SeriesPoint[]> {
  const perItem = await Promise.all(
    ids.map(async (item) => {
      const days = await fetchDays(item.id);
      return days.map((date): SeriesPoint => ({ date, series: prefix + item.name, value: 1 }));
    })
  );
  return perItem.flat();
}

export interface ExportCsvResult {
  csv: string;
  filename: string;
}

/**
 * Builds the full CSV for one user's window: Date, one column per site, Stress, then one column
 * per active trigger and per active medication, in that stable order.
 */
export async function buildExportCsv(
  db: SQLiteDatabase,
  userId: string,
  from: string,
  to: string
): Promise<ExportCsvResult> {
  const [sites, triggers, medications] = await Promise.all([
    getActiveSites(db, userId),
    getActiveTriggers(db, userId),
    getActiveMedications(db, userId),
  ]);

  const [siteSeries, stressSeries, triggerPoints, medicationPoints] = await Promise.all([
    getSiteSeries(db, userId, sites.map((s) => s.id), from, to),
    getStressSeries(db, userId, from, to),
    presencePoints(triggers, TRIGGER_PREFIX, (id) => getTriggerDays(db, userId, id, from, to)),
    presencePoints(medications, MEDICATION_PREFIX, (id) => getMedicationDays(db, userId, id, from, to)),
  ]);

  const wideRows = pivotToWide([...siteSeries, ...stressSeries, ...triggerPoints, ...medicationPoints]);

  const columns: CsvColumn<WideRow>[] = [
    { key: 'date', header: 'Date' },
    ...sites.map((s): CsvColumn<WideRow> => ({ key: s.name, header: s.name, format: formatSiteScore })),
    { key: 'stress', header: 'Stress' },
    ...triggers.map(
      (t): CsvColumn<WideRow> => ({ key: TRIGGER_PREFIX + t.name, header: t.name, format: formatPresence })
    ),
    ...medications.map(
      (m): CsvColumn<WideRow> => ({ key: MEDICATION_PREFIX + m.name, header: m.name, format: formatPresence })
    ),
  ];

  return {
    csv: toCsv(wideRows, columns),
    filename: `prickle-export-${from}_to_${to}.csv`,
  };
}
