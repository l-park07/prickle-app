/**
 * Prickle — message & fact content
 * =============================================================================
 * THIS IS THE FILE YOU EDIT. Nothing here is logic; it's just content.
 *
 * TO ADD A MESSAGE: append one object to the array. That's it.
 *   { id: 'enc-016', kind: 'encouragement', text: 'Your new line here.' }
 *
 * Rules for adding:
 *   - `id` must be unique and never reused. The daily picker is deterministic,
 *     so a stable id keeps a user's "today's message" from changing on rebuild.
 *   - Keep `text` under ~90 characters. It sits beside the cactus on Home.
 *   - Never delete an id — set `retired: true` instead, so old picks stay valid.
 *
 * VOICE (encouragement):
 *   Warm, plain, validating. Showing up to log is the win — not a low score.
 *   A flare is not a failure and eczema is not something the user did wrong.
 *   Avoid: "good skin / bad skin", "clear up", "cure", "fight", "battle",
 *   streak pressure, or anything implying control they may not have.
 *
 * FACTS — READ BEFORE EDITING:
 *   Prickle is a tracking tool, NOT a medical device. Facts must be
 *   DESCRIPTIVE, never ADVISORY. State what is known; never tell the user
 *   what to do, what to take, or how much. Anything that reads as treatment
 *   guidance belongs with their clinician, not in this file.
 *   Every fact needs a `source` before launch. The ones below are marked
 *   TODO — verify each against a citable clinical source (e.g. NEA, NICE,
 *   AAD, or peer-reviewed literature) and fill it in.
 * =============================================================================
 */

export type MessageKind = 'encouragement' | 'fact';

export interface PrickleMessage {
  /** Stable, never reused. */
  id: string;
  kind: MessageKind;
  text: string;
  /** Required for facts before launch. Omit for encouragement. */
  source?: string;
  /** Set true to stop showing without deleting the id. */
  retired?: boolean;
}

export const MESSAGES: PrickleMessage[] = [
  // ---------------------------------------------------------------- encouragement
  { id: 'enc-001', kind: 'encouragement', text: 'You showed up today. That counts.' },
  { id: 'enc-002', kind: 'encouragement', text: 'Skin changes day to day. Logging it is how the pattern shows up.' },
  { id: 'enc-003', kind: 'encouragement', text: 'Roses are red, cacti are green, and my eczema just loves to make a big scene.' },
  { id: 'enc-004', kind: 'encouragement', text: 'Flake it til you make it.' },
  { id: 'enc-005', kind: 'encouragement', text: 'Adding a picture can capture your skin realness.' },
  { id: 'enc-006', kind: 'encouragement', text: 'Noticing is its own kind of care.' },
  { id: 'enc-007', kind: 'encouragement', text: 'Prickle~ Prickle~' },
  { id: 'enc-008', kind: 'encouragement', text: 'A quiet week is worth logging too.' },
  { id: 'enc-009', kind: 'encouragement', text: 'You know your skin better than any chart does.' },
  { id: 'enc-010', kind: 'encouragement', text: 'Missed a few days? Start again here. No catching up needed.' },
  { id: 'enc-011', kind: 'encouragement', text: 'Moisturise and Survive!' },
  { id: 'enc-012', kind: 'encouragement', text: 'You got this!' },
  { id: 'enc-013', kind: 'encouragement', text: 'Being tired of this is allowed.' },
  { id: 'enc-014', kind: 'encouragement', text: 'Whatever today looks like, you get to just record it.' },
  { id: 'enc-015', kind: 'encouragement', text: 'Slather and lather, moisturize and initialize a new log.' },

  // ------------------------------------------------------------------------ facts
  // Descriptive only. No dosing, no treatment recommendations.
  { id: 'fact-001', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-002', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-003', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-004', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-005', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-006', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-007', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-008', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-009', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-010', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-011', kind: 'fact', text: '*', source: 'TODO' },
  { id: 'fact-012', kind: 'fact', text: '*', source: 'TODO' },
];
