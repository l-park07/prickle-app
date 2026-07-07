import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { colors, fontFamily, spacing, typography } from '../../theme';

export default function ProfileLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: fontFamily.semibold,
          fontSize: typography.title.fontSize,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Profile',
          headerLeft: () => (
            <Pressable
              onPress={() => router.push('/')}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={spacing.sm}
            >
              <Ionicons name="close" size={26} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
    </Stack>
  );
}
