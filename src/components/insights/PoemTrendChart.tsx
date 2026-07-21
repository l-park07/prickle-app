import { POEM } from '../../../content/assessments';
import { poemBand } from '../../../content/scoreAssessment';
import type { GapMode } from '../../lib/chartSeries';
import { poemSectionColors, poemYAxisLabelTexts } from './poemBands';
import { ScoreOverTime } from './ScoreOverTime';

interface PoemTrendChartProps {
  data: { weekStart: string; score: number }[];
  gapMode: GapMode;
}

/** Weekly POEM totals on a true time axis, with the five canonical severity bands as a backdrop. */
export function PoemTrendChart({ data, gapMode }: PoemTrendChartProps) {
  return (
    <ScoreOverTime
      title="POEM"
      copyright={POEM.copyright}
      data={data}
      gapMode={gapMode}
      maxValue={28}
      noOfSections={28}
      yAxisLabelTexts={poemYAxisLabelTexts()}
      background={{ type: 'bands', sectionColors: poemSectionColors() }}
      band={poemBand}
      emptyMessage="A couple more weekly checks and your POEM trend will show up here."
    />
  );
}
