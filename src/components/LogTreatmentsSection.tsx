import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import type { DeliveryMethod, TreatmentType, WindowUnit } from '../../content/treatmentLibrary';
import { daysBetween, formatLongDate, todayISO } from '../lib/calendarMath';
import type { DayEntryMedication } from '../lib/chartSelectors';
import {
  getRestEndDate,
  getTreatmentSearchResults,
  type TreatmentDetails,
  type TreatmentMatch,
  type TreatmentSearchResult,
} from '../lib/manageTreatments';
import { AppText } from './AppText';
import { LogCheckboxRow } from './LogCheckboxRow';
import { TreatmentDetailsEditor } from './TreatmentDetailsEditor';

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

const TYPE_LABELS: Record<TreatmentType, string> = {
  rx: 'Prescription',
  otc: 'OTC',
  both: 'Rx or OTC',
  therapy: 'Therapy',
};

const TYPE_BADGE: Record<TreatmentType, { label: string; variant: 'accent' | 'muted' }> = {
  rx: { label: 'Rx', variant: 'accent' },
  otc: { label: 'OTC', variant: 'muted' },
  both: { label: 'Rx or OTC', variant: 'muted' },
  therapy: { label: 'Therapy', variant: 'accent' },
};

const METHOD_LABELS: Record<DeliveryMethod, string> = {
  topical: 'Topical',
  oral: 'Oral',
  injectable: 'Injectable',
  phototherapy: 'Phototherapy',
  bath: 'Bath',
  other: 'Other',
};

function formatWindow(count: number, unit: WindowUnit): string {
  return `${count} ${count === 1 ? unit : `${unit}s`}`;
}

/** "5 days on / 2 weeks off", or null unless both sides of the cycle are set. */
function formatCycleSummary(treatment: DayEntryMedication): string | null {
  if (!treatment.activeCount || !treatment.activeUnit || !treatment.restCount || !treatment.restUnit) {
    return null;
  }
  return `${formatWindow(treatment.activeCount, treatment.activeUnit)} on / ${formatWindow(
    treatment.restCount,
    treatment.restUnit
  )} off`;
}

/** "Every 2 weeks", "As needed", "5 days on / 2 weeks off", or a combination — null if nothing's set. */
function formatScheduleSummary(treatment: DayEntryMedication): string | null {
  const parts: string[] = [];
  if (treatment.isPrn) {
    parts.push('As needed');
  } else if (treatment.cadenceEvery && treatment.cadenceUnit) {
    const unit = treatment.cadenceEvery === 1 ? treatment.cadenceUnit : `${treatment.cadenceUnit}s`;
    parts.push(`Every ${treatment.cadenceEvery} ${unit}`);
  }
  const cycle = formatCycleSummary(treatment);
  if (cycle) parts.push(cycle);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Row caption: "Topical · Every 1 day", "5 days on / 2 weeks off", or null when nothing's set
 * (the caller renders that case as a tappable "Add details" placeholder instead). */
function formatTreatmentSummary(treatment: DayEntryMedication): string | null {
  const parts = [
    treatment.deliveryMethod ? METHOD_LABELS[treatment.deliveryMethod] : null,
    formatScheduleSummary(treatment),
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : null;
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
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
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

  const trimmedQuery = query.trim();
  const results: TreatmentSearchResult[] = trimmedQuery
    ? getTreatmentSearchResults(
        query,
        treatments.map((t) => ({ id: t.id, name: t.name }))
      )
    : [];

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

  const resetAddFlow = () => {
    setAdding(false);
    setQuery('');
  };

  const handleSelectMatch = (match: TreatmentMatch) => {
    onSelectMatch(match);
    resetAddFlow();
  };

  const handleAddFreeTyped = () => {
    if (!trimmedQuery) return;
    onAddFreeTyped(trimmedQuery);
    resetAddFlow();
  };

  const matchKey = (match: TreatmentMatch) =>
    match.kind === 'saved' ? `saved-${match.treatmentId}` : `library-${match.entry.id}`;

  const renderMatchRow = (match: TreatmentMatch, key: string, suggestion: boolean) => {
    if (match.kind === 'saved') {
      const alreadyChecked = treatments.find((t) => t.id === match.treatmentId)?.checked ?? false;
      return (
        <Pressable
          key={key}
          onPress={() => handleSelectMatch(match)}
          style={styles.resultRow}
          accessibilityRole="button"
        >
          <View style={styles.resultTextColumn}>
            <AppText variant="body">{suggestion ? `Did you mean ${match.name}?` : match.name}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {alreadyChecked ? 'Checked for today' : 'You already track this — check it?'}
            </AppText>
          </View>
        </Pressable>
      );
    }

    const { entry } = match;
    return (
      <Pressable
        key={key}
        onPress={() => handleSelectMatch(match)}
        style={styles.resultRow}
        accessibilityRole="button"
      >
        <View style={styles.resultTextColumn}>
          <AppText variant="body">{suggestion ? `Did you mean ${entry.name}?` : entry.name}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {TYPE_LABELS[entry.type]} · {METHOD_LABELS[entry.method]}
          </AppText>
        </View>
      </Pressable>
    );
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
          return (
            <View key={treatment.id} style={styles.treatmentBlock}>
              <View style={styles.row}>
                <View style={styles.checkboxWrap}>
                  <LogCheckboxRow
                    label={treatment.name}
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
                />
              ) : null}
            </View>
          );
        })
      )}

      {adding ? (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Treatment name…"
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />

          {trimmedQuery ? (
            <View style={styles.results}>
              {results.map((result) =>
                result.kind === 'suggestion'
                  ? renderMatchRow(result.match, `suggestion-${matchKey(result.match)}`, true)
                  : renderMatchRow(result, matchKey(result), false)
              )}
              <Pressable onPress={handleAddFreeTyped} style={styles.resultRow} accessibilityRole="button">
                <AppText variant="label" color={colors.primary}>
                  + Add "{trimmedQuery}"
                </AppText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.addFormButtons}>
            <Pressable onPress={resetAddFlow} accessibilityRole="button">
              <AppText variant="label" color={colors.textSecondary}>
                Cancel
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} accessibilityRole="button">
          <AppText variant="label" color={colors.primary}>
            + Add treatment
          </AppText>
        </Pressable>
      )}
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
  addForm: {
    gap: spacing.sm,
  },
  addFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  input: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  results: {
    gap: spacing.xs,
  },
  resultRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultTextColumn: {
    flex: 1,
  },
});
