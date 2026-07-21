// poemBands.ts
// -----------------------------------------------------------------------------
// POEM-specific chart tokens: the 28 gifted-charts sectionColors (one per POEM
// point, bottom-up) that reproduce POEM_BANDS' irregular boundaries exactly via
// the library's own uniform-section layout math. See scoreChartLayout.ts for
// the metric-agnostic layout math (and evenTicks) this pairs with.
// -----------------------------------------------------------------------------
import { POEM_BANDS } from '../../../content/assessments';
import { severityScale } from '../../app/theme';
import { withAlpha } from './chartTheme';
import { evenTicks } from './scoreChartLayout';

const SECTION_COUNT = 28; // matches maxValue=28 — one uniform section per POEM point, so
// gifted-charts' own sectionColors mechanism can paint the irregular band boundaries exactly.
const SECTION_TINT_ALPHA = 0.32;

let cachedSectionColors: string[] | null = null;

/** 28 background colors (bottom-up, per gifted-charts' sectionColors convention), one per POEM point, tinted from severityScale. */
export function poemSectionColors(): string[] {
  if (cachedSectionColors) return cachedSectionColors;
  const bandTints = POEM_BANDS.map((_, i) => withAlpha(severityScale[(i + 1) as 1 | 2 | 3 | 4 | 5], SECTION_TINT_ALPHA));
  cachedSectionColors = Array.from({ length: SECTION_COUNT }, (_, value) => {
    const bandIndex = POEM_BANDS.findIndex((b) => value >= b.min && value <= b.max);
    return bandTints[bandIndex === -1 ? bandTints.length - 1 : bandIndex];
  });
  return cachedSectionColors;
}

/** Evenly-spaced y-axis tick values (0,4,8,...,28) for ScoreOverTime's own label overlay — NOT the band boundaries (see evenTicks' comment for why). */
export function poemYAxisTicks(): number[] {
  return evenTicks(28, 4);
}
