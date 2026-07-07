import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/AppText';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { TextField } from '../../../components/TextField';
import { useAuth } from '../../../context/AuthProvider';
import { authErrorMessage } from '../../../lib/authErrorMessage';
import { colors, spacing } from '../../theme';

type PendingAction = { type: 'email' | 'password'; value: string };

function isRequiresRecentLogin(error: unknown): boolean {
  return (error as { code?: string } | null | undefined)?.code === 'auth/requires-recent-login';
}

export default function Account() {
  const { user, changeEmail, changePassword, reauthenticate } = useAuth();

  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);

  const handleChangeEmail = async () => {
    setEmailError(null);
    setEmailSent(false);
    setEmailLoading(true);
    try {
      await changeEmail(newEmail);
      setEmailSent(true);
    } catch (e) {
      if (isRequiresRecentLogin(e)) {
        setPending({ type: 'email', value: newEmail });
      } else {
        setEmailError(authErrorMessage(e));
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordLoading(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
    } catch (e) {
      if (isRequiresRecentLogin(e)) {
        setPending({ type: 'password', value: newPassword });
      } else {
        setPasswordError(authErrorMessage(e));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleReauthConfirm = async () => {
    if (!pending) return;
    setReauthError(null);
    setReauthLoading(true);
    try {
      await reauthenticate(reauthPassword);
      if (pending.type === 'email') {
        await changeEmail(pending.value);
        setEmailSent(true);
      } else {
        await changePassword(pending.value);
        setNewPassword('');
      }
      setPending(null);
      setReauthPassword('');
    } catch (e) {
      setReauthError(authErrorMessage(e));
    } finally {
      setReauthLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <AppText variant="title">Email</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            {user?.email}
          </AppText>
          <TextField
            label="New email"
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />
          {emailSent ? (
            <AppText variant="caption" color={colors.success}>
              We sent a confirmation link to that address — your email won't
              change until you click it.
            </AppText>
          ) : null}
          {emailError ? (
            <AppText variant="caption" color={colors.error}>
              {emailError}
            </AppText>
          ) : null}
          <PrimaryButton label="Update email" onPress={handleChangeEmail} loading={emailLoading} />
        </View>

        <View style={styles.section}>
          <AppText variant="title">Password</AppText>
          <TextField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            placeholder="••••••••"
          />
          {passwordError ? (
            <AppText variant="caption" color={colors.error}>
              {passwordError}
            </AppText>
          ) : null}
          <PrimaryButton
            label="Update password"
            onPress={handleChangePassword}
            loading={passwordLoading}
          />
        </View>

        {pending ? (
          <View style={styles.section}>
            <AppText variant="title">Confirm it's you</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              For your security, please re-enter your current password to
              continue.
            </AppText>
            <TextField
              label="Current password"
              value={reauthPassword}
              onChangeText={setReauthPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              placeholder="••••••••"
            />
            {reauthError ? (
              <AppText variant="caption" color={colors.error}>
                {reauthError}
              </AppText>
            ) : null}
            <PrimaryButton label="Confirm" onPress={handleReauthConfirm} loading={reauthLoading} />
          </View>
        ) : null}
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
  section: {
    gap: spacing.md,
  },
});
