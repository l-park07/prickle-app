// A step in the onboarding carousel that captures explicit agreement to the
// privacy policy before the user starts logging. Continue stays disabled until
// the box is checked, so consent is a deliberate act, not a default.
//
// Drop this in as one screen of the existing Welcome → name → Sites → ... flow.
// On accept it records consent locally and calls onAccept() to advance.

import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { AppText } from '../AppText';
import { PrimaryButton } from '../PrimaryButton';
import { colors, spacing } from '../../app/theme';
import { PRIVACY_POLICY_URL } from '../../constants/privacy';
import { useAuth } from '../../context/AuthProvider';
import { recordPrivacyConsent } from '../../lib/consent';

type Props = {
  onAccept: () => void; // advance the carousel / set onboarding flag
};

export function PrivacyConsentStep({ onAccept }: Props) {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const openPolicy = () => {
    // In-app browser keeps the user inside Prickle; the page is the live site,
    // so it always shows the current policy.
    WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  };

  const handleContinue = async () => {
    if (!checked || saving || !user) return;
    setSaving(true);
    try {
      await recordPrivacyConsent(user.uid);
      onAccept();
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <AppText variant="title">A quick note on your data</AppText>

        <AppText variant="body" color={colors.textSecondary}>
          Prickle keeps your logs and photos on your phone. We only store your
          account so you can sign in — nothing you track leaves your device
          unless you choose to turn on Cloud Sync later.
        </AppText>

        <AppText variant="body" color={colors.textSecondary}>
          Before you start, please have a read of our privacy policy so you know
          exactly how your data is handled.
        </AppText>

        <Pressable
          onPress={openPolicy}
          style={styles.linkRow}
          accessibilityRole="link"
          accessibilityLabel="Read the Prickle privacy policy"
        >
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <AppText variant="label" color={colors.primary} style={styles.linkText}>
            Read the privacy policy
          </AppText>
          <Ionicons name="open-outline" size={16} color={colors.primary} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => setChecked((c) => !c)}
        style={styles.checkRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="I have read and agree to the privacy policy"
      >
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={22}
          color={checked ? colors.primary : colors.textSecondary}
        />
        <AppText variant="body" style={styles.checkText}>
          I've read and agree to the Privacy Policy.
        </AppText>
      </Pressable>

      <PrimaryButton
        label="Agree and continue"
        onPress={handleContinue}
        loading={saving}
        disabled={!checked}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  body: { gap: spacing.md },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  linkText: { textDecorationLine: 'underline' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  checkText: { flex: 1 },
});
