import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../context/AuthProvider';
import { authErrorMessage } from '../../lib/authErrorMessage';
import { colors, spacing } from '../theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
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
          <AppText variant="h1">Welcome back</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            Sign in to pick up your logs where you left off.
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
              autoComplete="password"
              textContentType="password"
              placeholder="••••••••"
            />
          </View>

          {error ? (
            <AppText variant="caption" color={colors.error}>
              {error}
            </AppText>
          ) : null}

          <PrimaryButton label="Sign in" onPress={handleSignIn} loading={loading} />

          <Link href="/sign-up" style={styles.link}>
            <AppText variant="label" color={colors.primary}>
              New here? Create an account
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
