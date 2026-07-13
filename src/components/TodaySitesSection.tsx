import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import type { DayEntrySite } from '../lib/chartSelectors';
import { AppText } from './AppText';
import { SeverityBar } from './SeverityBar';

interface TodaySitesSectionProps {
  sites: DayEntrySite[];
}

/** Every active site for the day, each with its read-only SeverityBar (null score = not recorded). */
export function TodaySitesSection({ sites }: TodaySitesSectionProps) {
  return (
    <View style={styles.section}>
      <AppText variant="title">Sites</AppText>
      {sites.length === 0 ? (
        <AppText variant="caption" color={colors.textSecondary}>
          No sites set up yet
        </AppText>
      ) : (
        sites.map((site) => (
          <View key={site.id} style={styles.siteRow}>
            <AppText variant="label">{site.name}</AppText>
            <SeverityBar score={site.score} />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  siteRow: {
    gap: spacing.xs,
  },
});
