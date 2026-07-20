/**
 * Downloads and caches remote cactus art from Firebase Storage on first use,
 * so later picks of the same image are instant and work offline.
 *
 * Throws if the image can't be fetched (offline, bucket unreachable, etc.) —
 * callers should catch and fall back to a bundled local image.
 */
import { File, Directory, Paths } from 'expo-file-system';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../src/lib/firebase';

const CACHE_DIR = new Directory(Paths.cache, 'daily-cactus-images');

export async function getCachedCactusImageUri(filename: string): Promise<string> {
  const cached = new File(CACHE_DIR, filename);
  if (cached.exists) {
    return cached.uri;
  }

  if (!CACHE_DIR.exists) {
    CACHE_DIR.create({ intermediates: true });
  }

  const url = await getDownloadURL(ref(storage, `daily-cactus-images/${filename}`));
  const downloaded = await File.downloadFileAsync(url, cached);
  return downloaded.uri;
}
