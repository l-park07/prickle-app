// The Cloud Sync opt-in. Off by default. Turning it ON shows an explicit consent
// dialog before any health data leaves the device (GDPR Art. 9(2)(a) explicit
// consent). Turning it OFF withdraws that consent.
//
// This component only handles the CONSENT + toggle UI. Wire `enableSync` /
// `disableSync` to your Phase-3 Firestore/Storage sync logic where marked.

import { useEffect, useState } from 'react';
import { View, Switch, StyleSheet, Alert, Pressable } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { AppText } from '../AppText';
import { colors, spacing } from '../../app/theme';
import { PRIVACY_POLICY_URL } from '../../constants/privacy';
import { useAuth } from '../../context/AuthProvider';
import {
  getCloudSyncConsent,
  recordCloudSyncConsent,
  clearCloudSyncConsent,
} from '../../lib/consent';

export function CloudSyncToggle() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    getCloudSyncConsent(user.uid).then((c) => {
      setEnabled(!!c);
      setReady(true);
    });
  }, [user]);

  const confirmEnable = () => {
    Alert.alert(
      'Turn on Cloud Sync?',
      "A copy of your logs and photos will be securely backed up to your private " +
        "space in Google Firebase, so you can restore them on a new phone. We don't " +
        "read, analyse, share, or sell it. You can turn this off anytime.",
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Read policy',
          onPress: () => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL),
        },
        {
          text: 'Turn on',
          style: 'default',
          onPress: async () => {
            if (!user) return;
            await recordCloudSyncConsent(user.uid);
            // TODO: kick off your Phase-3 sync here, e.g. await enableSync();
            setEnabled(true);
          },
        },
      ],
    );
  };

  const confirmDisable = () => {
    Alert.alert(
      'Turn off Cloud Sync?',
      'Your data stays on this device. Your existing cloud backup will stop ' +
        'updating. To delete the backup entirely, contact us from the Privacy screen.',
      [
        { text: 'Keep on', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            await clearCloudSyncConsent(user.uid);
            // TODO: stop your Phase-3 sync here, e.g. await disableSync();
            setEnabled(false);
          },
        },
      ],
    );
  };

  const onToggle = (next: boolean) => (next ? confirmEnable() : confirmDisable());

  if (!user || !ready) return null;

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="label">Cloud Sync</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          Back up your logs and photos so you can restore them on a new phone.
          Off by default. {' '}
          <Pressable onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}>
            <AppText variant="caption" color={colors.primary} style={styles.link}>
              How your data is handled
            </AppText>
          </Pressable>
        </AppText>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ true: colors.primary, false: colors.border }}
        accessibilityLabel="Cloud Sync"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  text: { flex: 1, gap: spacing.xs },
  link: { textDecorationLine: 'underline' },
});
