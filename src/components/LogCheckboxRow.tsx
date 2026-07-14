import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';

interface LogCheckboxRowProps {
  label: string;
  checked: boolean;
  detail?: string;
  onToggle: () => void;
}

/** Interactive sibling of ChecklistRow — for the Log screen's Triggers/Medications lists. */
export function LogCheckboxRow({ label, checked, detail, onToggle }: LogCheckboxRowProps) {
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
        <AppText variant="body" color={checked ? colors.textPrimary : colors.textSecondary}>
          {label}
        </AppText>
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
});
