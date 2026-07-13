/**
 * Prickle — weekly assessment content (POEM & RECAP)
 * =============================================================================
 * SINGLE SOURCE OF TRUTH for the assessment wording.
 *
 * ⚠️  DO NOT EDIT THE QUESTION OR OPTION TEXT.
 *     POEM and RECAP are validated instruments, © University of Nottingham.
 *     Every `text` and `label` below is transcribed VERBATIM from the official
 *     forms (POEM version date 30JAN2025; RECAP self-report). Paraphrasing,
 *     re-ordering, or "improving" the wording invalidates the instrument and
 *     breaks scoring comparability. If wording must change, it changes HERE and
 *     nowhere else.
 *
 * Licensing: used here under non-commercial permission from the University of
 * Nottingham. The attribution in `copyright` must remain visible to users.
 *
 * Scoring lives in scoreAssessment.ts, not here. This file is data only.
 * =============================================================================
 */

export interface AssessmentOption {
  label: string; // verbatim
  score: number; // 0-4
}

export interface AssessmentQuestion {
  id: string;
  text: string; // verbatim
  options: AssessmentOption[];
}

export interface Instrument {
  id: 'poem' | 'recap';
  title: string;
  subtitle: string;      // Prickle's plain-language one-liner (NOT part of the instrument)
  instructions: string;  // verbatim from the form
  copyright: string;
  questions: AssessmentQuestion[]; // exactly 7
}

// The five frequency options shared by all POEM questions (and several RECAP ones).
const DAY_FREQUENCY: AssessmentOption[] = [
  { label: 'No days', score: 0 },
  { label: '1-2 days', score: 1 },
  { label: '3-4 days', score: 2 },
  { label: '5-6 days', score: 3 },
  { label: 'Every day', score: 4 },
];

// ----------------------------------------------------------------------- POEM
export const POEM: Instrument = {
  id: 'poem',
  title: 'POEM',
  subtitle: 'How your eczema symptoms have been this week.',
  instructions:
    'Please select one response for each of the seven questions about your eczema. Please leave blank any questions you feel unable to answer.',
  copyright: '© University of Nottingham. Patient-Oriented Eczema Measure.',
  questions: [
    { id: 'poem_1', text: 'Over the last week, on how many days has your skin been itchy because of the eczema?', options: DAY_FREQUENCY },
    { id: 'poem_2', text: 'Over the last week, on how many nights has your sleep been disturbed because of the eczema?', options: DAY_FREQUENCY },
    { id: 'poem_3', text: 'Over the last week, on how many days has your skin been bleeding because of the eczema?', options: DAY_FREQUENCY },
    { id: 'poem_4', text: 'Over the last week, on how many days has your skin been weeping or oozing clear fluid because of the eczema?', options: DAY_FREQUENCY },
    { id: 'poem_5', text: 'Over the last week, on how many days has your skin been cracked because of the eczema?', options: DAY_FREQUENCY },
    { id: 'poem_6', text: 'Over the last week, on how many days has your skin been flaking off because of the eczema?', options: DAY_FREQUENCY },
    { id: 'poem_7', text: 'Over the last week, on how many days has your skin felt dry or rough because of the eczema?', options: DAY_FREQUENCY },
  ],
};

// POEM severity bands (verbatim from the "Instructions for use" sheet).
// Applied in code from the raw score; never stored.
export const POEM_BANDS = [
  { min: 0, max: 2, label: 'Clear or almost clear' },
  { min: 3, max: 7, label: 'Mild eczema' },
  { min: 8, max: 16, label: 'Moderate eczema' },
  { min: 17, max: 24, label: 'Severe eczema' },
  { min: 25, max: 28, label: 'Very severe eczema' },
] as const;

// ---------------------------------------------------------------------- RECAP
// NOTE: RECAP questions do NOT all share one option set. Each carries its own.
export const RECAP: Instrument = {
  id: 'recap',
  title: 'RECAP',
  subtitle: 'How much control you have over your eczema, and how it affects daily life.',
  instructions:
    'The questions below provide a snapshot of how your eczema has been over the last week from your point of view. Please only select one response for each question. Try and respond to every question, but if you are unable to respond then leave it blank.',
  copyright: '© University of Nottingham. RECAP of atopic eczema.',
  questions: [
    {
      id: 'recap_1',
      text: 'Over the last week, how has your eczema been?',
      options: [
        { label: 'Very good', score: 0 },
        { label: 'Good', score: 1 },
        { label: 'Ok', score: 2 },
        { label: 'Bad', score: 3 },
        { label: 'Very Bad', score: 4 },
      ],
    },
    { id: 'recap_2', text: 'Over the last week, on how many days has your skin been itchy because of your eczema?', options: DAY_FREQUENCY },
    { id: 'recap_3', text: 'Over the last week, on how many days has your skin been intensely itchy because of your eczema?', options: DAY_FREQUENCY },
    {
      id: 'recap_4',
      text: 'Over the last week, how much has your sleep been disturbed because of your eczema?',
      options: [
        { label: 'Not at all', score: 0 },
        { label: 'A little bit', score: 1 },
        { label: 'Quite a bit', score: 2 },
        { label: 'A huge amount', score: 3 },
        { label: 'Completely', score: 4 },
      ],
    },
    {
      id: 'recap_5',
      text: 'Over the last week, how much has your eczema been getting in the way of day to day activities?',
      options: [
        { label: 'Not at all', score: 0 },
        { label: 'A little bit', score: 1 },
        { label: 'Quite a bit', score: 2 },
        { label: 'A huge amount', score: 3 },
        { label: 'Completely', score: 4 },
      ],
    },
    { id: 'recap_6', text: 'Over the last week, on how many days has your eczema affected how you have been feeling?', options: DAY_FREQUENCY },
    {
      id: 'recap_7',
      text: 'Over the last week, how acceptable has your eczema been to you?',
      options: [
        { label: 'Completely acceptable', score: 0 },
        { label: 'Mostly acceptable', score: 1 },
        { label: 'Quite acceptable', score: 2 },
        { label: 'Not very acceptable', score: 3 },
        { label: 'Not at all acceptable', score: 4 },
      ],
    },
  ],
};

// The weekly flow runs POEM (1-7) then RECAP (8-14). 14 questions total.
export const ASSESSMENT_SEQUENCE: Instrument[] = [POEM, RECAP];
export const TOTAL_QUESTIONS = 14;
