import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import { daysBetween, todayISO } from '../lib/calendarMath';
import { DayEntryTrigger } from '../lib/chartSelectors';
import {
  CATEGORY_LABELS,
  TRIGGER_CATEGORY_OPTIONS,
  matchesTriggerSearch,
  type SearchableTrigger,
  type TriggerRowCategory,
} from '../lib/manageTriggers';
import { AppText } from './AppText';
import { LogCheckboxRow } from './LogCheckboxRow';
import { OptionDropdown } from './OptionDropdown';

interface LogTriggersSectionProps {
  triggers: DayEntryTrigger[];
  searchResults: SearchableTrigger[];
  onToggle: (id: string) => void;
  onSelectSearchResult: (result: SearchableTrigger) => void;
  onAddCustomTrigger: (input: { label: string; category: TriggerRowCategory }) => void;
  onRemoveTrigger: (id: string) => void;
  onAddNote: (trigger: DayEntryTrigger) => void;
}

/**
 * Checklist of the user's own triggers (watched ones pinned to the top, with a
 * "Watching" marker) plus a type-to-filter search over the catalog ∪ the
 * user's list.
 */
export function LogTriggersSection({
  triggers,
  searchResults,
  onToggle,
  onSelectSearchResult,
  onAddCustomTrigger,
  onRemoveTrigger,
  onAddNote,
}: LogTriggersSectionProps) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);
  const [customCategoryLabel, setCustomCategoryLabel] = useState<string | null>(null);

  const sortedTriggers = [...triggers].sort((a, b) => Number(b.watched) - Number(a.watched));

  const trimmedQuery = query.trim();
  const filteredResults = trimmedQuery
    ? searchResults.filter((r) => matchesTriggerSearch(r, trimmedQuery))
    : [];
  const noMatches = trimmedQuery.length > 0 && filteredResults.length === 0;

  const confirmRemove = (trigger: DayEntryTrigger) => {
    Alert.alert(
      'Remove this trigger?',
      `"${trigger.name}" will no longer appear in your daily log.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemoveTrigger(trigger.id) },
      ]
    );
  };

  const resetAddFlow = () => {
    setAdding(false);
    setQuery('');
    setAddingCustom(false);
    setCustomCategoryLabel(null);
  };

  const handleSelectResult = (result: SearchableTrigger) => {
    onSelectSearchResult(result);
    resetAddFlow();
  };

  const handleStartCustom = () => {
    setAddingCustom(true);
  };

  const handleConfirmCustom = () => {
    const category = TRIGGER_CATEGORY_OPTIONS.find((o) => o.label === customCategoryLabel)?.id;
    if (!category || !trimmedQuery) return;
    onAddCustomTrigger({ label: trimmedQuery, category });
    resetAddFlow();
  };

  return (
    <View style={styles.section}>
      <AppText variant="title">Triggers</AppText>

      {sortedTriggers.length === 0 ? (
        <AppText variant="caption" color={colors.textSecondary}>
          No triggers set up yet
        </AppText>
      ) : (
        sortedTriggers.map((trigger) => (
          <View key={trigger.id} style={styles.row}>
            <View style={styles.checkboxWrap}>
              <LogCheckboxRow
                label={trigger.name}
                checked={trigger.checked}
                detail={CATEGORY_LABELS[trigger.category as TriggerRowCategory] ?? trigger.category}
                badge={trigger.watched ? 'Watching' : undefined}
                onToggle={() => onToggle(trigger.id)}
              />
              {trigger.watched && trigger.observationStart && trigger.observationEnd ? (
                <AppText variant="caption" color={colors.textSecondary}>
                  {Math.min(
                    daysBetween(trigger.observationStart, todayISO()) + 1,
                    daysBetween(trigger.observationStart, trigger.observationEnd)
                  )}{' '}
                  of {daysBetween(trigger.observationStart, trigger.observationEnd)} days observed
                </AppText>
              ) : null}
              {trigger.watched && trigger.experimentId ? (
                <Pressable
                  onPress={() => onAddNote(trigger)}
                  accessibilityRole="button"
                  style={styles.addNoteAction}
                >
                  <Ionicons name="clipboard-outline" size={16} color={colors.primary} />
                  <AppText variant="label" color={colors.primary}>
                    Add note
                  </AppText>
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={() => confirmRemove(trigger)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${trigger.name}`}
              hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        ))
      )}

      {adding ? (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search triggers…"
            placeholderTextColor={colors.textSecondary}
            autoFocus
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
                <Pressable onPress={resetAddFlow} accessibilityRole="button">
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
          ) : (
            <View style={styles.addFormButtons}>
              <Pressable onPress={resetAddFlow} accessibilityRole="button">
                <AppText variant="label" color={colors.textSecondary}>
                  Cancel
                </AppText>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} accessibilityRole="button">
          <AppText variant="label" color={colors.primary}>
            + Add trigger
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkboxWrap: {
    flex: 1,
  },
  addNoteAction: {
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
});
