import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { spacing } from '../app/theme';
import { formatLongDate } from '../lib/calendarMath';
import type { DayEntryPhoto, DayEntrySite } from '../lib/chartSelectors';
import { AppText } from './AppText';
import { PhotoDetailModal } from './PhotoDetailModal';
import { PhotoThumbnail } from './PhotoThumbnail';

interface TodayPhotosSectionProps {
  photos: DayEntryPhoto[];
  sites: DayEntrySite[];
  /** The day being viewed, 'YYYY-MM-DD' — every photo shown here was taken that day. */
  date: string;
}

/** Photos are optional/incidental — the whole section is omitted when none exist, unlike the fixed checklists. */
export function TodayPhotosSection({ photos, sites, date }: TodayPhotosSectionProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<DayEntryPhoto | null>(null);

  if (photos.length === 0) return null;

  const selectedSiteName = selectedPhoto
    ? sites.find((s) => s.id === selectedPhoto.siteId)?.name ?? null
    : null;

  return (
    <View style={styles.section}>
      <AppText variant="title">Photos</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((photo) => (
          <PhotoThumbnail
            key={photo.id}
            uri={photo.localUri || photo.cloudUrl || ''}
            onPress={() => setSelectedPhoto(photo)}
          />
        ))}
      </ScrollView>
      <PhotoDetailModal
        photo={selectedPhoto}
        siteName={selectedSiteName}
        dateLabel={formatLongDate(date)}
        onClose={() => setSelectedPhoto(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: { gap: spacing.sm },
});
