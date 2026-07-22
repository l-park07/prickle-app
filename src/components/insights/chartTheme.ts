// chartTheme.ts
// -----------------------------------------------------------------------------
// Token mapping from app/theme.ts into shapes a chart can consume, so every
// chart looks consistent without each one re-deriving colors/type.
//
// Deliberately minimal: react-native-gifted-charts' exact prop names for line
// breaks/axis styling must be checked against the installed version when the
// first real chart is wired (see chartSeries.ts's header note) — this file
// only exposes tokens, not gifted-charts-specific config objects, so nothing
// here is a guess at an API surface that doesn't exist yet.
// -----------------------------------------------------------------------------
import { colors, clearColor, eventAccentPalette, fontFamily, observationBands, severityScale, sitePalette, spacing, typography } from '../../app/theme';

/**
 * Severity line/point colors, keyed 1-5 — a direct re-export of severityScale.
 * `clearColor` (score 0) is exported separately below and must never be added
 * to this map as a "0" key: clear is a distinct recorded state, not a sixth
 * severity step, and folding it in would make it read as one end of a ramp.
 */
export const severityLineColors: Record<1 | 2 | 3 | 4 | 5, string> = severityScale;

/** Score-0 ("clear") marker color — plot separately from the 1-5 severity ramp. */
export const clearLineColor = clearColor;

/**
 * Colors for non-severity overlay series (stress, a trigger's contact days, ...).
 * Reuses the calendar's cool observation-band palette so a comparison line can
 * never be mistaken for a severity value at a glance.
 */
export const compareLineColors: readonly string[] = observationBands;

/** Generic axis/label text style — spread into whichever axis-label prop the chart needs. */
export const axisTextStyle = {
  fontFamily: fontFamily.regular,
  fontSize: typography.caption.fontSize,
  color: colors.textSecondary,
};

/** Gridline / rule color, matching the app's border token. */
export const gridColor = colors.border;

/**
 * Bakes an alpha channel into a '#rrggbb' hex string ('#a9bd7f' + 0.18 -> '#a9bd7f2e').
 * Needed for chart backdrops (e.g. gifted-charts' sectionColors) that are painted as an
 * opaque fill rather than something a View's `opacity` style could tint after the fact.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const alphaHex = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${alphaHex}`;
}

/**
 * Deterministic per-site line color: cycles sitePalette by a site's position in the given list
 * (expected to be sort_order order, e.g. getActiveSites' result) — NOT by which sites currently
 * happen to be toggled on, so a site's color never shifts as other sites are turned on/off.
 * Capped at sitePalette.length (5): react-native-gifted-charts' LineChart only exposes data..data5
 * for multi-line rendering with per-line gap segments, so a site beyond the cap has no slot to put
 * a color on — callers filter their site list down to this map's keys before rendering a legend
 * or a chart line for it.
 */
export function assignSiteColors(sites: { id: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  sites.slice(0, sitePalette.length).forEach((site, index) => {
    map[site.id] = sitePalette[index];
  });
  return map;
}

/**
 * Deterministic per-event-series accent color: cycles eventAccentPalette by a series' position in
 * the given id list. Unlike assignSiteColors, this cycles (% length) rather than truncating —
 * EventLanes rows aren't capped by a gifted-charts data-slot limit, and every row always carries
 * its own visible label (row + legend), so identity past the palette's 2 entries still isn't
 * color-alone the way a site line is.
 */
export function assignEventAccentColors(seriesIds: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  seriesIds.forEach((id, index) => {
    map[id] = eventAccentPalette[index % eventAccentPalette.length];
  });
  return map;
}

// --- Shared react-native-gifted-charts LineChart layout gotchas ------------------------------
// Kept in one place so every chart that self-positions overlays (a gradient fill, hand-drawn
// y-axis ticks, a tooltip) agrees on the same numbers instead of re-deriving them. Originally
// discovered while building ScoreOverTime.tsx (POEM/RECAP) — see that file's history for the
// investigation.

/** gifted-charts-core's getExtendedContainerHeightWithPadding hardcodes `containerHeight +
 * overflowTop + 10` no matter what overflowTop/overflowBottom are set to (confirmed against the
 * installed 1.4.77's utils/index.js). Anything self-positioned inside the chart's own coordinate
 * space has to add this same 10px or it silently sits too high. */
export const PLOT_Y_OFFSET = 10;

/** gifted-charts' own y-axis number gutter — its `totalWidth` layout math excludes this width, so
 * any container-width budget (plotWidth) has to subtract it manually or the chart overflows its
 * card. */
export const Y_AXIS_LABEL_WIDTH = 32;

export const CHART_INITIAL_SPACING = spacing.lg;
export const CHART_END_SPACING = 44; // extra trailing room so the last x-axis label has space to sit in

/** Pixel y (from the top of the chart's own coordinate space) where `value` sits on a
 * `maxValue`/`chartHeight` scale — matches gifted-charts' internal getY(), PLOT_Y_OFFSET included. */
export function plotTop(value: number, maxValue: number, chartHeight: number): number {
  return PLOT_Y_OFFSET + chartHeight - (value / maxValue) * chartHeight;
}
