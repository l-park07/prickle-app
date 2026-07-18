import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, overlay, radius, spacing } from '../../app/theme';
import { TRIGGER_CATALOG } from '../../../content/triggerCatalog';
import { formatLongDate, shiftISODate, todayISO } from '../../lib/calendarMath';
import {
  CATEGORY_LABELS,
  MIN_OBSERVATION_DAYS,
  type TriggerRowCategory,
} from '../../lib/manageTriggers';
import { AppText } from '../AppText';
import { PrimaryButton } from '../PrimaryButton';

export interface TriggerDetailTarget {
  /** null if this trigger isn't on the user's list yet. */
  triggerId: string | null;
  /** Catalog slug, or null for a custom trigger (no blurb/detail/examples to show). */
  slug: string | null;
  label: string;
  category: TriggerRowCategory;
  watched: boolean;
}

interface TriggerDetailModalProps {
  /** null = closed. */
  target: TriggerDetailTarget | null;
  /** B's "Start watching" jumps straight to the window step; C's row tap starts at detail. */
  initialStep?: 'detail' | 'window';
  activeObservationCount: number;
  onClose: () => void;
  onAddToMyTriggers: () => void;
  onConfirmWatch: (input: { startDate: string; durationDays: number }) => void;
}

/**
 * Detail/configure sheet, opened from a catalog row (Section C) or "Start
 * watching" (Section B). Two steps in one modal so both entry points reuse
 * the same window-config UI rather than duplicating it.
 */
export function TriggerDetailModal({
  target,
  initialStep = 'detail',
  activeObservationCount,
  onClose,
  onAddToMyTriggers,
  onConfirmWatch,
}: TriggerDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'detail' | 'window'>(initialStep);
  const [startOffsetDays, setStartOffsetDays] = useState(0);
  const [durationDays, setDurationDays] = useState(MIN_OBSERVATION_DAYS);

  // slug/label only (never triggerId) — triggerId can change mid-flow when
  // "Add to my triggers" fills it in, and that must NOT count as a new target.
  const targetKey = target ? target.slug ?? target.label : null;
  useEffect(() => {
    if (targetKey === null) return;
    setStep(initialStep);
    setStartOffsetDays(0);
    setDurationDays(MIN_OBSERVATION_DAYS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const catalogTrigger = target?.slug
    ? TRIGGER_CATALOG.flatMap((c) => c.triggers).find((t) => t.id === target.slug)
    : undefined;

  const startDate = shiftISODate(todayISO(), startOffsetDays);
  const endDate = shiftISODate(startDate, durationDays);

  const handleConfirm = () => {
    onConfirmWatch({ startDate, durationDays });
  };

  return (
    <Modal visible={target !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        {target ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <AppText variant="h2">{target.label}</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {CATEGORY_LABELS[target.category]}
                  </AppText>
                </View>
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              {step === 'detail' ? (
                <>
                  {catalogTrigger ? (
                    <View style={styles.detailText}>
                      <AppText variant="body">{catalogTrigger.detail}</AppText>
                      {catalogTrigger.examples?.length ? (
                        <AppText variant="caption" color={colors.textSecondary}>
                          Examples: {catalogTrigger.examples.join(', ')}
                        </AppText>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.actions}>
                    {!target.triggerId ? (
                      <PrimaryButton label="Add to my triggers" onPress={onAddToMyTriggers} />
                    ) : null}
                    {!target.watched ? (
                      <Pressable onPress={() => setStep('window')} accessibilityRole="button">
                        <AppText variant="label" color={colors.primary}>
                          Start watching
                        </AppText>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              ) : (
                <>
                  <AppText variant="body" color={colors.textSecondary}>
                    Not "avoid and reintroduce" — just paying closer attention for a while.
                  </AppText>

                  <View style={styles.stepperRow}>
                    <AppText variant="label" style={styles.stepperLabel}>
                      Start
                    </AppText>
                    <Pressable
                      onPress={() => setStartOffsetDays((d) => Math.max(0, d - 1))}
                      disabled={startOffsetDays === 0}
                      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={24}
                        color={startOffsetDays === 0 ? colors.border : colors.primary}
                      />
                    </Pressable>
                    <AppText variant="body" style={styles.stepperValue}>
                      {startOffsetDays === 0 ? 'Today' : formatLongDate(startDate)}
                    </AppText>
                    <Pressable
                      onPress={() => setStartOffsetDays((d) => d + 1)}
                      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                    >
                      <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                    </Pressable>
                  </View>

                  <View style={styles.stepperRow}>
                    <AppText variant="label" style={styles.stepperLabel}>
                      Duration
                    </AppText>
                    <Pressable
                      onPress={() => setDurationDays((d) => Math.max(MIN_OBSERVATION_DAYS, d - 1))}
                      disabled={durationDays === MIN_OBSERVATION_DAYS}
                      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={24}
                        color={durationDays === MIN_OBSERVATION_DAYS ? colors.border : colors.primary}
                      />
                    </Pressable>
                    <AppText variant="body" style={styles.stepperValue}>
                      {durationDays} days
                    </AppText>
                    <Pressable
                      onPress={() => setDurationDays((d) => d + 1)}
                      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                    >
                      <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                    </Pressable>
                  </View>

                  <AppText variant="caption" color={colors.textSecondary}>
                    Ends {formatLongDate(endDate)}
                  </AppText>

                  {activeObservationCount >= 2 ? (
                    <AppText variant="caption" color={colors.textSecondary}>
                      Watching fewer things tends to work better than watching everything.
                    </AppText>
                  ) : null}

                  <PrimaryButton label="Start watching" onPress={handleConfirm} />
                </>
              )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  detailText: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperLabel: {
    width: 70,
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
  },
});
