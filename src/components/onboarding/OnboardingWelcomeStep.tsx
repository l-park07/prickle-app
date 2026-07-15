import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { authErrorMessage } from '../../lib/authErrorMessage';
import { AppText } from '../AppText';
import { PrimaryButton } from '../PrimaryButton';
import { TextField } from '../TextField';

interface OnboardingWelcomeStepProps {
  name: string;
  onChangeName: (name: string) => void;
  onContinue: (name: string) => Promise<void>;
  onSkipSetup: () => void;
}

/** Step 1 — the only required step. Name is written straight to the Profile source (Firebase displayName). */
export function OnboardingWelcomeStep({
  name,
  onChangeName,
  onContinue,
  onSkipSetup,
}: OnboardingWelcomeStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    try {
      await onContinue(trimmed);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppText variant="h1">Welcome to Prickle</AppText>
      <AppText variant="body" color={colors.textSecondary}>
        A quick, gentle setup — a couple of minutes, and you can skip anything.
      </AppText>

      <TextField
        label="What should we call you?"
        value={name}
        onChangeText={onChangeName}
        autoCapitalize="words"
        placeholder="Your name"
        error={error ?? undefined}
      />

      <View style={styles.actions}>
        <PrimaryButton label="Continue" onPress={handleContinue} loading={loading} disabled={!name.trim()} />
        <AppText
          variant="label"
          color={colors.textSecondary}
          style={styles.skip}
          onPress={onSkipSetup}
        >
          Skip setup, do this later
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.md,
    alignItems: 'center',
  },
  skip: {
    textAlign: 'center',
  },
});
