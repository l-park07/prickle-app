import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { findCommonName } from '../../content/treatmentLibrary';
import { daysBetween, formatLongDate, todayISO } from '../lib/calendarMath';
import type { DayEntryMedication } from '../lib/chartSelectors';
import { getRestEndDate, type TreatmentDetails, type TreatmentMatch } from '../lib/manageTreatments';
import { TYPE_BADGE, formatTreatmentSummary } from '../lib/treatmentDisplay';
import { AppText } from './AppText';
import { LogCheckboxRow } from './LogCheckboxRow';
import { TreatmentDetailsEditor } from './TreatmentDetailsEditor';
import { TreatmentSearchAdd } from './TreatmentSearchAdd';

interface LogTreatmentsSectionProps {
  treatments: DayEntryMedication[];
  onToggle: (id: string) => void;
  onSelectMatch: (match: TreatmentMatch) => void;
  onAddFreeTyped: (name: string) => void;
  onRemoveTreatment: (id: string) => void;
  onUpdateDetails: (treatmentId: string, details: TreatmentDetails) => void;
  onStartRest: (treatmentId: string) => void;
  onCompleteRest: (treatmentId: string) => void;
}

/** "Resting · 2 days left (can start July 23rd)" — daysLeft is always >= 1 by construction
 * (the caller only renders this before the rest period's end date). */
function formatRestingStatus(daysLeft: number, restEnd: string): string {
  const unit = daysLeft === 1 ? 'day' : 'days';
  return `Resting · ${daysLeft} ${unit} left (can start ${formatLongDate(restEnd)})`;
}

/** Checklist of the user's own treatments plus a name-first type-to-filter
 * add flow: the user's saved treatments, then the library, then (only if
 * both are empty) a fuzzy "Did you mean?" — with a free-typed Add always
 * available as the last option. */
export function LogTreatmentsSection({
  treatments,
  onToggle,
  onSelectMatch,
  onAddFreeTyped,
  onRemoveTreatment,
  onUpdateDetails,
  onStartRest,
  onCompleteRest,
}: LogTreatmentsSectionProps) {
  const [expandedTreatmentId, setExpandedTreatmentId] = useState<string | null>(null);
  // Ids whose rest period has just ended — drives the dismissible "Rest complete" banner
  // independently of `treatments`, since onCompleteRest clears restStartedAt right away.
  const [justCompletedRestIds, setJustCompletedRestIds] = useState<Set<string>>(new Set());

  // Lazily detects a rest period ending whenever this screen is open on/after its end date —
  // there's no background job (nothing in this app runs off-device or while it's closed).
  useEffect(() => {
    const today = todayISO();
    for (const treatment of treatments) {
      const restEnd = getRestEndDate(treatment);
      if (restEnd && today >= restEnd && !justCompletedRestIds.has(treatment.id)) {
        onCompleteRest(treatment.id);
        setJustCompletedRestIds((prev) => new Set(prev).add(treatment.id));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatments]);

  const dismissRestComplete = (treatmentId: string) => {
    setJustCompletedRestIds((prev) => {
      const next = new Set(prev);
      next.delete(treatmentId);
      return next;
    });
  };

  const confirmRemove = (treatment: DayEntryMedication) => {
    Alert.alert(
      'Remove this treatment?',
      `"${treatment.name}" will no longer appear in your daily log.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemoveTreatment(treatment.id) },
      ]
    );
  };

  const describeSavedMatch = (treatmentId: string) => {
    const alreadyChecked = treatments.find((t) => t.id === treatmentId)?.checked ?? false;
    return alreadyChecked ? 'Checked for today' : 'You already track this — check it?';
  };

  const hitSlop = { top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm };

  /** One of: just-completed banner, resting status, "Start rest" action, or nothing (no cycle
   * configured) — mutually exclusive, in that priority order. */
  const renderRestStatus = (treatment: DayEntryMedication) => {
    if (justCompletedRestIds.has(treatment.id)) {
      return (
        <View style={styles.restRow}>
          <AppText variant="caption" color={colors.textSecondary}>
            Rest complete — resume when you need it
          </AppText>
          <Pressable
            onPress={() => dismissRestComplete(treatment.id)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            hitSlop={hitSlop}
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      );
    }

    const restEnd = getRestEndDate(treatment);
    if (restEnd) {
      const daysLeft = daysBetween(todayISO(), restEnd);
      return (
        <AppText variant="caption" color={colors.textSecondary}>
          {formatRestingStatus(daysLeft, restEnd)}
        </AppText>
      );
    }

    if (treatment.restCount && treatment.restUnit) {
      return (
        <Pressable
          onPress={() => onStartRest(treatment.id)}
          accessibilityRole="button"
          style={styles.startRestAction}
        >
          <Ionicons name="moon-outline" size={16} color={colors.primary} />
          <AppText variant="label" color={colors.primary}>
            Start rest
          </AppText>
        </Pressable>
      );
    }

    return null;
  };

  return (
    <View style={styles.section}>
      <AppText variant="title">Treatments</AppText>

      {treatments.length === 0 ? (
        <AppText variant="caption" color={colors.textSecondary}>
          No treatments set up yet
        </AppText>
      ) : (
        treatments.map((treatment) => {
          const expanded = expandedTreatmentId === treatment.id;
          const summary = formatTreatmentSummary(treatment);
          const badge = treatment.type ? TYPE_BADGE[treatment.type] : null;
          const commonName = findCommonName(treatment.name);
          const label = commonName ? `${treatment.name} (${commonName})` : treatment.name;
          return (
            <View key={treatment.id} style={styles.treatmentBlock}>
              <View style={styles.row}>
                <View style={styles.checkboxWrap}>
                  <LogCheckboxRow
                    label={label}
                    checked={treatment.checked}
                    detail={summary ?? 'Add details'}
                    detailColor={summary ? colors.textSecondary : colors.primary}
                    badge={badge?.label}
                    badgeVariant={badge?.variant}
                    onToggle={() => onToggle(treatment.id)}
                    onPress={() => setExpandedTreatmentId(expanded ? null : treatment.id)}
                  />
                  {renderRestStatus(treatment)}
                </View>
                <Pressable
                  onPress={() => confirmRemove(treatment)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${treatment.name}`}
                  hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
              {expanded ? (
                <TreatmentDetailsEditor
                  treatment={treatment}
                  onChange={(details) => onUpdateDetails(treatment.id, details)}
                  onClose={() => setExpandedTreatmentId(null)}
                />
              ) : null}
            </View>
          );
        })
      )}

      <TreatmentSearchAdd
        existingTreatments={treatments.map((t) => ({ id: t.id, name: t.name }))}
        onSelectMatch={onSelectMatch}
        onAddFreeTyped={onAddFreeTyped}
        describeSavedMatch={describeSavedMatch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  treatmentBlock: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkboxWrap: {
    flex: 1,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  startRestAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
