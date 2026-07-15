import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { TRIGGER_CATEGORIES } from '../../lib/triggerCategories';
import { AppText } from '../AppText';
import { OptionDropdown } from '../OptionDropdown';

export interface OnboardingTrigger {
  id: string;
  name: string;
}

interface OnboardingTriggersStepProps {
  triggers: OnboardingTrigger[];
  onAddTrigger: (name: string) => void;
  onRemoveTrigger: (id: string) => void;
}

/** Step 3 — establishes the master trigger list, same category-guided add-flow as the Log modal. */
export function OnboardingTriggersStep({
  triggers,
  onAddTrigger,
  onRemoveTrigger,
}: OnboardingTriggersStepProps) {
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [triggerName, setTriggerName] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');

  const selectedCategory = TRIGGER_CATEGORIES.find((c) => c.label === categoryLabel);
  const categoryAllowsCustom = !selectedCategory || selectedCategory.options.length === 0;

  const handleAdd = () => {
    const finalName = (triggerName ?? '').trim();
    if (!finalName) return;
    onAddTrigger(finalName);
    setCategoryLabel(null);
    setTriggerName(null);
    setCustomName('');
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
      {triggerName ? (
        <Pressable onPress={handleAdd} accessibilityRole="button">
          <AppText variant="label" color={colors.primary}>
            + Add trigger
          </AppText>
        </Pressable>
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
});
