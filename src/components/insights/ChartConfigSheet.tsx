import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, overlay, radius, spacing } from '../../app/theme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import type { GapMode } from '../../lib/chartSeries';
import { resolveGranularity } from '../../lib/chartSelectors';
import { db } from '../../lib/db';
import {
  createCustomChart,
  DEFAULT_CUSTOM_CHART_CONFIG,
  softDeleteCustomChart,
  updateCustomChart,
  type CustomChart,
  type CustomChartConfig,
  type CustomChartSeries,
} from '../../lib/manageCustomCharts';
import { AppText } from '../AppText';
import { PrimaryButton } from '../PrimaryButton';
import { TextField } from '../TextField';
import { ChartSeriesPicker } from './ChartSeriesPicker';
import { GapModeControl } from './GapModeControl';
import { RANGE_PRESETS } from './RangeAndGranularityControls';
import { SegmentedControl } from './SegmentedControl';
import { useTrackableLists } from './useTrackableLists';

const GRANULARITY_OPTIONS: { value: CustomChartConfig['granularity']; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'daily', label: 'Day' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
];

function seriesLabel(
  s: CustomChartSeries,
  names: { sites: Map<string, string>; triggers: Map<string, string>; medications: Map<string, string> }
): string | undefined {
  switch (s.kind) {
    case 'site':
      return names.sites.get(s.id);
    case 'stress':
      return 'Stress';
    case 'mood':
      return 'Mood';
    case 'trigger':
      return names.triggers.get(s.id);
    case 'medication':
      return names.medications.get(s.id);
  }
}

/** "Elbow & Neck vs Heat" — joins enabled line-series labels, then event-series labels after
 *  "vs" if any are selected. Recomputed live while the title field hasn't been touched. */
function autoGenerateTitle(
  config: CustomChartConfig,
  names: { sites: Map<string, string>; triggers: Map<string, string>; medications: Map<string, string> }
): string {
  const lineLabels = config.series
    .filter((s) => s.kind === 'site' || s.kind === 'stress' || s.kind === 'mood')
    .map((s) => seriesLabel(s, names))
    .filter((label): label is string => Boolean(label));
  const eventLabels = config.series
    .filter((s) => s.kind === 'trigger' || s.kind === 'medication')
    .map((s) => seriesLabel(s, names))
    .filter((label): label is string => Boolean(label));
  if (lineLabels.length === 0) return '';
  return eventLabels.length > 0 ? `${lineLabels.join(' & ')} vs ${eventLabels.join(' & ')}` : lineLabels.join(' & ');
}

interface ChartConfigSheetProps {
  /** null = closed. 'create' = new chart. A CustomChart = editing that one. */
  target: 'create' | CustomChart | null;
  onClose: () => void;
  /** Parent refetches its list after a save/delete — Prompt 6 is what actually passes/uses this. */
  onSaved?: () => void;
}

/**
 * Configures an overlay chart's scope/scale — title, series membership, time range, granularity,
 * gap mode. Deliberately does NOT contain enable/disable toggles for series already in the
 * chart — that's the card's legend (OverlayLegend.tsx). Not mounted anywhere yet: Prompt 6 wires
 * the "+ Add a chart" button and each card's "Edit" menu item to open this.
 */
