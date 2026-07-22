import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { LogMoodSection } from '../components/LogMoodSection';
import { LogSitesSection } from '../components/LogSitesSection';
import { LogTreatmentsSection } from '../components/LogTreatmentsSection';
import { LogTriggersSection } from '../components/LogTriggersSection';
import { PrimaryButton } from '../components/PrimaryButton';
import { ObservationNotesModal, type ObservationNotesTarget } from '../components/triggers/ObservationNotesModal';
import { useActiveUserId } from '../hooks/useActiveUserId';
import { formatFullFriendlyDate, todayISO } from '../lib/calendarMath';
import {
  DayEntryMedication,
  DayEntryPhoto,
  DayEntrySite,
  DayEntryTrigger,
  getDayEntry,
  getPreviousDayEntry,
} from '../lib/chartSelectors';
import { db } from '../lib/db';
import { insertDailyLog } from '../lib/insertDailyLog';
import { addSite, removeMedication, removeSite } from '../lib/manageTrackedItems';
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
import { addPhoto, removePhoto } from '../lib/managePhotos';
import {
  addFreeTypedTreatment,
  addTreatmentFromLibrary,
  clearTreatmentRest,
  startTreatmentRest,
  updateTreatmentDetails,
  type TreatmentDetails,
  type TreatmentMatch,
} from '../lib/manageTreatments';
import { rescheduleNotifications } from '../lib/notificationScheduler';
import { captureFromCamera, pickFromLibrary } from '../lib/photoCapture';
import { colors, spacing } from './theme';

