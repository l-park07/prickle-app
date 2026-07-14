import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, overlay, radius, spacing } from '../app/theme';
import type { DayEntryPhoto } from '../lib/chartSelectors';
import { AppText } from './AppText';

interface PhotoDetailModalProps {
  /** null = closed. */
  photo: DayEntryPhoto | null;
  /** Resolved site name, or null for an untagged day-level photo. */
  siteName: string | null;
  /** Already-formatted date label, e.g. "July 14th". */
  dateLabel: string;
  onClose: () => void;
}

/** Full-screen photo viewer with a one-line caption directly under the image, opened from a PhotoThumbnail tap. */
export function PhotoDetailModal({ photo, siteName, dateLabel, onClose }: PhotoDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const caption = photo
    ? [dateLabel, siteName, siteName ? (photo.score !== null ? `Score: ${photo.score}` : 'Not scored') : null]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Modal visible={photo !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        {photo ? (
          <>
            <View style={styles.contentWrap}>
              <Image
                source={{ uri: photo.localUri }}
                style={[styles.image, { height: windowHeight * 0.6 }]}
                contentFit="contain"
              />
              <View style={styles.captionBar}>
                <AppText variant="body" color={colors.textInverse} numberOfLines={1}>
                  {caption}
                </AppText>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={[styles.closeButton, { top: insets.top + spacing.sm }]}
              hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
            >
              <Ionicons name="close" size={28} color={colors.textInverse} />
            </Pressable>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: overlay,
    justifyContent: 'center',
  },
  contentWrap: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    backgroundColor: colors.textPrimary,
  },
  captionBar: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.lg,
  },
});
