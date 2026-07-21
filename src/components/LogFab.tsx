import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../app/theme';
import { todayISO } from '../lib/calendarMath';

// Mirrors expo-router's internal TABBAR_HEIGHT_UIKIT (see
// build/react-navigation/bottom-tabs/views/BottomTabBar.js). The tab bar's
// real rendered height is this plus the bottom safe-area inset, since our
// tabBarStyle never sets an explicit height. Update this if it ever does.
const TAB_BAR_BASE_HEIGHT = -15;
const FAB_SIZE = 60;

/**
 * Floating "Log" entry point, positioned above the tab bar on the right
 * instead of living inside the tab bar row.
 */
export function LogFab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/log', params: { date: todayISO() } })
      }
      accessibilityRole="button"
      accessibilityLabel="Log"
      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
      style={[
        styles.fab,
        { bottom: TAB_BAR_BASE_HEIGHT + insets.bottom + spacing.sm },
      ]}
    >
      <Ionicons name="add" size={32} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.md,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
