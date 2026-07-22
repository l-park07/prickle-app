import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/AppText';
import { EmailUpdatesOptIn } from '../../../components/EmailUpdatesOptIn';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { CloudSyncToggle } from '../../../components/settings/CloudSyncToggle';
import { SettingsRow } from '../../../components/SettingsRow';
import { TextField } from '../../../components/TextField';
import { useAuth } from '../../../context/AuthProvider';
import { authErrorMessage } from '../../../lib/authErrorMessage';
import { colors, spacing } from '../../theme';

export default function Profile() {
  const router = useRouter();
  const { user, updateDisplayName, signOut } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setLoading(true);
    try {
      await updateDisplayName(name);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'Are you sure you want to sign out?', [
      { text: 'No, stay on the app', style: 'cancel' },
      { text: "Yes, I'm sure", style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.fields}>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder="Your name"
          />
          {error ? (
            <AppText variant="caption" color={colors.error}>
              {error}
            </AppText>
          ) : null}
          <PrimaryButton label="Save" onPress={handleSave} loading={loading} />
        </View>

        <View style={styles.rows}>
          <SettingsRow label="Account" onPress={() => router.push('/profile/account')} />
          <SettingsRow label="Privacy" onPress={() => router.push('/profile/privacy')} />
          <SettingsRow
            label="Notifications"
            onPress={() => router.push('/profile/notifications')}
          />
          <SettingsRow label="About Prickle" onPress={() => router.push('/profile/about')} />
          <View style={styles.toggleRow}>
            <CloudSyncToggle />
          </View>
          <View style={styles.toggleRow}>
            <EmailUpdatesOptIn variant="switch" />
          </View>
          <SettingsRow
            label="Sign out"
            onPress={handleSignOut}
            labelColor={colors.error}
            showChevron={false}
          />
          {__DEV__ ? (
            <SettingsRow label="Debug" onPress={() => router.push('/dev-debug')} />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  fields: {
    gap: spacing.md,
  },
  rows: {
    gap: 0,
  },
  toggleRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
