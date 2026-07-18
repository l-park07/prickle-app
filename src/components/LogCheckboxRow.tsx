import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';

interface LogCheckboxRowProps {
  label: string;
  checked: boolean;
  detail?: string;
  /** Small pill shown next to the label, e.g. "Watching". */
  badge?: string;
  onToggle: () => void;
}

/** Interactive sibling of ChecklistRow — for the Log screen's Triggers/Medications lists. */
export function LogCheckboxRow({ label, checked, detail, badge, onToggle }: LogCheckboxRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
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
            <View style={styles.badge}>
              <AppText variant="caption" color={colors.textInverse}>
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
});
