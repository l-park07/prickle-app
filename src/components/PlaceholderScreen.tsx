import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';

interface PlaceholderScreenProps {
  title: string;
}

/** Generic stand-in for a tab screen that hasn't been built out yet. */
export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <AppText variant="h2">{title}</AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        Coming soon
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
});
