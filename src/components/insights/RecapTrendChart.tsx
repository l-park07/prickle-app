import { RECAP } from '../../../content/assessments';
import { RECAP_GRADIENT_COLORS, RECAP_NO_OF_SECTIONS, recapYAxisTicks } from './recapGradient';
import { ScoreOverTime } from './ScoreOverTime';

interface RecapTrendChartProps {
  data: { weekStart: string; score: number }[];
  /** See ScoreOverTime's printMode — used by ExportSummaryCaptureRig. */
  printMode?: boolean;
}

// Orientation labels for the gradient direction already established in recapGradient.ts's
// comment (low = controlled, high = uncontrolled) — not a proposed score cutoff, so placed near
// each end rather than at the literal 0/28 extremes where they'd collide with the axis labels.
const RECAP_REGION_LABELS = [
  { label: 'Uncontrolled', midValue: 24 },
  { label: 'Controlled', midValue: 4 },
];

/** Weekly RECAP totals on a true time axis, with a soft controlled->uncontrolled gradient backdrop.
 *  No band prop: RECAP has no published bands, so none are invented. Owns its own gap-mode toggle
 *  (see ScoreOverTime) — independent of every other Insights chart. */
export function RecapTrendChart({ data, printMode }: RecapTrendChartProps) {
  return (
    <ScoreOverTime
      title="RECAP"
      copyright={RECAP.copyright}
      data={data}
      maxValue={28}
      noOfSections={RECAP_NO_OF_SECTIONS}
      yAxisTicks={recapYAxisTicks()}
      background={{ type: 'gradient', colors: RECAP_GRADIENT_COLORS }}
      regionLabels={RECAP_REGION_LABELS}
      showsFullHistory
      emptyMessage="A couple more weekly checks and your RECAP trend will show up here."
      printMode={printMode}
    />
  );
}
