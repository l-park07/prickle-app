import { useEffect, useState } from 'react';
import { getActiveMedications, getActiveSites, getActiveTriggers } from '../../lib/chartSelectors';
import { db } from '../../lib/db';

export interface TrackableLists {
  sites: { id: string; name: string }[];
  triggers: { id: string; name: string }[];
  medications: { id: string; name: string }[];
  loading: boolean;
}

const EMPTY: Omit<TrackableLists, 'loading'> = { sites: [], triggers: [], medications: [] };

/**
 * The user's active sites/triggers/medications, fetched together — shared by useOverlayChartData
 * (name resolution for legend/tooltip rows) and ChartConfigSheet (the "what appears in this
 * chart" multi-select), so the fetch happens once per consumer rather than being duplicated.
 */
export function useTrackableLists(userId: string | null): TrackableLists {
  const [lists, setLists] = useState<Omit<TrackableLists, 'loading'>>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLists(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getActiveSites(db, userId), getActiveTriggers(db, userId), getActiveMedications(db, userId)]).then(
      ([sites, triggers, medications]) => {
        if (cancelled) return;
        setLists({ sites, triggers, medications });
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { ...lists, loading };
}
