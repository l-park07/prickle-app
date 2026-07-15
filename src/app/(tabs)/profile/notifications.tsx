import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { OptionDropdown } from '../../../components/OptionDropdown';
import { useActiveUserId } from '../../../hooks/useActiveUserId';
import { NotificationSettings, Weekday, WEEKDAY_NAMES } from '../../../../content/getNotification';
import { db } from '../../../lib/db';
import {
  getPermissionStatus,
  requestNotificationPermission,
} from '../../../lib/notificationPermissions';
import {
  getNotificationSettings,
  saveNotificationSettings,
} from '../../../lib/notificationSettingsStore';
import { rescheduleNotifications } from '../../../lib/notificationScheduler';
import { formatTime, timeOptions } from '../../../lib/timeOfDay';
import { colors, spacing } from '../../theme';

const TIME_OPTIONS = timeOptions();
const TIME_LABELS = TIME_OPTIONS.map((o) => o.label);

type PermissionState = 'granted' | 'denied' | 'undetermined';

export default function ConfigureNotifications() {
  const activeUserId = useActiveUserId();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [permission, setPermission] = useState<PermissionState>('undetermined');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const [loadedSettings, status] = await Promise.all([
          getNotificationSettings(),
          getPermissionStatus(),
        ]);
        if (cancelled) return;

        const effectivePermission: PermissionState = status.granted
          ? 'granted'
          : status.canAskAgain
            ? 'undetermined'
            : 'denied';

        // Permission was revoked from system Settings since we last checked —
        // don't leave the master switch showing "on" for something that can't fire.
        if (loadedSettings.enabled && effectivePermission !== 'granted') {
          const next = { ...loadedSettings, enabled: false };
          setSettings(next);
          setPermission(effectivePermission);
          await saveNotificationSettings(next);
          if (activeUserId) await rescheduleNotifications(db, activeUserId);
          return;
        }

        setSettings(loadedSettings);
        setPermission(effectivePermission);
      })();

      return () => {
        cancelled = true;
      };
    }, [activeUserId])
  );

  const applySettings = async (next: NotificationSettings) => {
    setSettings(next);
    await saveNotificationSettings(next);
    if (activeUserId) await rescheduleNotifications(db, activeUserId);
  };

  const handleToggleMaster = async (value: boolean) => {
    if (!settings) return;
    if (!value) {
      await applySettings({ ...settings, enabled: false });
      return;
    }

    let effectivePermission = permission;
    if (effectivePermission === 'undetermined') {
      const status = await requestNotificationPermission();
      effectivePermission = status.granted ? 'granted' : status.canAskAgain ? 'undetermined' : 'denied';
      setPermission(effectivePermission);
    }
    if (effectivePermission !== 'granted') return; // stays off — the banner explains why

    await applySettings({ ...settings, enabled: true });
  };

  if (!settings) return null;

  const sectionsEnabled = settings.enabled;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {permission !== 'granted' ? (
        <Card style={styles.banner}>
          <AppText variant="body">
            {permission === 'denied'
              ? 'Notifications are turned off in system Settings.'
              : 'Notifications aren’t turned on yet.'}
          </AppText>
          {permission === 'denied' ? (
            <AppText
              variant="label"
              color={colors.primary}
              onPress={() => Linking.openSettings()}
            >
              Open Settings
            </AppText>
          ) : null}
        </Card>
      ) : null}

      <View style={styles.row}>
        <AppText variant="title">Notifications</AppText>
        <Switch
          value={settings.enabled}
          onValueChange={handleToggleMaster}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      <View style={[styles.section, !sectionsEnabled && styles.sectionDisabled]} pointerEvents={sectionsEnabled ? 'auto' : 'none'}>
        <View style={styles.row}>
          <AppText variant="label">Daily reminder</AppText>
          <Switch
            value={settings.dailyEnabled}
            onValueChange={(value) => applySettings({ ...settings, dailyEnabled: value })}
            disabled={!sectionsEnabled}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        <AppText variant="caption" color={colors.textSecondary}>
          An optional nudge to log the day.
        </AppText>
        <OptionDropdown
          label="Time"
          options={TIME_LABELS}
          value={formatTime(settings.dailyTime)}
          onChange={(label) => {
            const option = TIME_OPTIONS.find((o) => o.label === label);
            if (option) applySettings({ ...settings, dailyTime: option.value });
          }}
        />
      </View>

      <View style={[styles.section, !sectionsEnabled && styles.sectionDisabled]} pointerEvents={sectionsEnabled ? 'auto' : 'none'}>
        <View style={styles.row}>
          <AppText variant="label">Weekly check-in reminder</AppText>
          <Switch
            value={settings.weeklyEnabled}
            onValueChange={(value) => applySettings({ ...settings, weeklyEnabled: value })}
            disabled={!sectionsEnabled}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        <AppText variant="caption" color={colors.textSecondary}>
          Fires when your POEM/RECAP is actually due, on your preferred day when
          possible — not strictly on that day.
        </AppText>
        <OptionDropdown
          label="Preferred day"
          options={[...WEEKDAY_NAMES]}
          value={WEEKDAY_NAMES[settings.weeklyPreferredDay]}
          onChange={(label) => {
            const index = WEEKDAY_NAMES.indexOf(label as (typeof WEEKDAY_NAMES)[number]);
            if (index >= 0) applySettings({ ...settings, weeklyPreferredDay: index as Weekday });
          }}
        />
        <OptionDropdown
          label="Time"
          options={TIME_LABELS}
          value={formatTime(settings.weeklyTime)}
          onChange={(label) => {
            const option = TIME_OPTIONS.find((o) => o.label === label);
            if (option) applySettings({ ...settings, weeklyTime: option.value });
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  banner: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    gap: spacing.sm,
  },
  sectionDisabled: {
    opacity: 0.5,
  },
});
