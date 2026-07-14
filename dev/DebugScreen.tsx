import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/AppText';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { SeverityBar } from '../src/components/SeverityBar';
import { SeverityInput } from '../src/components/SeverityInput';
import { TextField } from '../src/components/TextField';
import { useActiveUserId } from '../src/hooks/useActiveUserId';
import { colors, spacing } from '../src/app/theme';
import { getDayEntry, getMonthWorstSeverity } from '../src/lib/chartSelectors';
import { db } from '../src/lib/db';
import { DEV_PROFILES, setDevProfile } from './devProfileStore';
import { seedProfile, type ProfileKey } from './seedProfile';

const SEED_KEYS: ProfileKey[] = ['elizabeth', 'georgie', 'jason'];

function monthBounds(date: string): [string, string] {
  const [year, month] = date.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return [
    `${year}-${String(month).padStart(2, '0')}-01`,
    `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  ];
}

/**
 * Dev-only debug tool: seed data, switch the active dev profile, and inspect
 * the read-side selectors' raw output. Ugly on purpose.
 */
export function DebugScreen() {
  const activeUserId = useActiveUserId();
  const [date, setDate] = useState('2026-01-02');
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [dump, setDump] = useState('');
  // TEMP: SeverityBar/SeverityInput preview — no real screen mounts these yet.
  const [previewValue, setPreviewValue] = useState<number | null>(3);

  useEffect(() => {
    if (!activeUserId) {
      setDump('(no active user id — pick a profile below)');
      return;
    }
    let cancelled = false;
    const [from, to] = monthBounds(date);
    Promise.all([
      getDayEntry(db, activeUserId, date),
      getMonthWorstSeverity(db, activeUserId, from, to),
    ])
      .then(([dayEntry, worstSeverity]) => {
        if (!cancelled) setDump(JSON.stringify({ dayEntry, worstSeverity }, null, 2));
      })
      .catch((e) => {
        if (!cancelled) setDump(`ERROR: ${String(e)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [activeUserId, date]);

  if (!__DEV__) return null;

  const handleSeed = async (key: ProfileKey) => {
    setSeedResult(`seeding ${key}…`);
    try {
      const counts = await seedProfile(db, key);
      setSeedResult(`${key}: ${JSON.stringify(counts)}`);
    } catch (e) {
      setSeedResult(`ERROR: ${String(e)}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppText variant="h1">Debug</AppText>

      <AppText variant="label">Active user id: {activeUserId ?? '(none)'}</AppText>

      <View style={styles.row}>
        {SEED_KEYS.map((key) => (
          <PrimaryButton
            key={key}
            label={`Seed ${key[0].toUpperCase()}${key.slice(1)}`}
            onPress={() => handleSeed(key)}
          />
        ))}
      </View>
      {seedResult ? <AppText variant="caption">{seedResult}</AppText> : null}

      <View style={styles.row}>
        {DEV_PROFILES.map((profile) => (
          <PrimaryButton key={profile} label={profile} onPress={() => setDevProfile(profile)} />
        ))}
        <PrimaryButton label="Clear" onPress={() => setDevProfile(null)} />
      </View>

      <TextField
        label="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        autoCapitalize="none"
      />

      <AppText variant="caption" style={styles.dump}>
        {dump}
      </AppText>

      <AppText variant="title">SeverityBar preview</AppText>
      <SeverityBar score={null} />
      <SeverityBar score={0} />
      <SeverityBar score={previewValue} />

      <AppText variant="title">SeverityInput preview</AppText>
      <SeverityInput value={previewValue} onChange={setPreviewValue} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dump: {
    fontFamily: 'monospace',
    color: colors.textPrimary,
  },
});
