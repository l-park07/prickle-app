import { POEM, POEM_BANDS } from '../../../content/assessments';
import { poemBand } from '../../../content/scoreAssessment';
import { poemSectionColors, poemYAxisTicks } from './poemBands';
import { ScoreOverTime } from './ScoreOverTime';

interface PoemTrendChartProps {
  data: { weekStart: string; score: number }[];
  /** See ScoreOverTime's printMode — used by ExportSummaryCaptureRig. */
  printMode?: boolean;
}

// The instrument's own band names, verbatim — nothing invented here.
const POEM_REGION_LABELS = POEM_BANDS.map((b) => ({ label: b.label, midValue: (b.min + b.max) / 2 }));

/** Weekly POEM totals on a true time axis, with the five canonical severity bands as a backdrop.
 *  Owns its own gap-mode toggle (see ScoreOverTime) — independent of every other Insights chart. */
export function PoemTrendChart({ data, printMode }: PoemTrendChartProps) {
  return (
    <ScoreOverTime
      title="POEM"
      copyright={POEM.copyright}
      data={data}
      maxValue={28}
      noOfSections={28}
      yAxisTicks={poemYAxisTicks()}
      background={{ type: 'bands', sectionColors: poemSectionColors() }}
      band={poemBand}
      regionLabels={POEM_REGION_LABELS}
      showsFullHistory
      emptyMessage="A couple more weekly checks and your POEM trend will show up here."
      printMode={printMode}
    />
  );
}
