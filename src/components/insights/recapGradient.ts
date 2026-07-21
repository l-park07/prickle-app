// recapGradient.ts
// -----------------------------------------------------------------------------
// RECAP-specific chart tokens. Unlike POEM, RECAP has no published severity
// bands (content/assessments.ts / scoreAssessment.ts: "RECAP has no published
// bands in our licensed material... do not invent bands for it") — so instead
// of poemBands.ts's discrete tinted sections, this is a continuous backdrop.
// -----------------------------------------------------------------------------
import { clearColor, severityScale } from '../../app/theme';
import { withAlpha } from './chartTheme';
import { evenTicks } from './scoreChartLayout';

// RECAP direction (confirmed from content/assessments.ts, not assumed): every option set scores
// the LOW-symptom / good-control answer as 0 and the HIGH-symptom / poor-control answer as 4
// ('Very good': 0 ... 'Very Bad': 4, 'Completely acceptable': 0 ... 'Not at all acceptable': 4,
// DAY_FREQUENCY 'No days': 0 ... 'Every day': 4). Summed 0-28: LOW score (near 0) = controlled,
// HIGH score (near 28) = uncontrolled — same direction as POEM's "0 = clear, 28 = severe."
//
// [top, bottom] of a vertical LinearGradient (start={x:0,y:0} end={x:0,y:1}): top = 28 =
// uncontrolled gets the deeper tint, bottom = 0 = controlled gets the soft/light tint. Still an
// orientation cue, not a claim about real cutoffs (RECAP has none) — but pushed more saturated
// than a bare hint so it actually reads at a glance.
export const RECAP_GRADIENT_COLORS: [string, string] = [
  withAlpha(severityScale[5], 0.38), // top (28) — uncontrolled
  withAlpha(clearColor, 0.2), // bottom (0) — controlled
];

const SECTION_COUNT = 7; // coarser than POEM's 28: no fine boundary to resolve, and a smooth
// gradient doesn't need 28 discrete rows the way band-matching did.

/** Evenly-spaced y-axis tick values (0,4,8,...,28) for ScoreOverTime's own label overlay — there are no bands to anchor ticks to. */
export function recapYAxisTicks(): number[] {
  return evenTicks(28, 4);
}

export const RECAP_NO_OF_SECTIONS = SECTION_COUNT;
