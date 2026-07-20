import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { formatLongDate } from '../../lib/calendarMath';
import { CATEGORY_LABELS, type ActiveObservation } from '../../lib/manageTriggers';
import { AppText } from '../AppText';
import { Card } from '../Card';

interface CurrentlyWatchingCardProps {
  observation: ActiveObservation;
  onEndEarly: (experimentId: string) => void;
  onOpenNotes: (observation: ActiveObservation) => void;
  onAddNote: (observation: ActiveObservation) => void;
}

/** One active observation window — section A of the Triggers tab. Tap to view notes. */
export function CurrentlyWatchingCard({
  observation,
  onEndEarly,
  onOpenNotes,
  onAddNote,
}: CurrentlyWatchingCardProps) {
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
      <Pressable
        style={styles.row}
        onPress={() => onOpenNotes(observation)}
        accessibilityRole="button"
        accessibilityLabel={`View notes for ${observation.label}`}
      >
        <View style={styles.textColumn}>
          <AppText variant="body">{observation.label}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {CATEGORY_LABELS[observation.category]}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {formatLongDate(observation.startDate)} → {formatLongDate(observation.endDate)}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onAddNote(observation)}
          accessibilityRole="button"
          style={styles.addNoteAction}
        >
          <Ionicons name="clipboard-outline" size={16} color={colors.primary} />
          <AppText variant="label" color={colors.primary}>
            Add note
          </AppText>
        </Pressable>
        <Pressable onPress={confirmEnd} accessibilityRole="button">
          <AppText variant="label" color={colors.textSecondary}>
            End early
          </AppText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  addNoteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
