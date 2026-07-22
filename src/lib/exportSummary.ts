/**
 * exportSummary.ts — assembles the "Share summary (PDF)" document's HTML.
 *
 * Pure string-building only: no filesystem, no printing, no sharing (that's
 * ExportSummarySection's job) — this stays framework-agnostic and testable, same split as
 * exportData.ts/toCsv.ts for the CSV export.
 *
 * Chart images arrive pre-captured (data URIs from ExportSummaryCaptureRig's off-screen
 * react-native-view-shot capture of the REAL chart components) — this file never redraws a
 * chart or recomputes a score, only lays out what it's given.
 */
import { parseISODate } from './calendarMath';
import { POEM, RECAP } from '../../content/assessments';
import type { MedicationHistoryRow, WorstSeverityPhoto } from './chartSelectors';
import { colors, radius, spacing, typography } from '../app/theme';
import { formatScheduleSummary } from './treatmentDisplay';

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/** 'YYYY-MM-DD' -> "July 22, 2026" — unlike calendarMath's formatLongDate (no year, meant for
 *  always-near-today UI copy), a shareable document can span any stretch of history, so the year
 *  can't be dropped. */
function formatFullDate(iso: string): string {
  return FULL_DATE_FORMATTER.format(parseISODate(iso));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMedicationLine(row: MedicationHistoryRow): string {
  const schedule = formatScheduleSummary(row);
  const span =
    row.firstUsed === row.lastUsed
      ? `on ${formatFullDate(row.firstUsed)}`
      : `from ${formatFullDate(row.firstUsed)} to ${formatFullDate(row.lastUsed)}`;
  const usage = schedule ? `${schedule}, used ${span}` : `Used ${span}`;
  const added = `Added ${formatFullDate(row.addedAt)}`;
  return `<li><strong>${escapeHtml(row.name)}</strong> — ${escapeHtml(added)} · ${escapeHtml(usage)}</li>`;
}

function medicationHistorySection(rows: MedicationHistoryRow[]): string {
  if (rows.length === 0) return '';
  return `
    <section class="card">
      <h2>Medication history</h2>
      <ul class="med-list">
        ${rows.map(formatMedicationLine).join('\n        ')}
      </ul>
    </section>`;
}

interface ChartSectionInput {
  title: string;
  png: string | null;
  /** e.g. "January 1, 2026 – July 22, 2026" — the ACTUAL period the image shows, which for
   *  POEM/RECAP is their own full-history span, not necessarily the document's chosen range. */
  period: string | null;
  /** Prickle's plain-language one-liner for POEM/RECAP (content/assessments.ts's `subtitle` —
   *  explicitly NOT part of the licensed instrument wording, safe to show as our own copy). */
  description?: string;
  /** The instrument's own copyright line, verbatim — shown right next to ITS chart, not once at
   *  the top of the whole document. */
  copyright?: string;
}

function chartSection({ title, png, period, description, copyright }: ChartSectionInput): string {
  if (!png) return '';
  return `
    <section class="card">
      <h2>${escapeHtml(title)}</h2>
      ${description ? `<p class="caption">${escapeHtml(description)}</p>` : ''}
      ${period ? `<p class="caption">${escapeHtml(period)}</p>` : ''}
      <img class="chart" src="${png}" alt="${escapeHtml(title)}" />
      ${copyright ? `<p class="caption">${escapeHtml(copyright)}</p>` : ''}
    </section>`;
}

function photoTile(photo: WorstSeverityPhoto & { base64: string }): string {
  return `
        <figure>
          <img class="photo" src="data:image/jpeg;base64,${photo.base64}" alt="${escapeHtml(photo.siteName)} photo" />
          <figcaption>${escapeHtml(photo.siteName)} — score ${photo.score}, ${formatFullDate(photo.takenAt.slice(0, 10))}</figcaption>
        </figure>`;
}

function photosSection(photos: (WorstSeverityPhoto & { base64: string })[]): string {
  if (photos.length === 0) return '';
  return `
    <section class="card">
      <h2>Worst day per site</h2>
      <p class="caption">The highest-scored photo on record for each site in this range.</p>
      <div class="photo-grid">
        ${photos.map(photoTile).join('\n        ')}
      </div>
    </section>`;
}

export interface BuildSummaryHtmlInput {
  /** Firebase displayName, or null/empty to omit the name line gracefully. */
  userName: string | null;
  from: string;
  to: string;
  medications: MedicationHistoryRow[];
  /** A captured data-URI PNG, or null if that chart couldn't be captured (section is dropped). */
  severityChartPng: string | null;
  poemChartPng: string | null;
  /** POEM's own actual full-history span (its first/last real entry) — POEM always shows full
   *  history regardless of the document's chosen range, see insights.tsx's convention. Null if
   *  there's no POEM data at all. */
  poemRange: { from: string; to: string } | null;
  recapChartPng: string | null;
  recapRange: { from: string; to: string } | null;
  photos: (WorstSeverityPhoto & { base64: string })[];
}

/** Builds the full standalone HTML document expo-print renders to PDF. Warm/plain-spoken tone
 *  throughout, matching the rest of the app — this is a record of what was logged, not a
 *  diagnosis or a verdict. */
export function buildSummaryHtml(input: BuildSummaryHtmlInput): string {
  const { userName, from, to, medications, severityChartPng, poemChartPng, poemRange, recapChartPng, recapRange, photos } = input;
  const periodLabel = (span: { from: string; to: string } | null) =>
    span ? `${formatFullDate(span.from)} – ${formatFullDate(span.to)}` : null;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  /* Print-friendly by design: plain white throughout (no tinted card fills baked behind the
     chart images) and dark-on-white text everywhere, so the document holds up printed in
     black & white, not just viewed in color on a screen. */
  body {
    font-family: -apple-system, Helvetica, Arial, sans-serif;
    color: ${colors.textPrimary};
    background: ${colors.surface};
    margin: 0;
    padding: ${spacing.md}px ${spacing.lg}px;
  }
  header {
    margin-bottom: ${spacing.md}px;
  }
  h1 {
    font-size: ${typography.h1.fontSize}px;
    color: ${colors.accent};
    margin: 0 0 ${spacing.xs}px 0;
  }
  h2 {
    font-size: ${typography.title.fontSize}px;
    margin: 0 0 ${spacing.sm}px 0;
  }
  p, li {
    font-size: ${typography.body.fontSize}px;
    line-height: 1.4;
  }
  .meta {
    color: ${colors.textSecondary};
    margin: 0;
  }
  .caption {
    font-size: ${typography.caption.fontSize}px;
    color: ${colors.textSecondary};
  }
  .card {
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    border-radius: ${radius.lg}px;
    padding: ${spacing.md}px;
    margin-bottom: ${spacing.md}px;
    break-inside: avoid;
  }
  .card:last-child {
    margin-bottom: 0;
  }
  .chart {
    display: block;
    width: 100%;
    height: auto;
  }
  .med-list {
    margin: 0;
    padding-left: ${spacing.lg}px;
  }
  .photo-grid {
    display: flex;
    flex-wrap: wrap;
    gap: ${spacing.md}px;
  }
  figure {
    margin: 0;
    width: 160px;
  }
  .photo {
    width: 160px;
    height: 160px;
    object-fit: cover;
    border-radius: ${radius.md}px;
    border: 1px solid ${colors.border};
  }
  figcaption {
    font-size: ${typography.caption.fontSize}px;
    color: ${colors.textSecondary};
    margin-top: ${spacing.xs}px;
  }
</style>
</head>
<body>
  <header>
    <h1>Prickle summary</h1>
    ${userName ? `<p class="meta">${escapeHtml(userName)}</p>` : ''}
    <p class="meta">${formatFullDate(from)} – ${formatFullDate(to)}</p>
  </header>

  ${medicationHistorySection(medications)}
  ${chartSection({ title: 'Severity over time', png: severityChartPng, period: periodLabel({ from, to }) })}
  ${chartSection({
    title: 'POEM',
    png: poemChartPng,
    period: periodLabel(poemRange),
    description: POEM.subtitle,
    copyright: POEM.copyright,
  })}
  ${chartSection({
    title: 'RECAP',
    png: recapChartPng,
    period: periodLabel(recapRange),
    description: RECAP.subtitle,
    copyright: RECAP.copyright,
  })}
  ${photosSection(photos)}
</body>
</html>`;
}
