import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../app/theme';
import type { CatalogTrigger, TriggerCategory } from '../../../content/triggerCatalog';
import type { SearchableTrigger } from '../../lib/manageTriggers';
import { AppText } from '../AppText';

interface TriggerCategoryCardProps {
  category: TriggerCategory;
  /** slug -> SearchableTrigger, for the added-state indicator. */
  addedBySlug: Map<string, SearchableTrigger>;
  onSelectTrigger: (trigger: CatalogTrigger, category: TriggerCategory) => void;
}

/** One collapsible catalog category — section C of the Triggers tab (static content only). */
export function TriggerCategoryCard({ category, addedBySlug, onSelectTrigger }: TriggerCategoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const triggers = category.triggers.filter((t) => !t.retired);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={styles.closedRow}
        accessibilityRole="button"
        accessibilityLabel={category.label}
      >
        <View style={styles.closedTextRow}>
          <AppText variant="title">{category.label}</AppText>
          {category.gerund ? (
            <View style={styles.tag}>
              <AppText variant="caption" color={colors.textSecondary}>
                {category.gerund}
              </AppText>
            </View>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <AppText variant="body" color={colors.textSecondary}>
            {category.blurb}
          </AppText>
          {category.note ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {category.note}
            </AppText>
          ) : null}

          <View style={styles.triggerList}>
            {triggers.map((trigger) => {
              const added = addedBySlug.get(trigger.id)?.added ?? false;
              return (
                <Pressable
                  key={trigger.id}
                  onPress={() => onSelectTrigger(trigger, category)}
                  style={styles.triggerRow}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={added ? 'checkmark-circle' : 'add-circle-outline'}
                    size={20}
                    color={added ? colors.success : colors.textSecondary}
                  />
                  <View style={styles.triggerTextColumn}>
                    <AppText variant="body">{trigger.label}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {trigger.blurb}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  closedTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  tag: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  body: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  triggerList: {
    gap: spacing.md,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  triggerTextColumn: {
    flex: 1,
    gap: 2,
  },
});
