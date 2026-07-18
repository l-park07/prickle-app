import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { DEFAULT_NOTIFICATION_SETTINGS, Weekday } from '../../content/getNotification';
import { AssessmentHeaderBar } from '../components/AssessmentHeaderBar';
import { AssessmentNavFooter } from '../components/AssessmentNavFooter';
import { AssessmentProgressBar } from '../components/AssessmentProgressBar';
import { OnboardingMedicationsStep } from '../components/onboarding/OnboardingMedicationsStep';
import { OnboardingSitesStep } from '../components/onboarding/OnboardingSitesStep';
import { OnboardingSummaryStep } from '../components/onboarding/OnboardingSummaryStep';
import { OnboardingTriggersStep } from '../components/onboarding/OnboardingTriggersStep';
import { OnboardingWelcomeStep } from '../components/onboarding/OnboardingWelcomeStep';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthProvider';
import { useOnboarding } from '../context/OnboardingProvider';
import { useActiveUserId } from '../hooks/useActiveUserId';
import { todayISO } from '../lib/calendarMath';
import { DayEntryMedication, DayEntrySite, DayEntryTrigger, getDayEntry } from '../lib/chartSelectors';
import { db } from '../lib/db';
import { insertDailyLog } from '../lib/insertDailyLog';
import { addMedication, addSite, getActiveTrackedItemCounts, removeMedication, removeSite, TrackedItemCounts } from '../lib/manageTrackedItems';
import {
  addKnownTrigger,
  customSearchableTrigger,
  getSearchableTriggers,
  markSearchableTriggerAdded,
  markSearchableTriggerRemoved,
  removeKnownTrigger,
  type SearchableTrigger,
  type TriggerRowCategory,
} from '../lib/manageTriggers';
import { getPermissionStatus, requestNotificationPermission } from '../lib/notificationPermissions';
import { rescheduleNotifications } from '../lib/notificationScheduler';
import { saveNotificationSettings } from '../lib/notificationSettingsStore';
import { colors, spacing } from './theme';

const STEP_WELCOME = 0;
const STEP_SITES = 1;
const STEP_TRIGGERS = 2;
const STEP_MEDICATIONS = 3;
const STEP_SUMMARY = 4;
const TOTAL_STEPS = 5;

const STEP_TITLES = ['Welcome', 'Sites', 'Triggers', 'Medications', "You're all set"];
const EDIT_TITLES: Record<number, string> = {
  [STEP_SITES]: 'Edit Sites',
  [STEP_TRIGGERS]: 'Edit Triggers',
  [STEP_MEDICATIONS]: 'Edit Medications',
};

