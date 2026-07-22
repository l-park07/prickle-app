import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';

interface ChecklistRowProps {
  label: string;
  checked: boolean;
  detail?: string;
  /** Small pill shown next to the label, e.g. "Rx". */
  badge?: string;
  /** 'accent' (default) or 'muted' — a subtler pill for lower-emphasis badges. */
  badgeVariant?: 'accent' | 'muted';
}

/** One read-only checklist row — used by TodayChecklist for both Triggers and Medications. */
export function ChecklistRow({ label, checked, detail, badge, badgeVariant = 'accent' }: ChecklistRowProps) {
  return (
    <View style={styles.row}>
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={checked ? colors.primary : colors.textSecondary}
      />
      <View style={styles.textColumn}>
        <View style={styles.labelRow}>
          <AppText variant="body" color={checked ? colors.textPrimary : colors.textSecondary}>
            {label}
          </AppText>
          {badge ? (
            <View style={[styles.badge, badgeVariant === 'muted' && styles.badgeMuted]}>
              <AppText
                variant="caption"
                color={badgeVariant === 'muted' ? colors.textSecondary : colors.textInverse}
              >
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        {detail ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {detail}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textColumn: {
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
