import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import { colors, radius, spacing } from '../../app/theme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { db } from '../../lib/db';
import {
  setIncludeInExport as setChartIncludeInExport,
  updateCustomChart,
  type CustomChart,
  type CustomChartConfig,
} from '../../lib/manageCustomCharts';
import { AppText } from '../AppText';
import { ChartCard } from './ChartCard';
import { ChartExportButton } from './ChartExportButton';
import { OverlayChart } from './OverlayChart';
import { OverlayLegend } from './OverlayLegend';
import { useOverlayChartData } from './useOverlayChartData';

const PERSIST_DEBOUNCE_MS = 600;

/** Flips one series' enabled flag by id ('stress'/'mood' stand in for their own id, matching
 *  useOverlayChartData's resolvedSeries/lineSeries convention). */
function toggleSeriesEnabled(config: CustomChartConfig, targetId: string): CustomChartConfig {
  return {
    ...config,
    series: config.series.map((s) => {
      switch (s.kind) {
        case 'stress':
        case 'mood':
          return s.kind === targetId ? { ...s, enabled: !s.enabled } : s;
        case 'site':
        case 'trigger':
        case 'medication':
          return s.id === targetId ? { ...s, enabled: !s.enabled } : s;
      }
    }),
  };
}

interface OverlayCardProps {
  /** A row from listCustomCharts (manageCustomCharts.ts) — id/title/config/includeInExport. Give
   *  each card a `key={chart.id}` when rendering a list so a different chart gets a fresh instance
   *  rather than this one's local optimistic state leaking across rows. */
  chart: CustomChart;
  /** Opens the card's "..." options menu (Edit/Duplicate/Move/Delete) — the Insights tab owns
   *  that menu (ChartOptionsSheet.tsx), this card just reports the tap. */
  onOptionsPress: (chart: CustomChart) => void;
}

/**
 * The user-created overlay chart card: chart on top, legend-as-controls underneath (see
 * scratch/prickle-insights-comparison-prompts.md section 0).
 */
export function OverlayCard({ chart, onOptionsPress }: OverlayCardProps) {
  const activeUserId = useActiveUserId();
  const shotRef = useRef<ViewShotRef>(null);

  // Optimistic local copy: toggling a legend row updates this immediately (so the chart/legend
  // respond instantly) independent of the debounced write below. Seeded once — a different chart
  // gets a fresh OverlayCard instance via `key={chart.id}`, not a prop update to this one.
  const [config, setConfig] = useState<CustomChartConfig>(chart.config);
  const [includeInExport, setIncludeInExportLocal] = useState(chart.includeInExport);

  const persistConfig = useDebouncedCallback((nextConfig: CustomChartConfig) => {
    updateCustomChart(db, chart.id, { config: nextConfig });
  }, PERSIST_DEBOUNCE_MS);

  const handleToggle = (seriesId: string) => {
    const next = toggleSeriesEnabled(config, seriesId);
    setConfig(next);
    persistConfig(next);
  };

  const handleExportToggle = async (next: boolean) => {
    setIncludeInExportLocal(next);
    try {
      await setChartIncludeInExport(db, chart.id, next);
    } catch {
      setIncludeInExportLocal(!next);
    }
  };

  const { bucketDates, lineSeries, eventSeries, resolvedSeries, bucketGranularity, forcedDaily, linesCapped } = useOverlayChartData(
    activeUserId,
    config
  );

  const hasMoodOrStress = config.series.some((s) => (s.kind === 'stress' || s.kind === 'mood') && s.enabled);

  const headerRight = (
    <View style={styles.headerActions}>
      <ChartExportButton shotRef={shotRef} chartTitle={chart.title} />
      <Pressable
        onPress={() => onOptionsPress(chart)}
        accessibilityRole="button"
        accessibilityLabel={`More options for ${chart.title}`}
        hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        style={styles.overflowButton}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );

  return (
    <ChartCard title={chart.title} headerRight={headerRight}>
      <ViewShot ref={shotRef} style={styles.shotArea}>
        <OverlayChart
          title={chart.title}
          bucketDates={bucketDates}
          bucketGranularity={bucketGranularity}
          lineSeries={lineSeries}
          eventSeries={eventSeries}
        />
      </ViewShot>

      <View style={styles.captionBlock}>
        <AppText variant="caption" color={colors.textSecondary}>
          Triggers can take a few days to show up, if they show up at all. Look for what happens in
          the days after a marker, not just on it.
        </AppText>
        {hasMoodOrStress ? (
          <AppText variant="caption" color={colors.textSecondary}>
            Stress and severity share a 1–5 scale but measure different things.
          </AppText>
        ) : null}
      </View>

      <View style={styles.divider} />

      <OverlayLegend rows={resolvedSeries} onToggle={handleToggle} />

      {linesCapped ? (
        <AppText variant="caption" color={colors.textSecondary}>
          Showing the first 5 lines — charts can only draw that many at once.
        </AppText>
      ) : null}

      {forcedDaily ? (
        <AppText variant="caption" color={colors.textSecondary}>
          Showing daily — trigger markers need day-level detail to be readable.
        </AppText>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <AppText variant="body" color={colors.textPrimary}>
          Include in export
        </AppText>
        <Switch
          value={includeInExport}
          onValueChange={handleExportToggle}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel={`Include ${chart.title} in export`}
        />
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  overflowButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotArea: {
    backgroundColor: colors.surfaceAlt,
  },
  captionBlock: {
    gap: spacing.xs,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
