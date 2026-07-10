import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';

const DISMISSED_KEY = 'home.calendarLegendHintDismissed';

/** One-line first-run hint pointing at the calendar's ⓘ legend button; dismissal is persisted locally. */
export function CalendarHint() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((value) => setDismissed(value === 'true'));
  }, []);

  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, 'true');
  };

  if (dismissed !== false) return null;

  return (
    <View style={styles.container}>
      <AppText variant="caption" color={colors.textSecondary} style={styles.text}>
        Each square is your most affected site that day. Tap ⓘ to learn more.
      </AppText>
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss hint"
        hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
      >
        <Ionicons name="close" size={16} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
  },
});
