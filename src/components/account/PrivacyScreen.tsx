// The Privacy tab under the account modal. It embeds the LIVE website privacy
// page in a WebView, so whenever you edit privacy.html on getprickle.app, the
// in-app view updates automatically — no app release required.

import { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';

import { AppText } from '../AppText';
import { PrimaryButton } from '../PrimaryButton';
import { colors, spacing } from '../../app/theme';
import { PRIVACY_POLICY_URL } from '../../constants/privacy';

export function PrivacyScreen() {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={styles.center}>
        <AppText variant="body" color={colors.textSecondary} style={styles.errText}>
          We couldn't load the privacy policy right now.
        </AppText>
        <PrimaryButton label="Open in browser" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: PRIVACY_POLICY_URL }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setFailed(true); }}
        startInLoadingState
        // Open outbound links (mailto:, ICO, etc.) in the system browser instead
        // of navigating away inside the embedded view.
        onShouldStartLoadWithRequest={(req) => {
          if (req.url === PRIVACY_POLICY_URL || req.url.startsWith(PRIVACY_POLICY_URL + '#')) {
            return true;
          }
          WebBrowser.openBrowserAsync(req.url);
          return false;
        }}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  overlay: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  errText: { textAlign: 'center' },
});
