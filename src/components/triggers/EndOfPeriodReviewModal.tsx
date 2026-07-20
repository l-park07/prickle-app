import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, overlay, radius, spacing, typography } from '../../app/theme';
import { formatLongDate } from '../../lib/calendarMath';
import { CATEGORY_LABELS, type ObservationHistoryItem } from '../../lib/manageTriggers';
import { AppText } from '../AppText';
import { PrimaryButton } from '../PrimaryButton';

interface EndOfPeriodReviewModalProps {
  /** null = closed. The first item in the pending-review queue. */
  observation: ObservationHistoryItem | null;
  /** How many more (including this one) are waiting, so the user knows there's a queue. */
  remainingCount: number;
  onDismiss: () => void;
  onComplete: (input: { keepTrigger: boolean; note: string }) => void;
}

/**
 * Auto-opens on the Triggers tab whenever a watch window has ended and hasn't
 * been reviewed yet. Asks whether to keep the trigger on "Your triggers" and
 * offers a closing note, then hands off to completeObservationReview.
 */
export function EndOfPeriodReviewModal({
  observation,
  remainingCount,
  onDismiss,
  onComplete,
}: EndOfPeriodReviewModalProps) {
  const insets = useSafeAreaInsets();
  const [keepTrigger, setKeepTrigger] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    setKeepTrigger(true);
    setNote('');
  }, [observation?.experimentId]);

  return (
    <Modal visible={observation !== null} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        {observation ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <ScrollView contentContainerStyle={styles.content}>
              <AppText variant="title">Watch period finished</AppText>
              <View style={styles.headerText}>
                <AppText variant="h2">{observation.label}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {CATEGORY_LABELS[observation.category]}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  Watched {formatLongDate(observation.startDate)} → {formatLongDate(observation.endDate)}
                </AppText>
              </View>

              <View style={styles.field}>
                <AppText variant="label">Keep this on your triggers list?</AppText>
                <View style={styles.choiceRow}>
                  <Pressable
                    onPress={() => setKeepTrigger(true)}
                    accessibilityRole="button"
                    style={[styles.choice, keepTrigger ? styles.choiceSelected : null]}
                  >
                    <AppText variant="label" color={keepTrigger ? colors.onPrimary : colors.textPrimary}>
                      Keep it
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => setKeepTrigger(false)}
                    accessibilityRole="button"
                    style={[styles.choice, !keepTrigger ? styles.choiceSelected : null]}
                  >
                    <AppText variant="label" color={!keepTrigger ? colors.onPrimary : colors.textPrimary}>
                      Remove it
                    </AppText>
                  </Pressable>
                </View>
              </View>

              <View style={styles.field}>
                <AppText variant="label">Add a note for this observation (optional)</AppText>
                <TextInput
                  style={styles.input}
                  value={note}
                  onChangeText={setNote}
                  placeholder="What did you notice over this period?"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>

              {remainingCount > 1 ? (
                <AppText variant="caption" color={colors.textSecondary}>
                  {remainingCount - 1} more waiting after this one
                </AppText>
              ) : null}

              <PrimaryButton label="Save" onPress={() => onComplete({ keepTrigger, note })} />
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: overlay,
  },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    gap: 2,
  },
  field: {
    gap: spacing.xs,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  choice: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
