import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, spacing } from '../app/theme';

/** Bordered, pale-surface box used to delineate a section on Home (calendar, assessment notice, ...). */
export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
