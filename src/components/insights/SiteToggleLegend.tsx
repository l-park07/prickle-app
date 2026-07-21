import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { colors, radius, spacing } from '../../app/theme';
import { AppText } from '../AppText';

interface SiteToggleLegendProps {
  /** Already filtered down to sites with an assigned color (see chartTheme.ts's assignSiteColors)
   *  — every site passed here is always toggleable, no further capping happens in this component. */
  sites: { id: string; name: string }[];
  colorById: Record<string, string>;
  activeSiteIds: string[];
  onChange: (nextActiveSiteIds: string[]) => void;
}

/** Multi-select "which sites' lines are showing" legend — a colored swatch, the site's name, and a
 * switch per site. Reused by the severity chart's control panel today; any future chart sharing
 * the same site selection should reuse this component rather than rebuilding the row style. */
export function SiteToggleLegend({ sites, colorById, activeSiteIds, onChange }: SiteToggleLegendProps) {
  if (sites.length === 0) return null;

  const toggle = (id: string) => {
    const isActive = activeSiteIds.includes(id);
    onChange(isActive ? activeSiteIds.filter((x) => x !== id) : [...activeSiteIds, id]);
  };

  return (
    <View style={styles.list}>
      {sites.map((site) => {
        const active = activeSiteIds.includes(site.id);
        const color = colorById[site.id];
        return (
          <Pressable key={site.id} onPress={() => toggle(site.id)} style={styles.row} accessibilityRole="switch" accessibilityState={{ checked: active }}>
            <View style={styles.label}>
              <View style={[styles.swatch, { backgroundColor: color }]} />
              <AppText variant="body" color={colors.textPrimary}>
                {site.name}
              </AppText>
            </View>
            <Switch value={active} onValueChange={() => toggle(site.id)} trackColor={{ true: color, false: colors.border }} />
          </Pressable>
        );
      })}
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
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: radius.sm,
  },
});
