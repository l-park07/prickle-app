import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';
import { ChecklistRow } from './ChecklistRow';

interface TodayChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  detail?: string;
  badge?: string;
  badgeVariant?: 'accent' | 'muted';
}

interface TodayChecklistProps {
  title: string;
  items: TodayChecklistItem[];
  emptyLabel: string;
}

/** Titled section of ChecklistRows — every active trigger/medication, whether or not it was checked today. */
export function TodayChecklist({ title, items, emptyLabel }: TodayChecklistProps) {
  return (
    <View style={styles.section}>
      <AppText variant="title">{title}</AppText>
      {items.length === 0 ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {emptyLabel}
        </AppText>
      ) : (
        items.map((item) => (
          <ChecklistRow
            key={item.id}
            label={item.label}
            checked={item.checked}
            detail={item.detail}
            badge={item.badge}
            badgeVariant={item.badgeVariant}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
});
