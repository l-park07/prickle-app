import { useMemo, useState } from 'react';
import { ASSESSMENT_SEQUENCE, AssessmentQuestion, Instrument } from '../../content/assessments';

export interface AssessmentFlowEntry {
  instrument: Instrument;
  question: AssessmentQuestion;
  indexInInstrument: number;
}

/** This UI is single-select only, so an answered question is always a plain score, never blank-array/null. */
export type FlowAnswers = Record<string, number | undefined>;

/**
 * Owns the weekly assessment's step position and answers so both can be
 * unit-tested apart from any UI. `back()` never clears `answers`, which is
 * what makes "back preserves prior answers" true without extra bookkeeping.
 */
export function useAssessmentFlow() {
  const flow = useMemo<AssessmentFlowEntry[]>(
    () =>
      ASSESSMENT_SEQUENCE.flatMap((instrument) =>
        instrument.questions.map((question, indexInInstrument) => ({
          instrument,
          question,
          indexInInstrument,
        }))
      ),
    []
  );

  const [step, setStep] = useState(-1); // -1 = intro, 0..flow.length-1 = question index
  const [answers, setAnswers] = useState<FlowAnswers>({});

  const isIntro = step === -1;
  const isLast = step === flow.length - 1;
  const currentEntry = isIntro ? null : flow[step];

  const begin = () => setStep(0);
  const next = () => setStep((s) => Math.min(s + 1, flow.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, -1));
  const select = (questionId: string, score: number) =>
    setAnswers((prev) => ({ ...prev, [questionId]: score }));

  return {
    flow,
    step,
    currentEntry,
    answers,
    isIntro,
    isLast,
    begin,
    next,
    back,
    select,
  };
}
