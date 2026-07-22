// Optional opt-in to hear about app updates by email. Default OFF.
// Use `variant="checkbox"` on the signup form, and `variant="switch"` in
// account settings so people can change their mind. Both write the same
// preference via lib/consent.
//
// At signup: render this, and after the Firebase account is created, read the
// preference (getEmailUpdatesOptIn) and sync it server-side with the new uid.

import { useEffect, useState } from 'react';
import { View, Pressable, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';

import { AppText } from './AppText';
import { colors, spacing } from '../app/theme';
import { useAuth } from '../context/AuthProvider';
import { getEmailUpdatesOptIn, setEmailUpdatesOptIn } from '../lib/consent';

type Props = {
  variant?: 'checkbox' | 'switch';
  onChange?: (optedIn: boolean) => void;
};

export function EmailUpdatesOptIn({ variant = 'checkbox', onChange }: Props) {
  const { user } = useAuth();
  const [optedIn, setOptedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getEmailUpdatesOptIn().then((v) => {
      setOptedIn(v);
      setReady(true);
    });
  }, []);

  const update = async (next: boolean) => {
    setOptedIn(next);
    // No uid yet on the signup form — this just persists locally and skips
    // the Firestore sync, which sign-up.tsx catches up on after account creation.
    await setEmailUpdatesOptIn(next, user?.uid);
    onChange?.(next);
  };

  if (!ready) return null;

  const label = 'Email me about new features and improvements';
  const sub = "Optional. Off unless you turn it on — change it anytime. We never share your email.";

  if (variant === 'switch') {
    return (
      <View style={styles.row}>
        <View style={styles.text}>
          <AppText variant="label">App updates by email</AppText>
          <AppText variant="caption" color={colors.textSecondary}>{sub}</AppText>
        </View>
        <Switch
          value={optedIn}
          onValueChange={update}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel={label}
        />
      </View>
    );
  }

  // checkbox (signup)
  return (
    <Pressable
      onPress={() => update(!optedIn)}
      style={styles.checkRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: optedIn }}
      accessibilityLabel={label}
    >
      <Ionicons
        name={optedIn ? 'checkbox' : 'square-outline'}
        size={22}
        color={optedIn ? colors.primary : colors.textSecondary}
      />
      <View style={styles.text}>
        <AppText variant="body">{label}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          Optional — you can change this anytime in settings.
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  text: { flex: 1, gap: spacing.xs },
});
