import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assignSiteColors } from '../../components/insights/chartTheme';
import { ExportSection } from '../../components/insights/ExportSection';
import { PoemTrendChart } from '../../components/insights/PoemTrendChart';
import { RecapTrendChart } from '../../components/insights/RecapTrendChart';
import { SeverityComparisonChart } from '../../components/insights/SeverityComparisonChart';
import { SeverityOverTimeChart } from '../../components/insights/SeverityOverTimeChart';
import { AppText } from '../../components/AppText';
import { LogFab } from '../../components/LogFab';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { getActiveSites, getPoemSeries, getRecapSeries } from '../../lib/chartSelectors';
import { db } from '../../lib/db';
import { colors, spacing } from '../theme';

export default function Insights() {
  const activeUserId = useActiveUserId();
  const insets = useSafeAreaInsets();

  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [poemSeries, setPoemSeries] = useState<{ weekStart: string; score: number }[]>([]);
  const [recapSeries, setRecapSeries] = useState<{ weekStart: string; score: number }[]>([]);

  const colorById = useMemo(() => assignSiteColors(sites), [sites]);

  // useFocusEffect (not useEffect): re-fetches whenever this tab regains focus, so a site
  // added/removed or an assessment taken elsewhere shows up here too. Sites/colors are shared
  // read-only data used by both the severity and comparison charts below — each chart owns its
  // own toggle selection, time range, and gap mode independently (see their own components).
  useFocusEffect(
    useCallback(() => {
      if (!activeUserId) return;
      getActiveSites(db, activeUserId).then(setSites);
      // POEM/RECAP always show their full history — sparse weekly data is most useful seen in
      // full, so these two ignore any range picker entirely (see ScoreOverTime's
      // showsFullHistory note). No date bound passed at all — getPoemSeries/getRecapSeries
      // return every real row when from/to are omitted, so "full history" is whatever the
      // earliest/latest actual entries are, not a guessed-wide date constant.
      getPoemSeries(db, activeUserId).then(setPoemSeries);
      getRecapSeries(db, activeUserId).then(setRecapSeries);
    }, [activeUserId])
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

        <SeverityOverTimeChart sites={sites} colorById={colorById} />
        <PoemTrendChart data={poemSeries} />
        <RecapTrendChart data={recapSeries} />
        <SeverityComparisonChart sites={sites} colorById={colorById} />
        <ExportSection />
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
