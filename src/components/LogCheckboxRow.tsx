import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';

interface LogCheckboxRowProps {
  label: string;
  checked: boolean;
  detail?: string;
  /** Overrides the detail text color — e.g. colors.primary for a tappable placeholder. */
  detailColor?: string;
  /** Small pill shown next to the label, e.g. "Watching". */
  badge?: string;
  /** 'accent' (default, today's style) or 'muted' — a subtler pill for lower-emphasis badges. */
  badgeVariant?: 'accent' | 'muted';
  onToggle: () => void;
  /** If provided, the checkbox icon becomes its own tap target for onToggle, and the
   *  name/detail column becomes a separate tap target calling this instead — for rows where
   *  "check it for today" and "open details" are different actions. Omit to keep the single
   *  "tap anywhere toggles" row (LogTriggersSection's usage). */
  onPress?: () => void;
}

const hitSlop = { top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm };

/** Interactive sibling of ChecklistRow — for the Log screen's Triggers/Treatments lists. */
export function LogCheckboxRow({
  label,
  checked,
  detail,
  detailColor,
  badge,
  badgeVariant = 'accent',
  onToggle,
  onPress,
}: LogCheckboxRowProps) {
  const checkboxIcon = (
    <Ionicons
      name={checked ? 'checkbox' : 'square-outline'}
      size={22}
      color={checked ? colors.primary : colors.textSecondary}
    />
  );

  const textColumn = (
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
        <AppText variant="caption" color={detailColor ?? colors.textSecondary}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <View style={styles.row}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={label}
          hitSlop={hitSlop}
        >
          {checkboxIcon}
        </Pressable>
        <Pressable onPress={onPress} style={styles.textColumnPress} accessibilityRole="button">
          {textColumn}
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onToggle}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      {checkboxIcon}
      {textColumn}
    </Pressable>
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
  textColumnPress: {
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
