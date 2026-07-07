import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../app/theme';

const BUTTON_SIZE = 44;

/** Entry point to the Profile screen, positioned top-right on Home. */
export function ProfileButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel="Profile"
      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
      style={[styles.button, { top: insets.top + spacing.sm }]}
    >
      <Ionicons name="person-outline" size={24} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.md,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
