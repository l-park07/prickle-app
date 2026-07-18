import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../../app/theme';
import {
  CATEGORY_LABELS,
  TRIGGER_CATEGORY_OPTIONS,
  type SearchableTrigger,
  type TriggerRowCategory,
} from '../../lib/manageTriggers';
import { AppText } from '../AppText';
import { OptionDropdown } from '../OptionDropdown';

interface YourTriggersSectionProps {
  /** The user's own triggers only (callers pass searchableTriggers.filter(r => r.added)). */
  triggers: SearchableTrigger[];
  onStartWatching: (trigger: SearchableTrigger) => void;
  onRemove: (triggerId: string) => void;
  onAddCustomTrigger: (input: { label: string; category: TriggerRowCategory }) => void;
}

/** Section B — the flat management list of every trigger the user has added, known or watched. */
export function YourTriggersSection({
  triggers,
  onStartWatching,
  onRemove,
  onAddCustomTrigger,
}: YourTriggersSectionProps) {
  const [adding, setAdding] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [name, setName] = useState('');

  const sorted = [...triggers].sort((a, b) => a.label.localeCompare(b.label));

  const confirmRemove = (trigger: SearchableTrigger) => {
    if (!trigger.triggerId) return;
    Alert.alert(
      'Remove this trigger?',
      `"${trigger.label}" will no longer appear in your trigger list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove(trigger.triggerId!) },
      ]
    );
  };

  const resetAddFlow = () => {
    setAdding(false);
    setCategoryLabel(null);
    setName('');
  };

  const handleConfirmAdd = () => {
    const category = TRIGGER_CATEGORY_OPTIONS.find((o) => o.label === categoryLabel)?.id;
    const label = name.trim();
    if (!category || !label) return;
    onAddCustomTrigger({ label, category });
    resetAddFlow();
  };

  return (
    <View style={styles.section}>
      <AppText variant="title">Your triggers</AppText>

      {sorted.length === 0 ? (
        <AppText variant="caption" color={colors.textSecondary}>
          Nothing on your list yet
        </AppText>
      ) : (
        sorted.map((trigger) => (
          <View key={trigger.key} style={styles.row}>
            <View style={styles.textColumn}>
              <AppText variant="body">{trigger.label}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {CATEGORY_LABELS[trigger.category]}
              </AppText>
            </View>
            {trigger.watched ? (
              <View style={styles.badge}>
                <AppText variant="caption" color={colors.textInverse}>
                  Watching
                </AppText>
              </View>
            ) : (
              <Pressable onPress={() => onStartWatching(trigger)} accessibilityRole="button">
                <AppText variant="label" color={colors.primary}>
                  Start watching
                </AppText>
              </Pressable>
            )}
            <Pressable
              onPress={() => confirmRemove(trigger)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${trigger.label}`}
              hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        ))
      )}

      {adding ? (
        <View style={styles.addForm}>
          <OptionDropdown
            label="Category"
            options={TRIGGER_CATEGORY_OPTIONS.map((o) => o.label)}
            value={categoryLabel}
            onChange={setCategoryLabel}
          />
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Trigger name"
            placeholderTextColor={colors.textSecondary}
          />
          <View style={styles.addFormButtons}>
            <Pressable onPress={resetAddFlow} accessibilityRole="button">
              <AppText variant="label" color={colors.textSecondary}>
                Cancel
              </AppText>
            </Pressable>
            <Pressable onPress={handleConfirmAdd} accessibilityRole="button">
              <AppText variant="label" color={colors.primary}>
                Add
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} accessibilityRole="button">
          <AppText variant="label" color={colors.primary}>
            + Add your own
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
  textColumn: {
    flex: 1,
    gap: 2,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
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
});
