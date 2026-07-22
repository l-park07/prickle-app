import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { EmailUpdatesOptIn } from '../../components/EmailUpdatesOptIn';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthProvider';
import { authErrorMessage } from '../../lib/authErrorMessage';
import { getEmailUpdatesOptIn } from '../../lib/consent';
import { auth } from '../../lib/firebase';
import { setMailPref } from '../../lib/mailPrefs';
import { colors, spacing } from '../theme';

const MIN_PASSWORD_LENGTH = 6;

export default function SignUp() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Passwords need to be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Those passwords don’t match.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);

      // Catch-up sync: the checkbox above may have been checked before the
      // account (and uid) existed, in which case it could only persist the
      // preference locally. auth.currentUser is populated synchronously here
      // by the SDK — unlike useAuth().user, which only updates on the next
      // onAuthStateChanged fire, not guaranteed yet in this tick.
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          if (await getEmailUpdatesOptIn()) await setMailPref(uid, true);
        } catch (mailPrefError) {
          // Non-critical background sync — must never block or surface
          // through the account-creation error UI below.
          console.warn('Failed to sync email updates preference', mailPrefError);
        }
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="h1">Create your account</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            A place to keep track of your skin, at your own pace.
          </AppText>

          <View style={styles.fields}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              placeholder="••••••••"
            />
            <TextField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              placeholder="••••••••"
            />
          </View>

          <EmailUpdatesOptIn variant="checkbox" />

          {error ? (
            <AppText variant="caption" color={colors.error}>
              {error}
            </AppText>
          ) : null}

          <PrimaryButton label="Create account" onPress={handleSignUp} loading={loading} />

          <Link href="/sign-in" style={styles.link}>
            <AppText variant="label" color={colors.primary}>
              Already have an account? Sign in
            </AppText>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  fields: {
    gap: spacing.md,
  },
  link: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
});
