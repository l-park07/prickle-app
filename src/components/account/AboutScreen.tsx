import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { AppText } from '../AppText';
import { SettingsRow } from '../SettingsRow';

/** Profile → About Prickle. */
export function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="body" color={colors.textSecondary}>
          Prickle is a place to keep track of your skin, at your own pace. No diagnoses, no
          predictions — just what you tell it.
        </AppText>
        {version ? (
          <AppText variant="caption" color={colors.textSecondary}>
            Version {version}
          </AppText>
        ) : null}

        <View style={styles.rows}>
          <SettingsRow
            label="Credits & licences"
            onPress={() => router.push('/profile/credits')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  rows: {
    gap: 0,
  },
});
