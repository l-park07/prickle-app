import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';

interface SettingsRowProps {
  label: string;
  onPress: () => void;
  labelColor?: string;
  showChevron?: boolean;
}

/** A single tappable row in a settings-style list, e.g. Profile's Account/Privacy/Sign out links. */
export function SettingsRow({
  label,
  onPress,
  labelColor = colors.textPrimary,
  showChevron = true,
}: SettingsRowProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.row}>
      <AppText variant="body" color={labelColor}>
        {label}
      </AppText>
      {showChevron ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
