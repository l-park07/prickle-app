import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../app/theme';
import { todayISO } from '../../lib/calendarMath';
import { buildBuckets, type Bucket, type Granularity } from '../../lib/chartSeries';
import {
  getEventDays,
  getMoodSeries,
  getSiteSeries,
  getStressSeries,
  resolveGranularity,
  type SeriesPoint,
} from '../../lib/chartSelectors';
import { db } from '../../lib/db';
import type { CustomChartConfig, CustomChartSeries } from '../../lib/manageCustomCharts';
import { applyKeepIndex, sharedOmitKeepIndex } from './bucketChartLayout';
import { assignEventAccentColors, assignSiteColors } from './chartTheme';
import type { EventLaneSeries } from './EventLanes';
import { rangeFromPreset } from './RangeAndGranularityControls';
import { useTrackableLists } from './useTrackableLists';
import { MAX_SITE_LINES, useEarliestLogDate } from './useSiteSeverityBuckets';

const GRANULARITY_TO_BUCKET: Record<'daily' | 'weekly' | 'monthly', Granularity> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

/** One legend row — covers EVERY entry in config.series, enabled or not, since a disabled row
 *  still needs a name/color/shape to render greyed in place. */
export interface ResolvedSeriesRow {
  /** Site id / trigger id / medication id, or the literal 'stress'/'mood' for those kinds. */
  id: string;
  kind: CustomChartSeries['kind'];
  label: string;
  color: string;
  shape: 'line' | 'block';
  enabled: boolean;
}

export interface OverlayLineSeries {
  id: string;
  kind: 'site' | 'stress' | 'mood';
  label: string;
  color: string;
  /** Stress/mood render thinner and muted, behind the site lines — see section 0's rule. */
  thin: boolean;
  buckets: Bucket[];
}

export interface UseOverlayChartDataResult {
  bucketDates: string[];
  lineSeries: OverlayLineSeries[];
  eventSeries: EventLaneSeries[];
  /** Every config.series row, resolved for the legend — enabled and disabled alike. */
  resolvedSeries: ResolvedSeriesRow[];
  resolvedGranularity: 'daily' | 'weekly' | 'monthly';
  /** Same granularity, in chartSeries.ts's 'day'/'week'/'month' naming — for formatBucketDate etc. */
  bucketGranularity: Granularity;
  /** True iff an enabled event series forced daily granularity, overriding what was requested. */
  forcedDaily: boolean;
  /** True iff the 5-line gifted-charts slot cap dropped an enabled site or stress/mood series. */
  linesCapped: boolean;
  loading: boolean;
}

/** Which of config.series' enabled site/stress/mood entries get an actual line slot — gifted-charts
 *  hard-caps at 5 concurrent lines (MAX_SITE_LINES), the same constraint the existing severity chart
 *  already lives under. Sites are kept first since they're the chart's primary content ("these own
 *  the y-axis," section 0); any leftover slots go to stress/mood. */
function computeLineBudget(config: CustomChartConfig) {
  const enabledSites = config.series.filter(
    (s): s is Extract<CustomChartSeries, { kind: 'site' }> => s.kind === 'site' && s.enabled
  );
  const enabledMoodStress = config.series.filter(
    (s): s is Extract<CustomChartSeries, { kind: 'stress' | 'mood' }> => (s.kind === 'stress' || s.kind === 'mood') && s.enabled
  );
  const includedSites = enabledSites.slice(0, MAX_SITE_LINES);
  const includedMoodStress = enabledMoodStress.slice(0, Math.max(MAX_SITE_LINES - includedSites.length, 0));
  const capped = includedSites.length < enabledSites.length || includedMoodStress.length < enabledMoodStress.length;
  return { includedSites, includedMoodStress, capped };
}

/**
 * Fetch + bucket everything a custom overlay chart needs: site/stress/mood lines (via buildBuckets,
 * same pipeline as useSiteSeverityBuckets) and trigger/medication event series (via getEventDays,
 * a raw date list that never goes through buildBuckets — see EventLanes/EventBackgroundBands).
 * Every config.series entry is resolved for the legend regardless of enabled state; only enabled
 * (and, for lines, budget-included) entries get real chart data.
 */