/**
 * First-run onboarding carousel — one mounted screen, no per-step sub-routes,
 * so "back preserves answers" and Summary's edit-jumps are free (nothing
 * ever unmounts, state just persists across `step` changes).
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { updateDisplayName } = useAuth();
  const { markOnboardingComplete } = useOnboarding();
  const activeUserId = useActiveUserId();

  const [step, setStep] = useState(STEP_WELCOME);
  const [editReturnTo, setEditReturnTo] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [name, setName] = useState('');
  const [sites, setSites] = useState<DayEntrySite[]>([]);
  const [triggers, setTriggers] = useState<DayEntryTrigger[]>([]);
  const [searchableTriggers, setSearchableTriggers] = useState<SearchableTrigger[]>([]);
  const [medications, setMedications] = useState<DayEntryMedication[]>([]);

  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [weeklyPreferredDay, setWeeklyPreferredDay] = useState<Weekday>(0);

  const [counts, setCounts] = useState<TrackedItemCounts>({ sites: 0, triggers: 0, medications: 0 });
  const [finishing, setFinishing] = useState(false);

  // Pre-populate from any existing data — addSite/addMedication have no
  // DB-level uniqueness constraint on name (addKnownTrigger does dedupe/revive
  // itself), so an interrupted and resumed onboarding session without this
  // would silently duplicate site/medication rows.
  useEffect(() => {
    if (!activeUserId) return;
    let cancelled = false;
    Promise.all([
      getDayEntry(db, activeUserId, todayISO()),
      getSearchableTriggers(db, activeUserId),
    ]).then(([entry, searchable]) => {
      if (cancelled) return;
      setSites(entry.sites);
      setTriggers(entry.triggers);
      setSearchableTriggers(searchable);
      setMedications(entry.medications);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  // Keep Summary's counts live — refetch every time it's shown, including on
  // return from an edit-jump, rather than tracking local counters.
  useEffect(() => {
    if (step !== STEP_SUMMARY || !activeUserId) return;
    let cancelled = false;
    getActiveTrackedItemCounts(db, activeUserId).then((result) => {
      if (!cancelled) setCounts(result);
    });
    return () => {
      cancelled = true;
    };
  }, [step, activeUserId]);

  const goToStep = (target: number, returnTo?: number) => {
    setStep(target);
    setEditReturnTo(returnTo ?? null);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (editReturnTo !== null) {
        goToStep(editReturnTo);
      } else if (step > STEP_WELCOME) {
        goToStep(step - 1);
      }
      return true; // always handled — no-op at step 0 rather than falling through to exit
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, editReturnTo]);

  const handleWelcomeContinue = async (trimmedName: string) => {
    await updateDisplayName(trimmedName);
    goToStep(STEP_SITES);
  };

  const handleAddSite = async (siteName: string) => {
    if (!activeUserId) return;
    const id = await addSite(db, activeUserId, siteName);
    setSites((prev) => [...prev, { id, name: siteName, score: 3 }]);
  };
  const handleRemoveSite = async (siteId: string) => {
    await removeSite(db, siteId);
    setSites((prev) => prev.filter((s) => s.id !== siteId));
  };
  const handleChangeScore = (siteId: string, score: number | null) => {
    setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, score } : s)));
  };

  // Only way to persist site_scores is via the daily-log path — this also
  // marks today as logged, so the daily reminder correctly skips today.
  const commitSitesBaseline = async () => {
    if (!activeUserId || sites.length === 0) return;
    await insertDailyLog(db, {
      userId: activeUserId,
      date: todayISO(),
      stress: null,
      mood: null,
      siteScores: Object.fromEntries(sites.map((s) => [s.id, s.score])),
      medicationIds: [],
      triggerIds: [],
    });
  };

  const handleSelectTriggerResult = async (result: SearchableTrigger) => {
    if (!activeUserId || result.triggerId) return; // already on the list — nothing to do
    const id = await addKnownTrigger(db, activeUserId, {
      slug: result.slug,
      label: result.label,
      category: result.category,
    });
    setTriggers((prev) => [
      ...prev,
      { id, name: result.label, category: result.category, checked: false, watched: false },
    ]);
    setSearchableTriggers((prev) => markSearchableTriggerAdded(prev, result.key, id));
  };

  const handleAddCustomTrigger = async (input: { label: string; category: TriggerRowCategory }) => {
    if (!activeUserId) return;
    const id = await addKnownTrigger(db, activeUserId, input);
    setTriggers((prev) => [
      ...prev,
      { id, name: input.label, category: input.category, checked: false, watched: false },
    ]);
    setSearchableTriggers((prev) => [...prev, customSearchableTrigger(id, input)]);
  };

  const handleRemoveTrigger = async (triggerId: string) => {
    await removeKnownTrigger(db, triggerId);
    setTriggers((prev) => prev.filter((t) => t.id !== triggerId));
    setSearchableTriggers((prev) => markSearchableTriggerRemoved(prev, triggerId));
  };

  const handleAddMedication = async (input: { name: string; deliveryMethod: string; frequency: string }) => {
    if (!activeUserId) return;
    const id = await addMedication(db, activeUserId, input);
    setMedications((prev) => [...prev, { id, name: input.name, category: 'other', checked: true }]);
  };
  const handleRemoveMedication = async (medicationId: string) => {
    await removeMedication(db, medicationId);
    setMedications((prev) => prev.filter((m) => m.id !== medicationId));
  };

  const finishOnboarding = async () => {
    setFinishing(true);
    try {
      const enabled = dailyEnabled || weeklyEnabled;
      let permissionGranted = false;
      if (enabled) {
        const status = await getPermissionStatus();
        permissionGranted = status.granted || (status.canAskAgain && (await requestNotificationPermission()).granted);
      }
      await saveNotificationSettings({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: enabled && permissionGranted,
        dailyEnabled,
        weeklyEnabled,
        weeklyPreferredDay,
      });
      if (activeUserId) await rescheduleNotifications(db, activeUserId);
      await markOnboardingComplete();
    } finally {
      setFinishing(false);
    }
  };

  const handleTakeFirstCheck = async () => {
    await finishOnboarding();
    // Two pushes, mirroring the ordinary in-app path byte-for-byte, so
    // 'weekly' is already in history before assessment.tsx's own
    // dismissTo('/weekly') runs.
    router.push('/weekly');
    router.push('/assessment');
  };

  const handleNotNow = async () => {
    await finishOnboarding();
    // No further navigation — same zero-navigation exit as sign-in/out,
    // relying on the onboarding-complete guard flip + React Navigation's
    // own reconciliation to land on (tabs)/Home.
  };

  if (!loaded) return null;

  const inEditMode = editReturnTo !== null;
  const title = (inEditMode ? EDIT_TITLES[step] : undefined) ?? STEP_TITLES[step];
  const showSharedChrome = step !== STEP_WELCOME && step !== STEP_SUMMARY;

  const handleNext = () => {
    if (step === STEP_SITES) {
      commitSitesBaseline().then(() => goToStep(inEditMode ? editReturnTo! : step + 1));
    } else {
      goToStep(inEditMode ? editReturnTo! : step + 1);
    }
  };

  return (
    <View style={styles.container}>
      <AssessmentHeaderBar title={title} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {step === STEP_WELCOME ? (
          <OnboardingWelcomeStep
            name={name}
            onChangeName={setName}
            onContinue={handleWelcomeContinue}
            onSkipSetup={markOnboardingComplete}
          />
        ) : step === STEP_SITES ? (
          <OnboardingSitesStep
            sites={sites}
            onAddSite={handleAddSite}
            onRemoveSite={handleRemoveSite}
            onChangeScore={handleChangeScore}
          />
        ) : step === STEP_TRIGGERS ? (
          <OnboardingTriggersStep
            triggers={triggers}
            searchResults={searchableTriggers}
            onSelectSearchResult={handleSelectTriggerResult}
            onAddCustomTrigger={handleAddCustomTrigger}
            onRemoveTrigger={handleRemoveTrigger}
          />
        ) : step === STEP_MEDICATIONS ? (
          <OnboardingMedicationsStep
            medications={medications}
            onAddMedication={handleAddMedication}
            onRemoveMedication={handleRemoveMedication}
          />
        ) : (
          <OnboardingSummaryStep
            counts={counts}
            onEditSites={() => goToStep(STEP_SITES, STEP_SUMMARY)}
            onEditTriggers={() => goToStep(STEP_TRIGGERS, STEP_SUMMARY)}
            onEditMedications={() => goToStep(STEP_MEDICATIONS, STEP_SUMMARY)}
            dailyEnabled={dailyEnabled}
            onChangeDailyEnabled={setDailyEnabled}
            weeklyEnabled={weeklyEnabled}
            onChangeWeeklyEnabled={setWeeklyEnabled}
            weeklyPreferredDay={weeklyPreferredDay}
            onChangeWeeklyPreferredDay={setWeeklyPreferredDay}
            onTakeFirstCheck={handleTakeFirstCheck}
            onNotNow={handleNotNow}
            finishing={finishing}
          />
        )}
      </ScrollView>

      {showSharedChrome ? (
        <View style={styles.footer}>
          {inEditMode ? (
            <PrimaryButton label="Done" onPress={handleNext} />
          ) : (
            <>
              <AssessmentProgressBar current={step + 1} total={TOTAL_STEPS} />
              <AssessmentNavFooter
                onBack={() => goToStep(step - 1)}
                onNext={handleNext}
                nextLabel="Next"
                onSkip={() => goToStep(step + 1)}
              />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
