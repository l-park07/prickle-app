import { Ionicons } from '@react-native-vector-icons/ionicons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthProvider';
import { colors, radius, spacing } from '../app/theme';
import { AppText } from './AppText';

const PLUS_BADGE_SIZE = 16;

/** Home screen greeting — sits top-left, aligned with ProfileButton's inset. */
export function HomeHeader() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const name = user?.displayName || 'there';

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xs }]}>
      <AppText variant="h2">Hi {name}!</AppText>
      <View style={styles.subtitleRow}>
        <AppText variant="label">Press </AppText>
        <View style={styles.plusBadge}>
          <Ionicons name="add" size={12} color={colors.onPrimary} />
        </View>
        <AppText variant="label"> to log now!</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  plusBadge: {
    width: PLUS_BADGE_SIZE,
    height: PLUS_BADGE_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
