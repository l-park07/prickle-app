import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { formatLongDate } from '../../lib/calendarMath';
import { CATEGORY_LABELS, type ActiveObservation } from '../../lib/manageTriggers';
import { AppText } from '../AppText';
import { Card } from '../Card';

interface CurrentlyWatchingCardProps {
  observation: ActiveObservation;
  onEndEarly: (experimentId: string) => void;
}

/** One active observation window — section A of the Triggers tab. */
export function CurrentlyWatchingCard({ observation, onEndEarly }: CurrentlyWatchingCardProps) {
  const confirmEnd = () => {
    Alert.alert(
      'End this observation early?',
      `"${observation.label}" will go back to being a known trigger, without the watch window.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End early', style: 'destructive', onPress: () => onEndEarly(observation.experimentId) },
      ]
    );
  };

  return (
    <Card style={styles.card}>
      <View style={styles.textColumn}>
        <AppText variant="body">{observation.label}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {CATEGORY_LABELS[observation.category]}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {formatLongDate(observation.startDate)} → {formatLongDate(observation.endDate)}
        </AppText>
      </View>
      <Pressable onPress={confirmEnd} accessibilityRole="button">
        <AppText variant="label" color={colors.textSecondary}>
          End early
        </AppText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
});
