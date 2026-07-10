import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { spacing } from '../app/theme';
import { useActiveUserId } from '../hooks/useActiveUserId';
import { getDailyCactusImage } from '../../content/getDailyCactus';
import { getDailyMessageAlternating } from '../../content/getDailyMessage';
import type { PrickleMessage } from '../../content/messages';
import { AppText } from './AppText';

interface DailyPick {
  message: PrickleMessage | null;
  cactus: number;
}

/**
 * Cactus image + daily message, picked once per user+day and held together in
 * one state object so neither can flicker independently on re-render.
 */
export function DailyCactusMessage() {
  const activeUserId = useActiveUserId();
  const [pick, setPick] = useState<DailyPick | null>(null);

  useEffect(() => {
    if (!activeUserId) return;
    const todayISO = new Date().toISOString().slice(0, 10);
    setPick({
      message: getDailyMessageAlternating(activeUserId, todayISO),
      cactus: getDailyCactusImage(activeUserId, todayISO),
    });
  }, [activeUserId]);

  if (!pick) return null;

  return (
    <View style={styles.container}>
      <Image source={pick.cactus} style={styles.image} resizeMode="contain" />
      {pick.message ? (
        <AppText variant="title" style={styles.message}>
          {pick.message.text}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  image: {
    width: 96,
    height: 96,
  },
  message: {
    flex: 1,
  },
});
