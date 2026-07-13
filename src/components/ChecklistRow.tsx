import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';

interface ChecklistRowProps {
  label: string;
  checked: boolean;
  detail?: string;
}

/** One read-only checklist row — used by TodayChecklist for both Triggers and Medications. */
export function ChecklistRow({ label, checked, detail }: ChecklistRowProps) {
  return (
    <View style={styles.row}>
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
});
