import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../app/theme';
import { findCommonName } from '../../../content/treatmentLibrary';
import type { DayEntryMedication } from '../../lib/chartSelectors';
import type { TreatmentDetails, TreatmentMatch } from '../../lib/manageTreatments';
import { TYPE_BADGE, formatTreatmentSummary } from '../../lib/treatmentDisplay';
import { AppText } from '../AppText';
import { TreatmentDetailsEditor } from '../TreatmentDetailsEditor';
import { TreatmentSearchAdd } from '../TreatmentSearchAdd';

interface OnboardingMedicationsStepProps {
  medications: DayEntryMedication[];
  onSelectMatch: (match: TreatmentMatch) => void;
  onAddFreeTyped: (name: string) => void;
  onRemoveMedication: (id: string) => void;
  onUpdateDetails: (medicationId: string, details: TreatmentDetails) => void;
}

/** Step 3 (0-indexed) — establishes the master medication list, on the same
 * library-search add flow and expandable details editor as the Log screen. */
export function OnboardingMedicationsStep({
  medications,
  onSelectMatch,
  onAddFreeTyped,
  onRemoveMedication,
  onUpdateDetails,
}: OnboardingMedicationsStepProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <AppText variant="h2">Anything you use regularly?</AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Creams, antihistamines, anything else — you can add more anytime.
      </AppText>

      {medications.length > 0 ? (
        <View style={styles.list}>
          {medications.map((medication) => {
            const expanded = expandedId === medication.id;
            const summary = formatTreatmentSummary(medication);
            const badge = medication.type ? TYPE_BADGE[medication.type] : null;
            const commonName = findCommonName(medication.name);
            const label = commonName ? `${medication.name} (${commonName})` : medication.name;
            return (
              <View key={medication.id} style={styles.medicationBlock}>
                <View style={styles.row}>
                  <Pressable
                    onPress={() => setExpandedId(expanded ? null : medication.id)}
                    style={styles.rowTextColumn}
                    accessibilityRole="button"
                  >
                    <View style={styles.labelRow}>
                      <AppText variant="body" style={styles.rowLabel}>
                        {label}
                      </AppText>
                      {badge ? (
                        <View style={[styles.badge, badge.variant === 'muted' && styles.badgeMuted]}>
                          <AppText
                            variant="caption"
                            color={badge.variant === 'muted' ? colors.textSecondary : colors.textInverse}
                          >
                            {badge.label}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                    <AppText variant="caption" color={summary ? colors.textSecondary : colors.primary}>
                      {summary ?? 'Add details'}
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => onRemoveMedication(medication.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${medication.name}`}
                    hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
                {expanded ? (
                  <TreatmentDetailsEditor
                    treatment={medication}
                    onChange={(details) => onUpdateDetails(medication.id, details)}
                    onClose={() => setExpandedId(null)}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <TreatmentSearchAdd
        existingTreatments={medications.map((m) => ({ id: m.id, name: m.name }))}
        onSelectMatch={onSelectMatch}
        onAddFreeTyped={onAddFreeTyped}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  medicationBlock: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTextColumn: {
    flex: 1,
  },
  rowLabel: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeMuted: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
