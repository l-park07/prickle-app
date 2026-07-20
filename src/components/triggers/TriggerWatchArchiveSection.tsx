import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { formatLongDate } from '../../lib/calendarMath';
import { CATEGORY_LABELS, type ObservationHistoryItem } from '../../lib/manageTriggers';
import { AppText } from '../AppText';
import { Card } from '../Card';

interface TriggerWatchArchiveSectionProps {
  observations: ObservationHistoryItem[];
  onSelect: (observation: ObservationHistoryItem) => void;
}

/** Past, reviewed watch windows — tapping one opens its notes overlay. */
export function TriggerWatchArchiveSection({ observations, onSelect }: TriggerWatchArchiveSectionProps) {
  if (observations.length === 0) return null;

  return (
    <View style={styles.section}>
      <AppText variant="title">Triggers Watch Archive</AppText>
      {observations.map((observation) => (
        <Pressable
          key={observation.experimentId}
          onPress={() => onSelect(observation)}
          accessibilityRole="button"
        >
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
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
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
