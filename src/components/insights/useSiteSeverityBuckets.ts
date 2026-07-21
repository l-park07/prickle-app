import { useEffect, useMemo, useRef, useState } from 'react';
import { getSiteSeries } from '../../lib/chartSelectors';
import { buildBuckets, type Bucket, type GapMode, type Granularity } from '../../lib/chartSeries';
import { db } from '../../lib/db';
import { applyKeepIndex, sharedOmitKeepIndex } from './bucketChartLayout';

/**
 * A chart's own "which sites are toggled on" state, seeded to "everything on" the first time a
 * chartable site list arrives, then reconciled (not overwritten) on every later change: a site
 * still around stays whatever the user last set it to, a genuinely new site defaults to active,
 * and a removed/deactivated site just drops out. Each chart using this hook gets an independent
 * selection — SeverityOverTimeChart and SeverityComparisonChart can show different sites at once.
 */
export function useActiveSiteSelection(chartableSites: { id: string; name: string }[]): [string[], (next: string[]) => void] {
  const [activeSiteIds, setActiveSiteIds] = useState<string[]>([]);
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const freshIds = new Set(chartableSites.map((s) => s.id));
    const prevIds = prevIdsRef.current;
    setActiveSiteIds((prevActive) => {
      const stillActive = prevActive.filter((id) => freshIds.has(id));
      const newlyAdded = chartableSites.filter((s) => !prevIds.has(s.id)).map((s) => s.id);
      return prevIds.size === 0 ? chartableSites.map((s) => s.id) : [...stillActive, ...newlyAdded];
    });
    prevIdsRef.current = freshIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartableSites]);

  return [activeSiteIds, setActiveSiteIds];
}

/** react-native-gifted-charts' LineChart exposes exactly 5 line slots (data/data2../data5, each
 *  with its own color/lineSegments) — this IS the concurrent-site cap, not a UX choice. Shared by
 *  every chart that plots site-severity lines (severity chart, comparison chart). */
export const MAX_SITE_LINES = 5;

interface UseSiteSeverityBucketsParams {
  userId: string | null;
  /** Every currently-active site, sort_order-ordered (see getActiveSites). */
  sites: { id: string; name: string }[];
  /** From chartTheme.ts's assignSiteColors — at most MAX_SITE_LINES entries. */
  colorById: Record<string, string>;
  /** The chart's own site-toggle selection, before the color/cap filter below is applied. */
  requestedActiveSiteIds: string[];
  from: string;
  to: string;
  granularity: Granularity;
  gapMode: GapMode;
}

/**
 * Shared "sites -> gap-aligned buckets" pipeline behind both SeverityOverTimeChart and
 * SeverityComparisonChart: fetches getSiteSeries for the active sites, buckets each site with
 * 'max' aggregation (the calendar's "worst site" convention — never averages a flare away), then
 * applies the chart's gap mode. In 'omit' mode every visible site shares ONE keep-index (see
 * bucketChartLayout.ts's sharedOmitKeepIndex) so all lines stay aligned to the same x-axis dates —
 * filtering each site's nulls independently would silently misalign which calendar date sits at a
 * given pixel between two lines.
 */
export function useSiteSeverityBuckets({
  userId,
  sites,
  colorById,
  requestedActiveSiteIds,
  from,
  to,
  granularity,
  gapMode,
}: UseSiteSeverityBucketsParams): {
  /** requestedActiveSiteIds filtered to sites this chart can actually color, capped at MAX_SITE_LINES. */
  activeSiteIds: string[];
  /** Same date, in order, for every active site — the shared x-axis. Empty if no active sites. */
  bucketDates: string[];
  /** Gap-mode-applied buckets per site id. */
  displayBySite: Record<string, Bucket[]>;
} {
  const activeSiteIds = useMemo(
    () => requestedActiveSiteIds.filter((id) => colorById[id]).slice(0, MAX_SITE_LINES),
    [requestedActiveSiteIds, colorById]
  );

  const [rawBySite, setRawBySite] = useState<Record<string, { date: string; value: number | null }[]>>({});

  useEffect(() => {
    if (!userId || activeSiteIds.length === 0) {
      setRawBySite({});
      return;
    }
    let cancelled = false;
    getSiteSeries(db, userId, activeSiteIds, from, to).then((rows) => {
      if (cancelled) return;
      // getSiteSeries groups by site NAME (see its SQL) — map back to id via the currently-active
      // sites' names. Two active sites sharing an identical name would collide here; an accepted
      // edge case, not worth a schema change to guard against.
      const idByName = new Map(sites.filter((s) => activeSiteIds.includes(s.id)).map((s) => [s.name, s.id]));
      const bySite: Record<string, { date: string; value: number | null }[]> = {};
      for (const id of activeSiteIds) bySite[id] = [];
      for (const row of rows) {
        const id = idByName.get(row.series);
        if (id) bySite[id].push({ date: row.date, value: row.value });
      }
      setRawBySite(bySite);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeSiteIds.join(','), from, to]);

  const bucketsBySite = useMemo(() => {
    const out: Record<string, Bucket[]> = {};
    for (const id of activeSiteIds) {
      out[id] = buildBuckets(rawBySite[id] ?? [], {
        from,
        to,
        granularity,
        weekStartsOn: 1,
        aggregate: 'max', // worst score in the bucket — never averages a flare away
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawBySite, activeSiteIds, from, to, granularity]);

  const displayBySite = useMemo(() => {
    if (gapMode === 'break') return bucketsBySite;
    const keep = sharedOmitKeepIndex(activeSiteIds.map((id) => bucketsBySite[id] ?? []));
    const out: Record<string, Bucket[]> = {};
    for (const id of activeSiteIds) out[id] = applyKeepIndex(bucketsBySite[id] ?? [], keep);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketsBySite, gapMode, activeSiteIds]);

  const bucketDates = activeSiteIds.length > 0 ? (displayBySite[activeSiteIds[0]] ?? []).map((b) => b.date) : [];

  return { activeSiteIds, bucketDates, displayBySite };
}
