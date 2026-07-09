import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { LogFab } from '../../components/LogFab';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';
import { ProfileButton } from '../../components/ProfileButton';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { getDailyMessageAlternating } from '../../../content/getDailyMessage';
import type { PrickleMessage } from '../../../content/messages';
import { spacing } from '../theme';

export default function Home() {
  const activeUserId = useActiveUserId();
  const [message, setMessage] = useState<PrickleMessage | null>(null);

  // Computed once per active identity, not on every re-render — a fresh
  // Date().toISOString() on every render would otherwise pick a new message
  // right around midnight, or whenever something else re-renders Home.
  useEffect(() => {
    if (!activeUserId) return;
    const todayISO = new Date().toISOString().slice(0, 10);
    setMessage(getDailyMessageAlternating(activeUserId, todayISO));
  }, [activeUserId]);

  return (
    <View style={styles.container}>
      {message ? (
        <View style={styles.message}>
          <AppText variant="body">{message.text}</AppText>
        </View>
      ) : null}
      <PlaceholderScreen title="Home" />
      <LogFab />
      <ProfileButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    padding: spacing.lg,
  },
});
