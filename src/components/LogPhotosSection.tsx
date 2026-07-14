import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../app/theme';
import type { DayEntryPhoto } from '../lib/chartSelectors';
import { AppText } from './AppText';
import { LogPhotoThumbnail } from './LogPhotoThumbnail';
import { PrimaryButton } from './PrimaryButton';

interface LogPhotosSectionProps {
  /** Full day's photos — this section shows only the untagged (site_id null) ones. */
  photos: DayEntryPhoto[];
  onAdd: (source: 'camera' | 'library') => void;
  onRemove: (photoId: string) => void;
}

/** Optional day-level photo, not tagged to any site. */
export function LogPhotosSection({ photos, onAdd, onRemove }: LogPhotosSectionProps) {
  const dayPhotos = photos.filter((p) => p.siteId === null);

  const handleAddPress = () => {
    Alert.alert('Add a photo', undefined, [
      { text: 'Take Photo', onPress: () => onAdd('camera') },
      { text: 'Choose from Library', onPress: () => onAdd('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.section}>
      <AppText variant="title">Photos</AppText>
      {dayPhotos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {dayPhotos.map((photo) => (
            <LogPhotoThumbnail key={photo.id} uri={photo.localUri} onRemove={() => onRemove(photo.id)} />
          ))}
        </ScrollView>
      ) : (
        <AppText variant="caption" color={colors.textSecondary}>
          No day-level photos yet
        </AppText>
      )}
      <PrimaryButton label="Add Picture" onPress={handleAddPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
});
