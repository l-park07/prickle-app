import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { TRIGGER_CATEGORIES } from '../lib/triggerCategories';
import { AppText } from './AppText';
import { LogCheckboxRow } from './LogCheckboxRow';
import { OptionDropdown } from './OptionDropdown';

interface LogTrigger {
  id: string;
  name: string;
  checked: boolean;
}

interface LogTriggersSectionProps {
  triggers: LogTrigger[];
  onToggle: (id: string) => void;
  onAddTrigger: (name: string) => void;
  onRemoveTrigger: (id: string) => void;
}

/** Editable Triggers checklist, plus a category-guided add-new flow. */
export function LogTriggersSection({
  triggers,
  onToggle,
  onAddTrigger,
  onRemoveTrigger,
}: LogTriggersSectionProps) {
  const [adding, setAdding] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [triggerName, setTriggerName] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');

  const selectedCategory = TRIGGER_CATEGORIES.find((c) => c.label === categoryLabel);
  const categoryAllowsCustom = !selectedCategory || selectedCategory.options.length === 0;

  const confirmRemove = (trigger: LogTrigger) => {
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
    setCategoryLabel(null);
    setTriggerName(null);
    setCustomName('');
  };

  const handleAdd = () => {
    const finalName = (triggerName ?? '').trim();
    if (!finalName) return;
    onAddTrigger(finalName);
    resetAddFlow();
  };

  return (
    <View style={styles.section}>
      <AppText variant="title">Triggers</AppText>

      {triggers.length === 0 ? (
        <AppText variant="caption" color={colors.textSecondary}>
          No triggers set up yet
        </AppText>
      ) : (
        triggers.map((trigger) => (
          <View key={trigger.id} style={styles.row}>
            <View style={styles.checkboxWrap}>
              <LogCheckboxRow
                label={trigger.name}
                checked={trigger.checked}
                onToggle={() => onToggle(trigger.id)}
              />
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
          <OptionDropdown
            label="Category"
            options={TRIGGER_CATEGORIES.map((c) => c.label)}
            value={categoryLabel}
            onChange={(label) => {
              setCategoryLabel(label);
              setTriggerName(null);
              setCustomName('');
            }}
          />
          {selectedCategory ? (
            <OptionDropdown
              label="Trigger"
              options={selectedCategory.options}
              value={triggerName}
              onChange={setTriggerName}
              allowCustom={categoryAllowsCustom}
              customValue={customName}
              onCustomChange={(text) => {
                setCustomName(text);
                setTriggerName(text);
              }}
            />
          ) : null}
          <View style={styles.addFormButtons}>
            <Pressable onPress={resetAddFlow} accessibilityRole="button">
              <AppText variant="label" color={colors.textSecondary}>
                Cancel
              </AppText>
            </Pressable>
            <Pressable onPress={handleAdd} accessibilityRole="button">
              <AppText variant="label" color={colors.primary}>
                Add
              </AppText>
            </Pressable>
          </View>
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
  addForm: {
    gap: spacing.sm,
  },
  addFormButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
});
