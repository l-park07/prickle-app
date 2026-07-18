import * as Crypto from 'expo-crypto';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../src/components/AppText';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { SeverityBar } from '../src/components/SeverityBar';
import { SeverityInput } from '../src/components/SeverityInput';
import { TextField } from '../src/components/TextField';
import { useActiveUserId } from '../src/hooks/useActiveUserId';
import { colors, spacing } from '../src/app/theme';
import { shiftISODate, todayISO } from '../src/lib/calendarMath';
import { getDayEntry, getMonthWorstSeverity } from '../src/lib/chartSelectors';
import { db } from '../src/lib/db';
import { DEV_PROFILES, setDevProfile } from './devProfileStore';
import { seedProfile, type ProfileKey } from './seedProfile';
import { runTriggerFoundationCheck, type CheckResult } from './triggerFoundationCheck';

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
  const [triggerCheckResults, setTriggerCheckResults] = useState<CheckResult[] | null>(null);
  const [seedWatchResult, setSeedWatchResult] = useState<string | null>(null);
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

  const handleRunTriggerCheck = async () => {
    if (!activeUserId) {
      setTriggerCheckResults([{ name: 'active user id present', pass: false, detail: 'pick a profile below first' }]);
      return;
    }
    const results = await runTriggerFoundationCheck(db, activeUserId);
    setTriggerCheckResults(results);
  };

  /**
   * TEMP verification aid: the Triggers tab (where watching is meant to start)
   * is still a stub, so this seeds one observation window directly to exercise
   * the Log modal's "watched" marker/pin-to-top path. Not a real feature.
   */
  const handleSeedWatch = async () => {
    if (!activeUserId) {
      setSeedWatchResult('pick a profile below first');
      return;
    }
    const trigger = await db.getFirstAsync<{ id: string; name: string }>(
      `SELECT id, name FROM triggers WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY name ASC LIMIT 1`,
      [activeUserId]
    );
    if (!trigger) {
      setSeedWatchResult('no active triggers for this profile — add one via the Log modal first');
      return;
    }
    const ts = new Date().toISOString();
    const start = todayISO();
    const end = shiftISODate(start, 14);
    await db.runAsync(
      `INSERT INTO experiments (id, user_id, name, trigger_id, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [Crypto.randomUUID(), activeUserId, `Watching ${trigger.name}`, trigger.id, start, end, ts, ts]
    );
    setSeedWatchResult(`Now watching "${trigger.name}" through ${end} — open the Log modal to check.`);
  };

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

      <AppText variant="title">Trigger foundation check</AppText>
      <PrimaryButton label="Run trigger foundation check" onPress={handleRunTriggerCheck} />
      {triggerCheckResults ? (
        <View style={styles.column}>
          {triggerCheckResults.map((r, i) => (
            <AppText key={i} variant="caption" style={r.pass ? styles.pass : styles.fail}>
              {r.pass ? 'PASS' : 'FAIL'} — {r.name}
              {r.detail ? ` (${r.detail})` : ''}
            </AppText>
          ))}
        </View>
      ) : null}

      <AppText variant="title">Seed a watch window (verification aid)</AppText>
      <PrimaryButton label="Watch this profile's first trigger" onPress={handleSeedWatch} />
      {seedWatchResult ? <AppText variant="caption">{seedWatchResult}</AppText> : null}

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
  column: {
    gap: spacing.xs,
  },
  pass: {
    color: colors.success,
  },
  fail: {
    color: colors.error,
  },
  dump: {
    fontFamily: 'monospace',
    color: colors.textPrimary,
  },
});
