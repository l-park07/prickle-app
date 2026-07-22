import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import type { CustomChartConfig, CustomChartSeries } from '../../lib/manageCustomCharts';
import { LogCheckboxRow } from '../LogCheckboxRow';
import { AppText } from '../AppText';
import type { TrackableLists } from './useTrackableLists';

const SOFT_WARNING_THRESHOLD = 6;

interface ChartSeriesPickerProps {
  lists: TrackableLists;
  config: CustomChartConfig;
  onChange: (next: CustomChartConfig) => void;
}

function isSelected(config: CustomChartConfig, kind: CustomChartSeries['kind'], id?: string): boolean {
  return config.series.some((s) => s.kind === kind && (id === undefined || ('id' in s && s.id === id)));
}

/**
 * Checking a row here adds it to config.series (enabled: true); unchecking removes the entry
 * outright — presence in the array IS the selection, distinct from the legend's enabled/disabled
 * toggle on an entry already present. See OverlayLegend.tsx for that other half.
 */
function toggle(config: CustomChartConfig, kind: CustomChartSeries['kind'], id?: string): CustomChartConfig {
  if (isSelected(config, kind, id)) {
    return { ...config, series: config.series.filter((s) => !(s.kind === kind && (id === undefined || ('id' in s && s.id === id)))) };
  }
  const entry = (kind === 'stress' || kind === 'mood' ? { kind, enabled: true } : { kind, id: id as string, enabled: true }) as CustomChartSeries;
  return { ...config, series: [...config.series, entry] };
}

/**
 * "What appears in this chart" — the sheet's multi-select. Curates config.series' MEMBERSHIP
 * (this prompt); a series' on/off visibility once it's a member lives on the card's legend
 * (Prompt 4's OverlayLegend), not here.
 */
export function ChartSeriesPicker({ lists, config, onChange }: ChartSeriesPickerProps) {
  const selectedCount = config.series.length;

  return (
    <View style={styles.container}>
      <AppText variant="label" color={colors.textSecondary}>
        What appears in this chart
      </AppText>

      {lists.sites.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title">Sites</AppText>
          {lists.sites.map((site) => (
            <LogCheckboxRow
              key={site.id}
              label={site.name}
              checked={isSelected(config, 'site', site.id)}
              onToggle={() => onChange(toggle(config, 'site', site.id))}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        {/* Stress isn't offered here yet — log.tsx has no stress control, so a 'stress' series
            could never have data. Add its LogCheckboxRow back once that control ships. */}
        <AppText variant="title">Mood</AppText>
        <LogCheckboxRow label="Mood" checked={isSelected(config, 'mood')} onToggle={() => onChange(toggle(config, 'mood'))} />
      </View>

      {lists.triggers.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title">Triggers</AppText>
          {lists.triggers.map((trigger) => (
            <LogCheckboxRow
              key={trigger.id}
              label={trigger.name}
              checked={isSelected(config, 'trigger', trigger.id)}
              onToggle={() => onChange(toggle(config, 'trigger', trigger.id))}
            />
          ))}
        </View>
      ) : null}

      {lists.medications.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="title">Medications</AppText>
          {lists.medications.map((medication) => (
            <LogCheckboxRow
              key={medication.id}
              label={medication.name}
              checked={isSelected(config, 'medication', medication.id)}
              onToggle={() => onChange(toggle(config, 'medication', medication.id))}
            />
          ))}
        </View>
      ) : null}

      {selectedCount > SOFT_WARNING_THRESHOLD ? (
        <AppText variant="caption" color={colors.textSecondary}>
          That's a lot at once — a chart with everything on gets hard to read. Worth trimming down?
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
});
