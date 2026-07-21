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
import { colors, clearColor, fontFamily, observationBands, severityScale, typography } from '../../app/theme';

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
