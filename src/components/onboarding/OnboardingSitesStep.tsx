import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../../app/theme';
import { AppText } from '../AppText';
import { SeverityInput } from '../SeverityInput';

export interface OnboardingSite {
  id: string;
  name: string;
  score: number | null;
}

interface OnboardingSitesStepProps {
  sites: OnboardingSite[];
  onAddSite: (name: string) => void;
  onRemoveSite: (siteId: string) => void;
  onChangeScore: (siteId: string, score: number | null) => void;
}

/** Step 2 — a lighter version of the Log modal's Sites section: no photos, just name + a baseline severity. */
export function OnboardingSitesStep({
  sites,
  onAddSite,
  onRemoveSite,
  onChangeScore,
}: OnboardingSitesStepProps) {
  const [draftName, setDraftName] = useState('');

  const handleAdd = () => {
    const name = draftName.trim();
    if (!name) return;
    onAddSite(name);
    setDraftName('');
  };

  return (
    <View style={styles.container}>
      <AppText variant="h2">Where does it usually show up?</AppText>
      <AppText variant="body" color={colors.textSecondary}>
        Add the spots you keep an eye on, with a rough starting severity. You can add more anytime.
      </AppText>

      {sites.map((site) => (
        <View key={site.id} style={styles.siteRow}>
          <View style={styles.siteHeader}>
            <AppText variant="label">{site.name}</AppText>
            <Pressable
              onPress={() => onRemoveSite(site.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${site.name}`}
              hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <SeverityInput value={site.score} onChange={(score) => onChangeScore(site.id, score)} />
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={draftName}
          onChangeText={setDraftName}
          placeholder="e.g. Elbows"
          placeholderTextColor={colors.textSecondary}
        />
        <Pressable onPress={handleAdd} accessibilityRole="button" style={styles.addConfirm}>
          <AppText variant="label" color={colors.onPrimary}>
            Add
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  siteRow: {
    gap: spacing.xs,
  },
  siteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  addConfirm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
});
