// toCsv.ts
// -----------------------------------------------------------------------------
// Pure CSV serialization for Prickle's data export. Framework-agnostic, testable.
//
// HONORS THE NULL INVARIANT:
//   null / undefined  -> EMPTY cell (the site/metric was NOT recorded that day)
//   0                 -> "0" (recorded and clear — a real, distinct value)
// A recorded-clear value must arrive here as 0 (or 'Clear' via a formatter),
// NEVER as null. Do not pre-coerce nulls to 0 upstream, or the export loses the
// single most important distinction in the dataset.
//
// Triggers / medications are presence flags: a row in the join table = 1
// (checked that day), absence = 0. Represent them as 0/1, not blank/blank.
//
// Pairs with the existing pivotToWide() selector: pivotToWide gives you the wide,
// one-row-per-day shape; toCsv turns that shape into a downloadable string.
// -----------------------------------------------------------------------------

export interface CsvColumn<Row> {
  /** Property name to read off each row object. */
  key: string;
  /** Human-readable header text for this column. */
  header: string;
  /**
   * Optional cell formatter. Receives the raw value (and the row, for context)
   * and returns the string to write; return '' for a blank cell.
   * If omitted: null/undefined/NaN -> '', everything else -> String(value).
   * Example (site scores as words): (v) => v == null ? '' : v === 0 ? 'Clear' : `${v}`
   */
  format?: (value: unknown, row: Row) => string;
}

function escapeCell(s: string): string {
  // RFC-4180: quote a field if it contains a comma, double-quote, CR or LF, and
  // escape internal double-quotes by doubling them.
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function defaultFormat(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isNaN(value)) return '';
  return String(value);
}

export function toCsv<Row extends Record<string, unknown>>(
  rows: Row[],
  columns: CsvColumn<Row>[],
  opts: { bom?: boolean; eol?: '\n' | '\r\n' } = {},
): string {
  // BOM + CRLF make Excel on Windows open UTF-8 correctly with proper line breaks.
  const { bom = true, eol = '\r\n' } = opts;

  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = row[c.key];
        const str = c.format ? c.format(raw, row) : defaultFormat(raw);
        return escapeCell(str);
      })
      .join(','),
  );

  return (bom ? '\uFEFF' : '') + [header, ...lines].join(eol);
}
