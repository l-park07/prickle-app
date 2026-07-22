import { StyleSheet, View } from 'react-native';
import { PrivacyConsentStep } from '../components/onboarding/PrivacyConsentStep';
import { useConsent } from '../context/ConsentProvider';
import { colors } from './theme';

/**
 * Shown instead of (tabs) when a signed-in, already-onboarded user's consent
 * record predates a PRIVACY_POLICY_VERSION bump. Reuses the onboarding step —
 * onAccept records consent and refreshes the gate, landing on (tabs) with no
 * explicit navigation (same zero-navigation pattern as onboarding's "Not now").
 */
export default function ReconsentScreen() {
  const { refreshConsent } = useConsent();

  return (
    <View style={styles.container}>
      <PrivacyConsentStep onAccept={refreshConsent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
