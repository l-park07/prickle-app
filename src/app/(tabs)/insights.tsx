import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assignSiteColors } from '../../components/insights/chartTheme';
import { ChartConfigSheet } from '../../components/insights/ChartConfigSheet';
import { ChartOptionsSheet } from '../../components/insights/ChartOptionsSheet';
import { ExportSection } from '../../components/insights/ExportSection';
import { OverlayCard } from '../../components/insights/OverlayCard';
import { PoemTrendChart } from '../../components/insights/PoemTrendChart';
import { RecapTrendChart } from '../../components/insights/RecapTrendChart';
import { SeverityOverTimeChart } from '../../components/insights/SeverityOverTimeChart';
import { AppText } from '../../components/AppText';
import { LogFab } from '../../components/LogFab';
import { Snackbar } from '../../components/Snackbar';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { getActiveMedications, getActiveSites, getActiveTriggers, getPoemSeries, getRecapSeries } from '../../lib/chartSelectors';
import { db } from '../../lib/db';
import {
  createCustomChart,
  listCustomCharts,
  reorderCustomCharts,
  restoreCustomChart,
  softDeleteCustomChart,
  type CustomChart,
} from '../../lib/manageCustomCharts';
import { colors, radius, spacing } from '../theme';

interface SnackbarState {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export default function Insights() {
  const activeUserId = useActiveUserId();
  const insets = useSafeAreaInsets();

  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [poemSeries, setPoemSeries] = useState<{ weekStart: string; score: number }[]>([]);
  const [recapSeries, setRecapSeries] = useState<{ weekStart: string; score: number }[]>([]);
  const [customCharts, setCustomCharts] = useState<CustomChart[]>([]);

  const [sheetTarget, setSheetTarget] = useState<'create' | CustomChart | null>(null);
  const [menuChart, setMenuChart] = useState<CustomChart | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);

  const colorById = useMemo(() => assignSiteColors(sites), [sites]);

  // Fetches sites (for the permanent severity chart) and the custom chart list together, since
  // listCustomCharts needs LiveSeriesIds built from sites + triggers + medications to drop any
  // series referencing something since deleted. Called on focus and after every menu action below
  // so the list stays current without a page reload.
  const refetchAll = useCallback(async () => {
    if (!activeUserId) return;
    const [activeSites, activeTriggers, activeMedications] = await Promise.all([
      getActiveSites(db, activeUserId),
      getActiveTriggers(db, activeUserId),
      getActiveMedications(db, activeUserId),
    ]);
    setSites(activeSites);
    const liveIds = {
      siteIds: new Set(activeSites.map((s) => s.id)),
      triggerIds: new Set(activeTriggers.map((t) => t.id)),
      medicationIds: new Set(activeMedications.map((m) => m.id)),
    };
    const charts = await listCustomCharts(db, activeUserId, liveIds);
    setCustomCharts(charts);
  }, [activeUserId]);

  // useFocusEffect (not useEffect): re-fetches whenever this tab regains focus, so a site
  // added/removed or an assessment taken elsewhere shows up here too.
  useFocusEffect(
    useCallback(() => {
      if (!activeUserId) return;
      refetchAll();
      // POEM/RECAP always show their full history — sparse weekly data is most useful seen in
      // full, so these two ignore any range picker entirely (see ScoreOverTime's
      // showsFullHistory note). No date bound passed at all — getPoemSeries/getRecapSeries
      // return every real row when from/to are omitted, so "full history" is whatever the
      // earliest/latest actual entries are, not a guessed-wide date constant.
      getPoemSeries(db, activeUserId).then(setPoemSeries);
      getRecapSeries(db, activeUserId).then(setRecapSeries);
    }, [activeUserId, refetchAll])
  );

  const handleEdit = (chart: CustomChart) => setSheetTarget(chart);

  const handleDuplicate = async (chart: CustomChart) => {
    if (!activeUserId) return;
    await createCustomChart(db, activeUserId, `${chart.title} (copy)`, chart.config);
    await refetchAll();
  };

  const handleMove = async (chart: CustomChart, direction: -1 | 1) => {
    if (!activeUserId) return;
    const index = customCharts.findIndex((c) => c.id === chart.id);
    const swapWith = index + direction;
    if (index === -1 || swapWith < 0 || swapWith >= customCharts.length) return;
    const reordered = [...customCharts];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    await reorderCustomCharts(db, activeUserId, reordered.map((c) => c.id));
    await refetchAll();
  };

  const handleDelete = (chart: CustomChart) => {
    Alert.alert('Delete this chart?', `"${chart.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await softDeleteCustomChart(db, chart.id);
          await refetchAll();
          setSnackbar({
            message: `Deleted "${chart.title}"`,
            actionLabel: 'Undo',
            onAction: async () => {
              await restoreCustomChart(db, chart.id);
              await refetchAll();
            },
          });
        },
      },
    ]);
  };

  const menuIndex = menuChart ? customCharts.findIndex((c) => c.id === menuChart.id) : -1;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
        <AppText variant="h1" color={colors.accent}>
          Insights
        </AppText>
        <AppText variant="body" color={colors.textSecondary}>
          A look back at what you've logged. Everything here stays on your device — nothing is
          sent anywhere.
        </AppText>

        <SeverityOverTimeChart sites={sites} colorById={colorById} />
        <PoemTrendChart data={poemSeries} />
        <RecapTrendChart data={recapSeries} />

        {customCharts.map((chart) => (
          <OverlayCard key={chart.id} chart={chart} onOptionsPress={setMenuChart} />
        ))}

        {customCharts.length === 0 ? (
          <AppText variant="body" color={colors.textSecondary}>
            Build your own view — compare a site against a trigger, or see how stress lines up
            with a flare.
          </AppText>
        ) : null}

        <Pressable
          onPress={() => setSheetTarget('create')}
          style={styles.addChartButton}
          accessibilityRole="button"
          accessibilityLabel="Add a chart"
        >
          <Ionicons name="add" size={20} color={colors.primary} />
          <AppText variant="label" color={colors.primary}>
            Add a chart
          </AppText>
        </Pressable>

        <ExportSection />
      </ScrollView>

      <LogFab />

      <ChartConfigSheet target={sheetTarget} onClose={() => setSheetTarget(null)} onSaved={refetchAll} />
      <ChartOptionsSheet
        chart={menuChart}
        isFirst={menuIndex <= 0}
        isLast={menuIndex === customCharts.length - 1}
        onClose={() => setMenuChart(null)}
        onEdit={() => menuChart && handleEdit(menuChart)}
        onDuplicate={() => menuChart && handleDuplicate(menuChart)}
        onMoveUp={() => menuChart && handleMove(menuChart, -1)}
        onMoveDown={() => menuChart && handleMove(menuChart, 1)}
        onDelete={() => menuChart && handleDelete(menuChart)}
      />
      <Snackbar
        message={snackbar?.message ?? null}
        actionLabel={snackbar?.actionLabel}
        onAction={() => snackbar?.onAction()}
        onDismiss={() => setSnackbar(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  addChartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
});
