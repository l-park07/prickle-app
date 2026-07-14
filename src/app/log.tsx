import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { Card } from '../components/Card';
import { LogMedicationsSection } from '../components/LogMedicationsSection';
import { LogMoodSection } from '../components/LogMoodSection';
import { LogPhotosSection } from '../components/LogPhotosSection';
import { LogSitesSection } from '../components/LogSitesSection';
import { LogTriggersSection } from '../components/LogTriggersSection';
import { PrimaryButton } from '../components/PrimaryButton';
import { useActiveUserId } from '../hooks/useActiveUserId';
import {
  DayEntryMedication,
  DayEntryPhoto,
  DayEntrySite,
  DayEntryTrigger,
  getDayEntry,
} from '../lib/chartSelectors';
import { db } from '../lib/db';
import { insertDailyLog } from '../lib/insertDailyLog';
import {
  addMedication,
  addSite,
  addTrigger,
  removeMedication,
  removeSite,
  removeTrigger,
} from '../lib/manageTrackedItems';
import { addPhoto, removePhoto } from '../lib/managePhotos';
import { captureFromCamera, pickFromLibrary } from '../lib/photoCapture';
import { colors, spacing } from './theme';

export default function LogModal() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const activeUserId = useActiveUserId();

  const [sites, setSites] = useState<DayEntrySite[]>([]);
  const [mood, setMood] = useState(3);
  const [triggers, setTriggers] = useState<DayEntryTrigger[]>([]);
  const [medications, setMedications] = useState<DayEntryMedication[]>([]);
  const [photos, setPhotos] = useState<DayEntryPhoto[]>([]);
  const [logId, setLogId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeUserId || !date) return;
    let cancelled = false;
    getDayEntry(db, activeUserId, date).then((entry) => {
      if (cancelled) return;
      setSites(entry.sites);
      setMood(entry.mood ?? 3);
      setTriggers(entry.triggers);
      setMedications(entry.medications);
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

  const handleAddTrigger = async (name: string) => {
    if (!activeUserId) return;
    const id = await addTrigger(db, activeUserId, name);
    setTriggers((prev) => [...prev, { id, name, checked: true }]);
  };

  const handleRemoveTrigger = async (triggerId: string) => {
    await removeTrigger(db, triggerId);
    setTriggers((prev) => prev.filter((t) => t.id !== triggerId));
  };

  const handleToggleMedication = (medicationId: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === medicationId ? { ...m, checked: !m.checked } : m))
    );
  };

  const handleAddMedication = async (input: {
    name: string;
    deliveryMethod: string;
    frequency: string;
  }) => {
    if (!activeUserId) return;
    const id = await addMedication(db, activeUserId, input);
    setMedications((prev) => [
      ...prev,
      { id, name: input.name, category: 'other', checked: true },
    ]);
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
      stress: null,
      mood,
      siteScores: Object.fromEntries(sites.map((s) => [s.id, s.score])),
      medicationIds: medications.filter((m) => m.checked).map((m) => m.id),
      triggerIds: triggers.filter((t) => t.checked).map((t) => t.id),
    });
    setLogId(id);
    return id;
  };

  const handleAddPhoto = async (siteId: string | null, source: 'camera' | 'library') => {
    if (!activeUserId || !date) return;
    try {
      const localUri = source === 'camera' ? await captureFromCamera() : await pickFromLibrary();
      if (!localUri) return; // cancelled or permission denied — already handled/alerted

      // Read the score and materialize the log from the same in-memory `sites`
      // snapshot so the site_scores row and this photo's score never diverge.
      const ensuredLogId = logId ?? (await persistLog());
      const score = siteId ? sites.find((s) => s.id === siteId)?.score ?? null : null;
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
          onToggle={handleToggleTrigger}
          onAddTrigger={handleAddTrigger}
          onRemoveTrigger={handleRemoveTrigger}
        />
        <LogMedicationsSection
          medications={medications}
          onToggle={handleToggleMedication}
          onAddMedication={handleAddMedication}
          onRemoveMedication={handleRemoveMedication}
        />
        <LogPhotosSection
          photos={photos}
          onAdd={(source) => handleAddPhoto(null, source)}
          onRemove={handleRemovePhoto}
        />
        <PrimaryButton label="Save" onPress={handleSave} loading={saving} />
      </Card>
    </ScrollView>
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
  entryCard: {
    gap: spacing.lg,
  },
});
