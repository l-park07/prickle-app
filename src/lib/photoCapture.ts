/**
 * photoCapture — device/file layer for adding a photo to a log entry.
 *
 * Never stores image bytes in SQLite. Every captured/picked photo is
 * downscaled and compressed, then copied into the app's own persistent
 * document directory under a fresh filename — the picker/manipulator's own
 * result URI lives in a cache the OS can clear, so it is never stored as the
 * permanent `photos.local_uri`. This never saves to the device's camera roll.
 *
 * `null` from captureFromCamera/pickFromLibrary means "user cancelled or
 * denied permission" — already handled/alerted here. Any other failure
 * (e.g. a file-copy error) throws, so the caller can tell a deliberate
 * non-action apart from something actually going wrong.
 */
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.7;

async function ensurePermission(
  request: () => Promise<{ granted: boolean; canAskAgain: boolean }>,
  deniedMessage: string
): Promise<boolean> {
  const result = await request();
  if (result.granted) return true;
  if (!result.canAskAgain) {
    Alert.alert('Permission needed', deniedMessage, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
  }
  return false;
}

async function processAndStore(pickedUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(pickedUri);
  context.resize({ width: MAX_DIMENSION, height: null });
  const rendered = await context.renderAsync();
  const manipulated = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  const destination = new File(Paths.document, `photo-${Crypto.randomUUID()}.jpg`);
  await new File(manipulated.uri).copy(destination);
  return destination.uri;
}

/** Launches the camera; returns the permanently-stored file URI, or null if cancelled/denied. */
export async function captureFromCamera(): Promise<string | null> {
  const ok = await ensurePermission(
    ImagePicker.requestCameraPermissionsAsync,
    'Prickle needs camera access to take a photo. You can enable this in Settings.'
  );
  if (!ok) return null;

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || !result.assets?.[0]) return null;
  return processAndStore(result.assets[0].uri);
}

/** Launches the photo library picker; returns the permanently-stored file URI, or null if cancelled/denied. */
export async function pickFromLibrary(): Promise<string | null> {
  const ok = await ensurePermission(
    ImagePicker.requestMediaLibraryPermissionsAsync,
    'Prickle needs photo library access to choose a photo. You can enable this in Settings.'
  );
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || !result.assets?.[0]) return null;
  return processAndStore(result.assets[0].uri);
}

/** Best-effort delete of a photo's underlying file — guards against it already being gone. */
export function deletePhotoFile(localUri: string): void {
  const file = new File(localUri);
  if (file.exists) file.delete();
}
