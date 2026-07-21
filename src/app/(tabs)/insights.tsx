import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChartCard } from '../../components/insights/ChartCard';
import { defaultInsightsState, InsightsControlPanel, type InsightsState } from '../../components/insights/InsightsControlPanel';
import { PoemTrendChart } from '../../components/insights/PoemTrendChart';
import { RecapTrendChart } from '../../components/insights/RecapTrendChart';
import { AppText } from '../../components/AppText';
import { LogFab } from '../../components/LogFab';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { getActiveSites, getPoemSeries, getRecapSeries } from '../../lib/chartSelectors';
import { db } from '../../lib/db';
import { colors, spacing } from '../theme';

export default function Insights() {
  const activeUserId = useActiveUserId();
  const insets = useSafeAreaInsets();

  const [state, setState] = useState<InsightsState>(() => defaultInsightsState([]));
  const [poemSeries, setPoemSeries] = useState<{ weekStart: string; score: number }[]>([]);
  const [recapSeries, setRecapSeries] = useState<{ weekStart: string; score: number }[]>([]);

  // useFocusEffect (not useEffect): re-fetches whenever this tab regains focus, so a site
  // added/removed or an assessment taken elsewhere shows up here too.
  useFocusEffect(
    useCallback(() => {
      if (!activeUserId) return;
      getActiveSites(db, activeUserId).then((sites) => {
        setState((prev) => ({ ...prev, activeSiteIds: sites.map((s) => s.id) }));
      });
      // POEM/RECAP always show their full history — sparse weekly data is most useful seen in
      // full, so these two ignore the range picker's from/to entirely (see ScoreOverTime's
      // showsFullHistory note). No date bound passed at all — getPoemSeries/getRecapSeries
      // return every real row when from/to are omitted, so "full history" is whatever the
      // earliest/latest actual entries are, not a guessed-wide date constant.
      getPoemSeries(db, activeUserId).then(setPoemSeries);
      getRecapSeries(db, activeUserId).then(setRecapSeries);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeUserId, state.from, state.to])
  );

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

        <InsightsControlPanel value={state} onChange={setState} />

        <ChartCard title="Severity over time" />
        <ChartCard title="Mood & stress" />
        <ChartCard title="Trigger correlation" />
        <PoemTrendChart data={poemSeries} gapMode={state.gapMode} />
        <RecapTrendChart data={recapSeries} gapMode={state.gapMode} />
      </ScrollView>

      <LogFab />
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
});
