import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../app/theme';

interface LogPhotoThumbnailProps {
  uri: string;
  onRemove: () => void;
}

const THUMB_SIZE = 88;

/** Editable sibling of PhotoThumbnail — same sizing, plus a remove overlay. */
export function LogPhotoThumbnail({ uri, onRemove }: LogPhotoThumbnailProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel="Remove photo"
        style={styles.removeButton}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Ionicons name="close-circle" size={22} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
});