export function ChartConfigSheet({ target, onClose, onSaved }: ChartConfigSheetProps) {
  const insets = useSafeAreaInsets();
  const activeUserId = useActiveUserId();
  const lists = useTrackableLists(activeUserId);
  const names = {
    sites: new Map(lists.sites.map((s) => [s.id, s.name])),
    triggers: new Map(lists.triggers.map((t) => [t.id, t.name])),
    medications: new Map(lists.medications.map((m) => [m.id, m.name])),
  };

  const [config, setConfig] = useState<CustomChartConfig>(DEFAULT_CUSTOM_CHART_CONFIG);
  const [title, setTitle] = useState('');
  // False only for a fresh 'create' sheet — the title field then live-tracks autoGenerateTitle
  // until the user types, at which point it stops being overwritten. An existing chart being
  // edited always starts touched: true, so tweaking series never silently rewrites its title.
  const [titleTouched, setTitleTouched] = useState(false);

  const targetKey = target === 'create' ? 'create' : (target?.id ?? null);
  useEffect(() => {
    if (targetKey === null) return;
    if (target === 'create') {
      setConfig(DEFAULT_CUSTOM_CHART_CONFIG);
      setTitle('');
      setTitleTouched(false);
    } else if (target) {
      setConfig(target.config);
      setTitle(target.title);
      setTitleTouched(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const hasEventSeries = config.series.some((s) => (s.kind === 'trigger' || s.kind === 'medication') && s.enabled);
  const { granularity: resolvedGranularity } = resolveGranularity(config.range, config.granularity, hasEventSeries);

  const displayTitle = titleTouched ? title : autoGenerateTitle(config, names);
  const canSave = Boolean(activeUserId) && config.series.some((s) => s.kind === 'site');
  const isEdit = target !== 'create' && target !== null;

  const handleSave = async () => {
    if (!activeUserId || !canSave) return;
    const finalTitle = displayTitle.trim() || 'Custom chart';
    if (target === 'create') {
      await createCustomChart(db, activeUserId, finalTitle, config);
    } else if (target) {
      await updateCustomChart(db, target.id, { title: finalTitle, config });
    }
    onSaved?.();
    onClose();
  };

  const handleDelete = () => {
    if (target === 'create' || !target) return;
    Alert.alert('Delete this chart?', `"${target.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await softDeleteCustomChart(db, target.id);
          onSaved?.();
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={target !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        {target ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.header}>
                <AppText variant="h2" style={styles.headerText}>
                  {isEdit ? 'Edit chart' : 'New chart'}
                </AppText>
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              <TextField
                label="Chart title"
                value={displayTitle}
                onChangeText={(text) => {
                  setTitleTouched(true);
                  setTitle(text);
                }}
                placeholder="Chart title"
              />

              <ChartSeriesPicker lists={lists} config={config} onChange={setConfig} />

              <View style={styles.section}>
                <AppText variant="label" color={colors.textSecondary}>
                  Time range
                </AppText>
                <SegmentedControl
                  options={RANGE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
                  value={config.range}
                  onChange={(range) => setConfig({ ...config, range })}
                />
              </View>

              <View style={styles.section}>
                <AppText variant="label" color={colors.textSecondary}>
                  Granularity
                </AppText>
                <View style={hasEventSeries ? styles.disabledControl : undefined}>
                  <SegmentedControl
                    options={GRANULARITY_OPTIONS}
                    value={config.granularity}
                    onChange={hasEventSeries ? () => {} : (granularity) => setConfig({ ...config, granularity })}
                  />
                </View>
                <AppText variant="caption" color={colors.textSecondary}>
                  {hasEventSeries
                    ? 'Trigger markers need day-level detail to be readable — this is fixed to daily.'
                    : config.granularity === 'auto'
                      ? `Auto (${resolvedGranularity})`
                      : ' '}
                </AppText>
              </View>

              <GapModeControl
                value={config.showGaps ? 'break' : 'omit'}
                onChange={(mode: GapMode) => setConfig({ ...config, showGaps: mode === 'break' })}
              />

              <View style={styles.actions}>
                <PrimaryButton label="Save" onPress={handleSave} disabled={!canSave} />
                <Pressable onPress={onClose} accessibilityRole="button">
                  <AppText variant="label" color={colors.textSecondary} style={styles.centeredText}>
                    Cancel
                  </AppText>
                </Pressable>
                {isEdit ? (
                  <Pressable onPress={handleDelete} accessibilityRole="button">
                    <AppText variant="label" color={colors.error} style={styles.centeredText}>
                      Delete this chart
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: overlay,
  },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  section: {
    gap: spacing.xs,
  },
  disabledControl: {
    opacity: 0.5,
  },
  actions: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  centeredText: {
    textAlign: 'center',
  },
});
