import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../app/theme';
import type { DayEntryPhoto } from '../lib/chartSelectors';
import { AppText } from './AppText';
import { LogPhotoThumbnail } from './LogPhotoThumbnail';
import { SeverityInput } from './SeverityInput';

interface LogSite {
  id: string;
  name: string;
  score: number | null;
}

interface LogSitesSectionProps {
  sites: LogSite[];
  photos: DayEntryPhoto[];
  onChangeScore: (siteId: string, score: number | null) => void;
  onAddSite: (name: string) => void;
  onRemoveSite: (siteId: string) => void;
  onAddPhoto: (siteId: string, source: 'camera' | 'library') => void;
  onRemovePhoto: (photoId: string) => void;
}

/** Editable Sites section — per-site severity sliders, photos, plus add/remove of the master list. */
export function LogSitesSection({
  sites,
  photos,
  onChangeScore,
  onAddSite,
  onRemoveSite,
  onAddPhoto,
  onRemovePhoto,
}: LogSitesSectionProps) {
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState('');

  const confirmRemove = (site: LogSite) => {
    Alert.alert('Remove this site?', `"${site.name}" will no longer appear in your daily log.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemoveSite(site.id) },
    ]);
  };

  const handleAddPhotoPress = (siteId: string) => {
    Alert.alert('Add a photo', undefined, [
      { text: 'Take Photo', onPress: () => onAddPhoto(siteId, 'camera') },
      { text: 'Choose from Library', onPress: () => onAddPhoto(siteId, 'library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleAdd = () => {
    const name = draftName.trim();
    if (!name) return;
    onAddSite(name);
    setDraftName('');
    setAdding(false);
  };

  return (
    <View style={styles.section}>
      <AppText variant="title">Sites</AppText>

      {sites.map((site) => {
        const sitePhotos = photos.filter((p) => p.siteId === site.id);
        return (
          <View key={site.id} style={styles.siteRow}>
            <View style={styles.siteHeader}>
              <AppText variant="label">{site.name}</AppText>
              <View style={styles.siteActions}>
                <Pressable
                  onPress={() => handleAddPhotoPress(site.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add photo for ${site.name}`}
                  hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => confirmRemove(site)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${site.name}`}
                  hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <SeverityInput
              value={site.score}
              onChange={(score) => onChangeScore(site.id, score)}
            />
            {sitePhotos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                {sitePhotos.map((photo) => (
                  <LogPhotoThumbnail
                    key={photo.id}
                    uri={photo.localUri}
                    onRemove={() => onRemovePhoto(photo.id)}
                  />
                ))}
              </ScrollView>
            ) : null}
          </View>
        );
      })}

      {adding ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Site name"
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
          <Pressable onPress={handleAdd} accessibilityRole="button" style={styles.addConfirm}>
            <AppText variant="label" color={colors.onPrimary}>
              Add
            </AppText>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setAdding(true)} accessibilityRole="button">
          <AppText variant="label" color={colors.primary}>
            + Add site
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
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
  siteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  photoRow: {
    gap: spacing.sm,
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
