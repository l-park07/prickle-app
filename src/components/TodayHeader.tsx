import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../app/theme';
import { formatFriendlyDate, shiftISODate } from '../lib/calendarMath';
import { AppText } from './AppText';

interface TodayHeaderProps {
  date: string;
  onChangeDate: (date: string) => void;
}

/** Today's "< Previous / [Date] / Next >" nav — day-level sibling of MonthCalendar's month nav. */
export function TodayHeader({ date, onChangeDate }: TodayHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        onPress={() => onChangeDate(shiftISODate(date, -1))}
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        style={styles.navButton}
      >
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <AppText variant="h2" style={styles.navLabel} numberOfLines={1}>
        {formatFriendlyDate(date)}
      </AppText>
      <Pressable
        onPress={() => onChangeDate(shiftISODate(date, 1))}
        accessibilityRole="button"
        accessibilityLabel="Next day"
        hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
        style={styles.navButton}
      >
        <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  navButton: {
    width: 32,
    alignItems: 'center',
  },
  navLabel: {
    flex: 1,
    textAlign: 'center',
  },
});
