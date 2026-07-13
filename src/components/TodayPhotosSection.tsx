import { ScrollView, StyleSheet, View } from 'react-native';
import { spacing } from '../app/theme';
import type { DayEntryPhoto } from '../lib/chartSelectors';
import { AppText } from './AppText';
import { PhotoThumbnail } from './PhotoThumbnail';

interface TodayPhotosSectionProps {
  photos: DayEntryPhoto[];
}

/** Photos are optional/incidental — the whole section is omitted when none exist, unlike the fixed checklists. */
export function TodayPhotosSection({ photos }: TodayPhotosSectionProps) {
  if (photos.length === 0) return null;

  return (
    <View style={styles.section}>
      <AppText variant="title">Photos</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((photo) => (
          <PhotoThumbnail key={photo.id} uri={photo.localUri || photo.cloudUrl || ''} />
        ))}
      </ScrollView>
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
