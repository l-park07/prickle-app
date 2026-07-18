import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TRIGGER_CATALOG, type CatalogTrigger, type TriggerCategory } from '../../../content/triggerCatalog';
import { AppText } from '../../components/AppText';
import { LogFab } from '../../components/LogFab';
import { CurrentlyWatchingCard } from '../../components/triggers/CurrentlyWatchingCard';
import { TriggerCategoryCard } from '../../components/triggers/TriggerCategoryCard';
import { TriggerDetailModal, type TriggerDetailTarget } from '../../components/triggers/TriggerDetailModal';
import { YourTriggersSection } from '../../components/triggers/YourTriggersSection';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { db } from '../../lib/db';
import {
  addKnownTrigger,
  endObservation,
  getActiveObservations,
  getSearchableTriggers,
  removeKnownTrigger,
  startObservation,
  type ActiveObservation,
  type SearchableTrigger,
  type TriggerRowCategory,
} from '../../lib/manageTriggers';
import { colors, spacing } from '../theme';

export default function Triggers() {
  const activeUserId = useActiveUserId();

  const [activeObservations, setActiveObservations] = useState<ActiveObservation[]>([]);
  const [searchableTriggers, setSearchableTriggers] = useState<SearchableTrigger[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<TriggerDetailTarget | null>(null);
  const [modalInitialStep, setModalInitialStep] = useState<'detail' | 'window'>('detail');

  const refresh = async () => {
    if (!activeUserId) return;
    const [observations, searchable] = await Promise.all([
      getActiveObservations(db, activeUserId),
      getSearchableTriggers(db, activeUserId),
    ]);
    setActiveObservations(observations);
    setSearchableTriggers(searchable);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  const addedBySlug = new Map(searchableTriggers.filter((r) => r.slug).map((r) => [r.slug as string, r]));
  const myTriggers = searchableTriggers.filter((r) => r.added);

  const handleEndEarly = async (experimentId: string) => {
    await endObservation(db, experimentId);
    await refresh();
  };

  const handleRemoveTrigger = async (triggerId: string) => {
    await removeKnownTrigger(db, triggerId);
    await refresh();
  };

  const handleAddCustomTrigger = async (input: { label: string; category: TriggerRowCategory }) => {
    if (!activeUserId) return;
    await addKnownTrigger(db, activeUserId, input);
    await refresh();
  };

  const handleStartWatchingFromB = (trigger: SearchableTrigger) => {
    setSelectedTarget({
      triggerId: trigger.triggerId,
      slug: trigger.slug,
      label: trigger.label,
      category: trigger.category,
      watched: trigger.watched,
    });
    setModalInitialStep('window');
  };

  const handleSelectCatalogTrigger = (trigger: CatalogTrigger, category: TriggerCategory) => {
    const known = addedBySlug.get(trigger.id);
    setSelectedTarget({
      triggerId: known?.triggerId ?? null,
      slug: trigger.id,
      label: trigger.label,
      category: category.id,
      watched: known?.watched ?? false,
    });
    setModalInitialStep('detail');
  };

  const handleAddToMyTriggers = async () => {
    if (!activeUserId || !selectedTarget) return;
    const id = await addKnownTrigger(db, activeUserId, {
      slug: selectedTarget.slug,
      label: selectedTarget.label,
      category: selectedTarget.category,
    });
    setSelectedTarget((prev) => (prev ? { ...prev, triggerId: id } : prev));
    await refresh();
  };

  const handleConfirmWatch = async ({ startDate, durationDays }: { startDate: string; durationDays: number }) => {
    if (!activeUserId || !selectedTarget) return;
    const triggerId =
      selectedTarget.triggerId ??
      (await addKnownTrigger(db, activeUserId, {
        slug: selectedTarget.slug,
        label: selectedTarget.label,
        category: selectedTarget.category,
      }));
    await startObservation(db, activeUserId, { triggerId, startDate, durationDays });
    await refresh();
    setSelectedTarget(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h1" color={colors.accent}>
          Triggers
        </AppText>
        <AppText variant="body" color={colors.textSecondary}>
          Observing triggers is important to reducing flares. Everyone's triggers are
          different. See some common ones below!
        </AppText>

        {activeObservations.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="title">Currently watching</AppText>
            {activeObservations.map((observation) => (
              <CurrentlyWatchingCard
                key={observation.experimentId}
                observation={observation}
                onEndEarly={handleEndEarly}
              />
            ))}
          </View>
        ) : null}

        <YourTriggersSection
          triggers={myTriggers}
          onStartWatching={handleStartWatchingFromB}
          onRemove={handleRemoveTrigger}
          onAddCustomTrigger={handleAddCustomTrigger}
        />

        <View style={styles.section}>
          <AppText variant="title">Explore common triggers</AppText>
          {TRIGGER_CATALOG.map((category) => (
            <TriggerCategoryCard
              key={category.id}
              category={category}
              addedBySlug={addedBySlug}
              onSelectTrigger={handleSelectCatalogTrigger}
            />
          ))}
        </View>
      </ScrollView>

      <TriggerDetailModal
        target={selectedTarget}
        initialStep={modalInitialStep}
        activeObservationCount={activeObservations.length}
        onClose={() => setSelectedTarget(null)}
        onAddToMyTriggers={handleAddToMyTriggers}
        onConfirmWatch={handleConfirmWatch}
      />

      <LogFab />
    </View>
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
  section: {
    gap: spacing.sm,
  },
});
