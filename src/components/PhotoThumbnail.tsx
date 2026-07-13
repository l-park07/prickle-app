import { Image, StyleSheet } from 'react-native';
import { colors, radius } from '../app/theme';

interface PhotoThumbnailProps {
  uri: string;
}

const THUMB_SIZE = 88;

/** One square photo thumbnail, for the Today tab's Photos row. */
export function PhotoThumbnail({ uri }: PhotoThumbnailProps) {
  return <Image source={{ uri }} style={styles.thumb} />;
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
