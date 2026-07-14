import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card } from '../components/Card';
import { LogMedicationsSection } from '../components/LogMedicationsSection';
import { LogMoodSection } from '../components/LogMoodSection';
import { LogSitesSection } from '../components/LogSitesSection';
import { LogTriggersSection } from '../components/LogTriggersSection';
import { PrimaryButton } from '../components/PrimaryButton';
import { useActiveUserId } from '../hooks/useActiveUserId';
import {
  DayEntryMedication,
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
import { colors, spacing } from './theme';

export default function LogModal() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const activeUserId = useActiveUserId();

  const [sites, setSites] = useState<DayEntrySite[]>([]);
  const [mood, setMood] = useState(3);
  const [triggers, setTriggers] = useState<DayEntryTrigger[]>([]);
  const [medications, setMedications] = useState<DayEntryMedication[]>([]);
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

  const handleSave = async () => {
    if (!activeUserId || !date) return;
    setSaving(true);
    await insertDailyLog(db, {
      userId: activeUserId,
      date,
      stress: null,
      mood,
      siteScores: Object.fromEntries(sites.map((s) => [s.id, s.score])),
      medicationIds: medications.filter((m) => m.checked).map((m) => m.id),
      triggerIds: triggers.filter((t) => t.checked).map((t) => t.id),
    });
    router.back();
  };

  if (!loaded) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.entryCard}>
        <LogSitesSection
          sites={sites}
          onChangeScore={handleChangeScore}
          onAddSite={handleAddSite}
          onRemoveSite={handleRemoveSite}
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
