import { StyleSheet, Switch, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { Weekday, WEEKDAY_NAMES } from '../../../content/getNotification';
import type { TrackedItemCounts } from '../../lib/manageTrackedItems';
import { AppText } from '../AppText';
import { OptionDropdown } from '../OptionDropdown';
import { PrimaryButton } from '../PrimaryButton';
import { SettingsRow } from '../SettingsRow';

interface OnboardingSummaryStepProps {
  counts: TrackedItemCounts;
  onEditSites: () => void;
  onEditTriggers: () => void;
  onEditMedications: () => void;
  dailyEnabled: boolean;
  onChangeDailyEnabled: (value: boolean) => void;
  weeklyEnabled: boolean;
  onChangeWeeklyEnabled: (value: boolean) => void;
  weeklyPreferredDay: Weekday;
  onChangeWeeklyPreferredDay: (day: Weekday) => void;
  onTakeFirstCheck: () => void;
  onNotNow: () => void;
  finishing: boolean;
}

/** Step 4 (0-indexed) — review what was set up, opt into reminders, then finish. */
export function OnboardingSummaryStep({
  counts,
  onEditSites,
  onEditTriggers,
  onEditMedications,
  dailyEnabled,
  onChangeDailyEnabled,
  weeklyEnabled,
  onChangeWeeklyEnabled,
  weeklyPreferredDay,
  onChangeWeeklyPreferredDay,
  onTakeFirstCheck,
  onNotNow,
  finishing,
}: OnboardingSummaryStepProps) {
  return (
    <View style={styles.container}>
      <AppText variant="h2">You're all set</AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Change any of this later in Settings.
      </AppText>

      <View style={styles.rows}>
        <SettingsRow label={`Sites · ${counts.sites}`} onPress={onEditSites} />
        <SettingsRow label={`Triggers · ${counts.triggers}`} onPress={onEditTriggers} />
        <SettingsRow label={`Medications · ${counts.medications}`} onPress={onEditMedications} />
      </View>

      <View style={styles.reminders}>
        <View style={styles.row}>
          <AppText variant="label">Daily log reminder</AppText>
          <Switch
            value={dailyEnabled}
            onValueChange={onChangeDailyEnabled}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        <View style={styles.row}>
          <AppText variant="label">Weekly check-in reminder</AppText>
          <Switch
            value={weeklyEnabled}
            onValueChange={onChangeWeeklyEnabled}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        {weeklyEnabled ? (
          <OptionDropdown
            label="Preferred day"
            options={[...WEEKDAY_NAMES]}
            value={WEEKDAY_NAMES[weeklyPreferredDay]}
            onChange={(label) => {
              const index = WEEKDAY_NAMES.indexOf(label as (typeof WEEKDAY_NAMES)[number]);
              if (index >= 0) onChangeWeeklyPreferredDay(index as Weekday);
            }}
          />
        ) : null}
      </View>

      <View style={styles.invite}>
        <AppText variant="body" color={colors.textSecondary}>
          Want a starting point? Take your first weekly check (about 5 minutes).
        </AppText>
        <PrimaryButton
          label="Take your first weekly check"
          onPress={onTakeFirstCheck}
          loading={finishing}
        />
        <PrimaryButton label="Not now" onPress={onNotNow} loading={finishing} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  rows: {
    gap: 0,
  },
  reminders: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invite: {
    gap: spacing.sm,
  },
});
