import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../../app/theme';
import type { DayEntryTrigger } from '../../lib/chartSelectors';
import {
  CATEGORY_LABELS,
  TRIGGER_CATEGORY_OPTIONS,
  matchesTriggerSearch,
  type SearchableTrigger,
  type TriggerRowCategory,
} from '../../lib/manageTriggers';
import { AppText } from '../AppText';
import { OptionDropdown } from '../OptionDropdown';

interface OnboardingTriggersStepProps {
  triggers: DayEntryTrigger[];
  searchResults: SearchableTrigger[];
  onSelectSearchResult: (result: SearchableTrigger) => void;
  onAddCustomTrigger: (input: { label: string; category: TriggerRowCategory }) => void;
  onRemoveTrigger: (id: string) => void;
}

/**
 * Step 3 (0-indexed) — establishes the master trigger list via the same
 * type-to-filter search + add mechanism as the Log modal (getSearchableTriggers
 * / addKnownTrigger). These are known triggers only — no day is being logged
 * here, so nothing gets checked and no observation window is started.
 */
export function OnboardingTriggersStep({
  triggers,
  searchResults,
  onSelectSearchResult,
  onAddCustomTrigger,
  onRemoveTrigger,
}: OnboardingTriggersStepProps) {
  const [query, setQuery] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);
  const [customCategoryLabel, setCustomCategoryLabel] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const filteredResults = trimmedQuery
    ? searchResults.filter((r) => matchesTriggerSearch(r, trimmedQuery))
    : [];
  const noMatches = trimmedQuery.length > 0 && filteredResults.length === 0;

  const resetSearch = () => {
    setQuery('');
    setAddingCustom(false);
    setCustomCategoryLabel(null);
  };

  const handleSelectResult = (result: SearchableTrigger) => {
    onSelectSearchResult(result);
    resetSearch();
  };

  const handleStartCustom = () => {
    setAddingCustom(true);
  };

  const handleConfirmCustom = () => {
    const category = TRIGGER_CATEGORY_OPTIONS.find((o) => o.label === customCategoryLabel)?.id;
    if (!category || !trimmedQuery) return;
    onAddCustomTrigger({ label: trimmedQuery, category });
    resetSearch();
  };

  return (
    <View style={styles.container}>
      <AppText variant="h2">What tends to flare things up?</AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Common triggers you already know about. Nothing here is final.
      </AppText>

      {triggers.length > 0 ? (
        <View style={styles.list}>
          {triggers.map((trigger) => (
            <View key={trigger.id} style={styles.row}>
              <AppText variant="body" style={styles.rowLabel}>
                {trigger.name}
              </AppText>
              <Pressable
                onPress={() => onRemoveTrigger(trigger.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${trigger.name}`}
                hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search triggers…"
        placeholderTextColor={colors.textSecondary}
      />

      {filteredResults.length > 0 ? (
        <View style={styles.results}>
          {filteredResults.map((result) => (
            <Pressable
              key={result.key}
              onPress={() => handleSelectResult(result)}
              style={styles.resultRow}
              accessibilityRole="button"
            >
              <View style={styles.resultTextColumn}>
                <AppText variant="body">{result.label}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {CATEGORY_LABELS[result.category]}
                </AppText>
              </View>
              {result.added ? (
                <AppText variant="caption" color={colors.success}>
                  Added
                </AppText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {noMatches && !addingCustom ? (
        <View style={styles.noMatches}>
          <AppText variant="caption" color={colors.textSecondary}>
            No matches for "{trimmedQuery}"
          </AppText>
          <Pressable onPress={handleStartCustom} accessibilityRole="button">
            <AppText variant="label" color={colors.primary}>
              + Add "{trimmedQuery}" as a new trigger
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {addingCustom ? (
        <View style={styles.addForm}>
          <AppText variant="label">Add "{trimmedQuery}" as</AppText>
          <OptionDropdown
            label="Category"
            options={TRIGGER_CATEGORY_OPTIONS.map((o) => o.label)}
            value={customCategoryLabel}
            onChange={setCustomCategoryLabel}
          />
          <View style={styles.addFormButtons}>
            <Pressable onPress={resetSearch} accessibilityRole="button">
              <AppText variant="label" color={colors.textSecondary}>
                Cancel
              </AppText>
            </Pressable>
            <Pressable onPress={handleConfirmCustom} accessibilityRole="button">
              <AppText variant="label" color={colors.primary}>
                Add
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultTextColumn: {
    flex: 1,
  },
  noMatches: {
    gap: spacing.xs,
  },
  addForm: {
    gap: spacing.sm,
  },
  addFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
});
