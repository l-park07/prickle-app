import { RECAP } from '../../../content/assessments';
import type { GapMode } from '../../lib/chartSeries';
import { RECAP_GRADIENT_COLORS, RECAP_NO_OF_SECTIONS, recapYAxisLabelTexts } from './recapGradient';
import { ScoreOverTime } from './ScoreOverTime';

interface RecapTrendChartProps {
  data: { weekStart: string; score: number }[];
  gapMode: GapMode;
}

/** Weekly RECAP totals on a true time axis, with a soft controlled->uncontrolled gradient backdrop. No band prop: RECAP has no published bands, so none are invented. */
export function RecapTrendChart({ data, gapMode }: RecapTrendChartProps) {
  return (
    <ScoreOverTime
      title="RECAP"
      copyright={RECAP.copyright}
      data={data}
      gapMode={gapMode}
      maxValue={28}
      noOfSections={RECAP_NO_OF_SECTIONS}
      yAxisLabelTexts={recapYAxisLabelTexts()}
      background={{ type: 'gradient', colors: RECAP_GRADIENT_COLORS }}
      emptyMessage="A couple more weekly checks and your RECAP trend will show up here."
    />
  );
}
