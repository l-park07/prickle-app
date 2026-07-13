/**
 * scoreAssessment.ts — POEM & RECAP scoring. Pure, UI-free, unit-testable.
 *
 * Scoring rules are transcribed from the official POEM "Instructions for use".
 * They are not arbitrary — do not "simplify" them:
 *   - Each question scores 0-4.
 *   - ONE unanswered question counts as 0; total still out of 28.
 *   - TWO OR MORE unanswered -> the questionnaire is NOT scored.
 *   - If two or more options were selected for one question, use the HIGHEST.
 *
 * Bands are always COMPUTED here from the raw score, never stored in the DB.
 * RECAP has no published severity bands in our licensed material, so it returns
 * a raw score and no band. Do not invent bands for it.
 */
import { POEM, RECAP, POEM_BANDS, Instrument } from './assessments';

/**
 * An answer is the set of option-scores the user selected for a question.
 * Normally one value; an array supports the "two or more selected" edge case.
 * `undefined` / missing / empty array all mean "left blank".
 */
export type Answer = number | number[] | undefined | null;

/** Map of question id -> answer. Missing keys are treated as blank. */
export type AnswerMap = Record<string, Answer>;

export interface ScoredResult {
  scored: boolean; // false when the instrument's blank-rule voids the score
  score: number | null; // 0-28, or null when not scored
  band: string | null; // POEM band label, or null (RECAP / not scored)
  answeredCount: number;
  blankCount: number;
}

/** Collapse one answer to a single score, applying "highest wins". Blank -> null. */
function resolveAnswer(answer: Answer): number | null {
  if (answer === undefined || answer === null) return null;
  if (Array.isArray(answer)) {
    if (answer.length === 0) return null;
    return Math.max(...answer); // two or more selected -> highest
  }
  return answer;
}

/** Shared summation honoring the blank rules. Used by both instruments. */
function sumInstrument(instrument: Instrument, answers: AnswerMap) {
  let total = 0;
  let blankCount = 0;

  for (const q of instrument.questions) {
    const resolved = resolveAnswer(answers[q.id]);
    if (resolved === null) {
      blankCount += 1; // counts as 0 toward the total (per POEM rule)
    } else {
      total += resolved;
    }
  }

  const answeredCount = instrument.questions.length - blankCount;
  // Two or more blanks voids the score.
  const voided = blankCount >= 2;

  return { total, blankCount, answeredCount, voided };
}

/** POEM band lookup from the raw score. */
export function poemBand(score: number): string | null {
  const band = POEM_BANDS.find((b) => score >= b.min && score <= b.max);
  return band ? band.label : null;
}

/** Score the POEM questionnaire (0-28) with its band. */
export function scorePoem(answers: AnswerMap): ScoredResult {
  const { total, blankCount, answeredCount, voided } = sumInstrument(POEM, answers);
  if (voided) {
    return { scored: false, score: null, band: null, answeredCount, blankCount };
  }
  return {
    scored: true,
    score: total,
    band: poemBand(total),
    answeredCount,
    blankCount,
  };
}

/**
 * Score the RECAP questionnaire (0-28). No published bands, so band is null.
 * We apply the SAME two-or-more-blank void rule for consistency; RECAP's form
 * asks users to answer every question but allows blanks, and voiding on 2+
 * keeps a half-finished RECAP from being read as a real low score.
 */
export function scoreRecap(answers: AnswerMap): ScoredResult {
  const { total, blankCount, answeredCount, voided } = sumInstrument(RECAP, answers);
  if (voided) {
    return { scored: false, score: null, band: null, answeredCount, blankCount };
  }
  return { scored: true, score: total, band: null, answeredCount, blankCount };
}
