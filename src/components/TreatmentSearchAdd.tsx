import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import {
  getTreatmentSearchResults,
  type SavedTreatmentForMatch,
  type TreatmentMatch,
  type TreatmentSearchResult,
} from '../lib/manageTreatments';
import { METHOD_LABELS, TYPE_LABELS } from '../lib/treatmentDisplay';
import { AppText } from './AppText';

interface TreatmentSearchAddProps {
  /** The user's own saved treatments — tier 1 of the search (see getTreatmentSearchResults). */
  existingTreatments: SavedTreatmentForMatch[];
  onSelectMatch: (match: TreatmentMatch) => void;
  onAddFreeTyped: (name: string) => void;
  /** Subtitle shown under an already-saved match, e.g. the Log screen's
   * today-scoped "Checked for today" vs "check it?". Defaults to a
   * day-agnostic caption for callers with no such concept (onboarding). */
  describeSavedMatch?: (treatmentId: string) => string;
}

/** Name-first type-to-filter add flow: the user's saved treatments, then the
 * library, then (only if both are empty) a fuzzy "Did you mean?" — with a
 * free-typed Add always available as the last option. Shared by the Log
 * screen's "+ Add treatment" and onboarding's medication step, so both add
 * treatments the same way. */
export function TreatmentSearchAdd({
  existingTreatments,
  onSelectMatch,
  onAddFreeTyped,
  describeSavedMatch,
}: TreatmentSearchAddProps) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');

  const trimmedQuery = query.trim();
  const results: TreatmentSearchResult[] = trimmedQuery
    ? getTreatmentSearchResults(query, existingTreatments)
    : [];

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
              {describeSavedMatch?.(match.treatmentId) ?? 'You already track this — select it?'}
            </AppText>
          </View>
        </Pressable>
      );
    }

    const { entry, matchedName } = match;
    const genericNamePrefix = matchedName !== entry.name ? `${entry.name} · ` : '';
    return (
      <Pressable
        key={key}
        onPress={() => handleSelectMatch(match)}
        style={styles.resultRow}
        accessibilityRole="button"
      >
        <View style={styles.resultTextColumn}>
          <AppText variant="body">{suggestion ? `Did you mean ${matchedName}?` : matchedName}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {genericNamePrefix}
            {TYPE_LABELS[entry.type]} · {METHOD_LABELS[entry.method]}
          </AppText>
        </View>
      </Pressable>
    );
  };

  if (!adding) {
    return (
      <Pressable onPress={() => setAdding(true)} accessibilityRole="button">
        <AppText variant="label" color={colors.primary}>
          + Add treatment
        </AppText>
      </Pressable>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
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