export default function LogModal() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const activeUserId = useActiveUserId();

  const [sites, setSites] = useState<DayEntrySite[]>([]);
  const [mood, setMood] = useState(3);
  const [triggers, setTriggers] = useState<DayEntryTrigger[]>([]);
  const [searchableTriggers, setSearchableTriggers] = useState<SearchableTrigger[]>([]);
  const [medications, setMedications] = useState<DayEntryMedication[]>([]);
  const [photos, setPhotos] = useState<DayEntryPhoto[]>([]);
  const [logId, setLogId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notesTarget, setNotesTarget] = useState<ObservationNotesTarget | null>(null);

  useEffect(() => {
    if (!activeUserId || !date) return;
    let cancelled = false;
    Promise.all([
      getDayEntry(db, activeUserId, date),
      getSearchableTriggers(db, activeUserId),
    ]).then(async ([entry, searchable]) => {
      if (cancelled) return;

      let sitesToSet = entry.sites;
      let triggersToSet = entry.triggers;
      let medicationsToSet = entry.medications;
      let moodToSet = entry.mood ?? 3;

      // Brand-new day: borrow the most recent previous log's values so
      // logging is faster. Never runs when the day already has an entry.
      if (entry.logId === null) {
        const previous = await getPreviousDayEntry(db, activeUserId, date);
        if (cancelled) return;
        if (previous) {
          const prevScoreById = new Map(previous.sites.map((s) => [s.id, s.score]));
          sitesToSet = entry.sites.map((s) =>
            prevScoreById.has(s.id) ? { ...s, score: prevScoreById.get(s.id)! } : s
          );

          const prevCheckedTriggerById = new Map(previous.triggers.map((t) => [t.id, t.checked]));
          triggersToSet = entry.triggers.map((t) =>
            prevCheckedTriggerById.has(t.id)
              ? { ...t, checked: prevCheckedTriggerById.get(t.id)! }
              : t
          );

          const prevCheckedMedicationById = new Map(
            previous.medications.map((m) => [m.id, m.checked])
          );
          medicationsToSet = entry.medications.map((m) =>
            prevCheckedMedicationById.has(m.id)
              ? { ...m, checked: prevCheckedMedicationById.get(m.id)! }
              : m
          );

          moodToSet = previous.mood ?? moodToSet;
        }
      }

      setSites(sitesToSet);
      setMood(moodToSet);
      setTriggers(triggersToSet);
      setSearchableTriggers(searchable);
      setMedications(medicationsToSet);
      setPhotos(entry.photos);
      setLogId(entry.logId);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId, date]);

  const handleChangeScore = (siteId: string, score: number | null) => {
    setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, score } : s)));
  };

  const handleAddSite = async (name: string) => {
    if (!activeUserId) return;
    const id = await addSite(db, activeUserId, name);
    setSites((prev) => [...prev, { id, name, score: 3 }]);
  };

  const handleRemoveSite = async (siteId: string) => {
    await removeSite(db, siteId);
    setSites((prev) => prev.filter((s) => s.id !== siteId));
  };

  const handleToggleTrigger = (triggerId: string) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === triggerId ? { ...t, checked: !t.checked } : t))
    );
  };

  const handleSelectTriggerResult = async (result: SearchableTrigger) => {
    if (!activeUserId) return;
    if (result.triggerId) {
      // Already on the list — just check it for today. No-op if already checked.
      setTriggers((prev) =>
        prev.map((t) => (t.id === result.triggerId ? { ...t, checked: true } : t))
      );
      return;
    }
    const id = await addKnownTrigger(db, activeUserId, {
      slug: result.slug,
      label: result.label,
      category: result.category,
    });
    setTriggers((prev) => [
      ...prev,
      {
        id,
        name: result.label,
        category: result.category,
        checked: true,
        watched: false,
        observationStart: null,
        observationEnd: null,
        experimentId: null,
      },
    ]);
    setSearchableTriggers((prev) => markSearchableTriggerAdded(prev, result.key, id));
  };

  const handleAddCustomTrigger = async (input: { label: string; category: TriggerRowCategory }) => {
    if (!activeUserId) return;
    const id = await addKnownTrigger(db, activeUserId, input);
    setTriggers((prev) => [
      ...prev,
      {
        id,
        name: input.label,
        category: input.category,
        checked: true,
        watched: false,
        observationStart: null,
        observationEnd: null,
        experimentId: null,
      },
    ]);
    setSearchableTriggers((prev) => [...prev, customSearchableTrigger(id, input)]);
  };

  const handleRemoveTrigger = async (triggerId: string) => {
    await removeKnownTrigger(db, triggerId);
    setTriggers((prev) => prev.filter((t) => t.id !== triggerId));
    setSearchableTriggers((prev) => markSearchableTriggerRemoved(prev, triggerId));
  };

  const handleAddNote = (trigger: DayEntryTrigger) => {
    if (!trigger.experimentId || !trigger.observationStart || !trigger.observationEnd) return;
    setNotesTarget({
      experimentId: trigger.experimentId,
      label: trigger.name,
      category: trigger.category as TriggerRowCategory,
      startDate: trigger.observationStart,
      endDate: trigger.observationEnd,
      autoCompose: true,
    });
  };

  const handleToggleMedication = (medicationId: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === medicationId ? { ...m, checked: !m.checked } : m))
    );
  };

  const handleSelectTreatmentMatch = async (match: TreatmentMatch) => {
    if (!activeUserId) return;
    if (match.kind === 'saved') {
      // Already on the list — just check it for today. No-op if already checked.
      setMedications((prev) =>
        prev.map((m) => (m.id === match.treatmentId ? { ...m, checked: true } : m))
      );
      return;
    }
    const id = await addTreatmentFromLibrary(db, activeUserId, match.entry, match.matchedName);
    setMedications((prev) => [
      ...prev,
      {
        id,
        name: match.matchedName,
        category: 'other',
        checked: true,
        type: match.entry.type,
        deliveryMethod: match.entry.method,
        isSteroid: match.entry.isSteroid ?? false,
        cadenceEvery: null,
        cadenceUnit: null,
        isPrn: false,
        activeCount: null,
        activeUnit: null,
        restCount: null,
        restUnit: null,
        restStartedAt: null,
      },
    ]);
  };

  const handleAddFreeTypedTreatment = async (name: string) => {
    if (!activeUserId) return;
    const id = await addFreeTypedTreatment(db, activeUserId, name);
    setMedications((prev) => [
      ...prev,
      {
        id,
        name: name.trim(),
        category: 'other',
        checked: true,
        type: null,
        deliveryMethod: null,
        isSteroid: null,
        cadenceEvery: null,
        cadenceUnit: null,
        isPrn: false,
        activeCount: null,
        activeUnit: null,
        restCount: null,
        restUnit: null,
        restStartedAt: null,
      },
    ]);
  };

  const handleUpdateTreatmentDetails = async (treatmentId: string, details: TreatmentDetails) => {
    await updateTreatmentDetails(db, treatmentId, details);
    setMedications((prev) => prev.map((m) => (m.id === treatmentId ? { ...m, ...details } : m)));
  };

  const handleStartTreatmentRest = async (treatmentId: string) => {
    await startTreatmentRest(db, treatmentId);
    setMedications((prev) =>
      prev.map((m) => (m.id === treatmentId ? { ...m, restStartedAt: todayISO() } : m))
    );
  };

  const handleCompleteTreatmentRest = async (treatmentId: string) => {
    await clearTreatmentRest(db, treatmentId);
    setMedications((prev) =>
      prev.map((m) => (m.id === treatmentId ? { ...m, restStartedAt: null } : m))
    );
  };

  const handleRemoveMedication = async (medicationId: string) => {
    await removeMedication(db, medicationId);
    setMedications((prev) => prev.filter((m) => m.id !== medicationId));
  };

  /** Upserts the day's fields from whatever's currently in state; also used to
   * materialize a real log_id the first time a photo is added, before the
   * user has pressed Save (see handleAddPhoto) — this makes that first photo
   * add an implicit partial save, which is intentional: a photo is real,
   * deliberate evidence and shouldn't be gated behind a later Save tap. */
  const persistLog = async (): Promise<string> => {
    const id = await insertDailyLog(db, {
      userId: activeUserId!,
      date: date!,
      stress: null, // no stress control in this screen yet — getPreviousDayEntry already returns it for whenever one is added
      mood,
      siteScores: Object.fromEntries(sites.map((s) => [s.id, s.score])),
      medicationIds: medications.filter((m) => m.checked).map((m) => m.id),
      triggerIds: triggers.filter((t) => t.checked).map((t) => t.id),
    });
    setLogId(id);
    // A saved log may be today's — cancel the daily reminder immediately
    // rather than leaving it queued until the next app-foreground.
    await rescheduleNotifications(db, activeUserId!);
    return id;
  };

  const handleAddPhoto = async (siteId: string, source: 'camera' | 'library') => {
    if (!activeUserId || !date) return;
    try {
      const localUri = source === 'camera' ? await captureFromCamera() : await pickFromLibrary();
      if (!localUri) return; // cancelled or permission denied — already handled/alerted

      // Read the score and materialize the log from the same in-memory `sites`
      // snapshot so the site_scores row and this photo's score never diverge.
      const ensuredLogId = logId ?? (await persistLog());
      const score = sites.find((s) => s.id === siteId)?.score ?? null;
      const takenAt = new Date().toISOString();

      const id = await addPhoto(db, {
        userId: activeUserId,
        logId: ensuredLogId,
        siteId,
        localUri,
        score,
        takenAt,
      });
      setPhotos((prev) => [...prev, { id, siteId, localUri, cloudUrl: null, score, takenAt }]);
    } catch {
      Alert.alert('Couldn’t add photo', 'Something went wrong saving that photo. Please try again.');
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    await removePhoto(db, photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleSave = async () => {
    if (!activeUserId || !date) return;
    setSaving(true);
    await persistLog();
    router.back();
  };

  if (!loaded) return null;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {date ? (
          <AppText variant="h2" style={styles.dateHeading}>
            {formatFullFriendlyDate(date)}
          </AppText>
        ) : null}
        <Card style={styles.entryCard}>
          <LogSitesSection
            sites={sites}
            photos={photos}
            onChangeScore={handleChangeScore}
            onAddSite={handleAddSite}
            onRemoveSite={handleRemoveSite}
            onAddPhoto={handleAddPhoto}
            onRemovePhoto={handleRemovePhoto}
          />
          <LogMoodSection mood={mood} onChange={setMood} />
          <LogTriggersSection
            triggers={triggers}
            searchResults={searchableTriggers}
            onToggle={handleToggleTrigger}
            onSelectSearchResult={handleSelectTriggerResult}
            onAddCustomTrigger={handleAddCustomTrigger}
            onRemoveTrigger={handleRemoveTrigger}
            onAddNote={handleAddNote}
          />
          <LogTreatmentsSection
            treatments={medications}
            onToggle={handleToggleMedication}
            onSelectMatch={handleSelectTreatmentMatch}
            onAddFreeTyped={handleAddFreeTypedTreatment}
            onRemoveTreatment={handleRemoveMedication}
            onUpdateDetails={handleUpdateTreatmentDetails}
            onStartRest={handleStartTreatmentRest}
            onCompleteRest={handleCompleteTreatmentRest}
          />
          <PrimaryButton label="Save" onPress={handleSave} loading={saving} />
        </Card>
      </ScrollView>

      <ObservationNotesModal target={notesTarget} onClose={() => setNotesTarget(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  dateHeading: {
    textAlign: 'center',
  },
  entryCard: {
    gap: spacing.lg,
  },
});
