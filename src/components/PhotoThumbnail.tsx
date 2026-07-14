import { Image, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../app/theme';

interface PhotoThumbnailProps {
  uri: string;
  onPress: () => void;
}

const THUMB_SIZE = 88;

/** One square photo thumbnail, for the Today tab's Photos row. Tap to enlarge. */
export function PhotoThumbnail({ uri, onPress }: PhotoThumbnailProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="View photo">
      <Image source={{ uri }} style={styles.thumb} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
