import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { colors, radius, spacing } from '../../app/theme';
import { AppText } from '../AppText';
import type { ResolvedSeriesRow } from './useOverlayChartData';

interface LegendSwatchProps {
  shape: 'line' | 'block';
  color: string;
}

/** A short line segment for line series (site/stress/mood), a small filled block for event series
 *  (trigger/medication) — the swatch shape carries HOW a series is drawn, not just its color, so
 *  identity doesn't rely on color alone. Exported for OverlayCard's printMode static legend. */
export function LegendSwatch({ shape, color }: LegendSwatchProps) {
  return <View style={[shape === 'line' ? styles.lineSwatch : styles.blockSwatch, { backgroundColor: color }]} />;
}

interface OverlayLegendProps {
  /** Every entry in the chart's config.series, in stored order — enabled AND disabled. */
  rows: ResolvedSeriesRow[];
  onToggle: (id: string) => void;
}

/**
 * The overlay chart's legend AND control surface: one row per configured series, in the SAME order
 * every time — a disabled row renders greyed but stays exactly where it is rather than being
 * reordered or hidden, so the list doesn't jump under the user's thumb while toggling.
 */
export function OverlayLegend({ rows, onToggle }: OverlayLegendProps) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <Pressable
          key={row.id}
          onPress={() => onToggle(row.id)}
          style={[styles.row, !row.enabled && styles.rowDisabled]}
          accessibilityRole="switch"
          accessibilityState={{ checked: row.enabled }}
          accessibilityLabel={row.label}
        >
          <View style={styles.label}>
            <LegendSwatch shape={row.shape} color={row.color} />
            <AppText variant="body" color={colors.textPrimary}>
              {row.label}
            </AppText>
          </View>
          {/* No accessibilityLabel here — the row Pressable above already carries the full
              switch role/label/state; labeling this too made screen readers announce the
              same row twice. Matches SiteToggleLegend's existing precedent. */}
          <Switch
            value={row.enabled}
            onValueChange={() => onToggle(row.id)}
            trackColor={{ true: row.color, false: colors.border }}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDisabled: {
    opacity: 0.45,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lineSwatch: {
    width: 16,
    height: 3,
    borderRadius: radius.sm,
  },
  blockSwatch: {
    width: 14,
    height: 14,
    borderRadius: radius.sm,
  },
});