export function useOverlayChartData(userId: string | null, config: CustomChartConfig): UseOverlayChartDataResult {
  const today = todayISO();
  const earliestLogDate = useEarliestLogDate(userId);
  // 'all' means the user's real earliest logged day, not rangeFromPreset's own ALL_TIME_FROM
  // stand-in (2000-01-01) — using that stand-in directly bucketed a 26-year span for every "All"
  // chart, which was slow, mostly empty, and made x-axis labels (no year shown) look scrambled
  // once the span crossed year boundaries. Same fix SeverityOverTimeChart.tsx already applies.
  const from = config.range === 'all' ? (earliestLogDate ?? today) : rangeFromPreset(config.range, today).from;
  const to = today; // rangeFromPreset always resolves `to` to `today` regardless of preset

  const hasEventSeries = config.series.some((s) => (s.kind === 'trigger' || s.kind === 'medication') && s.enabled);
  const { granularity: resolvedGranularity, forced: forcedDaily } = resolveGranularity(
    config.range,
    config.granularity,
    hasEventSeries
  );
  const bucketGranularity = GRANULARITY_TO_BUCKET[resolvedGranularity];

  const { includedSites, includedMoodStress, capped: linesCapped } = useMemo(
    () => computeLineBudget(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.series.map((s) => `${s.kind}:${'id' in s ? s.id : ''}:${s.enabled}`).join('|')]
  );

  const { sites: activeSites, triggers: activeTriggers, medications: activeMedications, loading: listsLoading } =
    useTrackableLists(userId);

  const names = useMemo(
    () => ({
      sites: new Map(activeSites.map((s) => [s.id, s.name])),
      triggers: new Map(activeTriggers.map((t) => [t.id, t.name])),
      medications: new Map(activeMedications.map((m) => [m.id, m.name])),
    }),
    [activeSites, activeTriggers, activeMedications]
  );
  const siteColorById = useMemo(() => assignSiteColors(activeSites), [activeSites]);

  const seriesKey = config.series.map((s) => `${s.kind}:${'id' in s ? s.id : ''}:${s.enabled}`).join('|');

  const [rawLoading, setRawLoading] = useState(true);
  const [siteRowsRaw, setSiteRowsRaw] = useState<SeriesPoint[]>([]);
  const [stressRowsRaw, setStressRowsRaw] = useState<SeriesPoint[]>([]);
  const [moodRowsRaw, setMoodRowsRaw] = useState<SeriesPoint[]>([]);
  const [eventDaysById, setEventDaysById] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!userId) {
      setSiteRowsRaw([]);
      setStressRowsRaw([]);
      setMoodRowsRaw([]);
      setEventDaysById({});
      setRawLoading(false);
      return;
    }
    let cancelled = false;
    setRawLoading(true);

    const enabledEvents = config.series.filter(
      (s): s is Extract<CustomChartSeries, { kind: 'trigger' | 'medication' }> =>
        (s.kind === 'trigger' || s.kind === 'medication') && s.enabled
    );

    Promise.all([
      includedSites.length > 0
        ? getSiteSeries(db, userId, includedSites.map((s) => s.id), from, to)
        : Promise.resolve([]),
      includedMoodStress.some((s) => s.kind === 'stress') ? getStressSeries(db, userId, from, to) : Promise.resolve([]),
      includedMoodStress.some((s) => s.kind === 'mood') ? getMoodSeries(db, userId, from, to) : Promise.resolve([]),
      Promise.all(enabledEvents.map((s) => getEventDays(db, userId, s.kind, s.id, from, to))),
    ]).then(([siteRows, stressRows, moodRows, eventDaysLists]) => {
      if (cancelled) return;

      setSiteRowsRaw(siteRows);
      setStressRowsRaw(stressRows);
      setMoodRowsRaw(moodRows);

      const eventDaysMap: Record<string, string[]> = {};
      enabledEvents.forEach((s, i) => {
        eventDaysMap[s.id] = eventDaysLists[i];
      });
      setEventDaysById(eventDaysMap);
      setRawLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, seriesKey, from, to]);

  const loading = listsLoading || rawLoading;

  // getSiteSeries groups rows by site NAME (see its SQL) — map back to id via the included sites'
  // names (from useTrackableLists), same approach useSiteSeverityBuckets already uses. A useMemo
  // (not folded into the fetch effect above) so this stays correct if activeSites resolves after
  // the raw fetch already landed, rather than capturing a stale/empty name map.
  const rawLines = useMemo(() => {
    const nameToSiteId = new Map(
      activeSites.filter((s) => includedSites.some((inc) => inc.id === s.id)).map((s) => [s.name, s.id])
    );
    const lines: { id: string; kind: 'site' | 'stress' | 'mood'; points: { date: string; value: number | null }[] }[] = [];
    for (const site of includedSites) {
      lines.push({
        id: site.id,
        kind: 'site',
        points: siteRowsRaw.filter((r) => nameToSiteId.get(r.series) === site.id).map((r) => ({ date: r.date, value: r.value })),
      });
    }
    for (const row of includedMoodStress) {
      lines.push({
        id: row.kind,
        kind: row.kind as 'stress' | 'mood',
        points: (row.kind === 'stress' ? stressRowsRaw : moodRowsRaw).map((r) => ({ date: r.date, value: r.value })),
      });
    }
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSites, includedSites, includedMoodStress, siteRowsRaw, stressRowsRaw, moodRowsRaw]);

  const bucketsByLineId = useMemo(() => {
    const out: Record<string, Bucket[]> = {};
    for (const line of rawLines) {
      out[line.id] = buildBuckets(line.points, {
        from,
        to,
        granularity: bucketGranularity,
        weekStartsOn: 1,
        aggregate: line.kind === 'site' ? 'max' : 'mean',
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawLines, from, to, bucketGranularity]);

  const displayByLineId = useMemo(() => {
    if (config.showGaps) return bucketsByLineId;
    const ids = rawLines.map((l) => l.id);
    const keep = sharedOmitKeepIndex(ids.map((id) => bucketsByLineId[id] ?? []));
    const out: Record<string, Bucket[]> = {};
    for (const id of ids) out[id] = applyKeepIndex(bucketsByLineId[id] ?? [], keep);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketsByLineId, config.showGaps, rawLines]);

  const bucketDates = rawLines.length > 0 ? (displayByLineId[rawLines[0].id] ?? []).map((b) => b.date) : [];

  const eventColorById = useMemo(() => {
    const eventIds = config.series.filter((s) => s.kind === 'trigger' || s.kind === 'medication').map((s) => ('id' in s ? s.id : ''));
    return assignEventAccentColors(eventIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesKey]);

  const lineSeries: OverlayLineSeries[] = [
    ...includedMoodStress.map((s) => ({
      id: s.kind,
      kind: s.kind as 'stress' | 'mood',
      label: s.kind === 'stress' ? 'Stress' : 'Mood',
      color: colors.textSecondary,
      thin: true,
      buckets: displayByLineId[s.kind] ?? [],
    })),
    ...includedSites.map((s) => ({
      id: s.id,
      kind: 'site' as const,
      label: names.sites.get(s.id) ?? '…',
      color: siteColorById[s.id] ?? colors.textSecondary,
      thin: false,
      buckets: displayByLineId[s.id] ?? [],
    })),
  ];

  const eventSeries: EventLaneSeries[] = config.series
    .filter((s): s is Extract<CustomChartSeries, { kind: 'trigger' | 'medication' }> => (s.kind === 'trigger' || s.kind === 'medication') && s.enabled)
    .map((s) => ({
      id: s.id,
      label: (s.kind === 'trigger' ? names.triggers : names.medications).get(s.id) ?? '…',
      color: eventColorById[s.id] ?? colors.textSecondary,
      dates: new Set(eventDaysById[s.id] ?? []),
    }));

  const resolvedSeries: ResolvedSeriesRow[] = config.series.map((s): ResolvedSeriesRow => {
    switch (s.kind) {
      case 'site':
        return { id: s.id, kind: s.kind, label: names.sites.get(s.id) ?? '…', color: siteColorById[s.id] ?? colors.textSecondary, shape: 'line', enabled: s.enabled };
      case 'stress':
      case 'mood':
        return { id: s.kind, kind: s.kind, label: s.kind === 'stress' ? 'Stress' : 'Mood', color: colors.textSecondary, shape: 'line', enabled: s.enabled };
      case 'trigger':
      case 'medication': {
        const nameMap = s.kind === 'trigger' ? names.triggers : names.medications;
        return { id: s.id, kind: s.kind, label: nameMap.get(s.id) ?? '…', color: eventColorById[s.id] ?? colors.textSecondary, shape: 'block', enabled: s.enabled };
      }
    }
  });

  return { bucketDates, lineSeries, eventSeries, resolvedSeries, resolvedGranularity, bucketGranularity, forcedDaily, linesCapped, loading };
}
