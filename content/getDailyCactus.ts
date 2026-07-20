/**
 * getDailyCactusImage — picks one cactus image per user per day, deterministically.
 *
 * Same hash scheme as getDailyMessage, salted differently so the cactus and
 * message don't happen to always land on the same index together.
 *
 * The pick can land on a local bundled image or a remote one hosted in
 * Firebase Storage. Remote picks are downloaded and cached on first use; if
 * that fails (offline, bucket unreachable), this falls back to a local
 * image instead so the daily cactus always renders.
 */
import type { ImageSourcePropType } from 'react-native';
import { hash } from './getDailyMessage';
import { LOCAL_CACTUS_IMAGES } from './cactusImages';
import { REMOTE_CACTUS_IMAGE_NAMES } from './remoteCactusImages';
import { getCachedCactusImageUri } from './cactusImageCache';

type CactusPick =
  | { kind: 'local'; source: number }
  | { kind: 'remote'; filename: string };

const POOL: CactusPick[] = [
  ...LOCAL_CACTUS_IMAGES.map((source) => ({ kind: 'local' as const, source })),
  ...REMOTE_CACTUS_IMAGE_NAMES.map((filename) => ({ kind: 'remote' as const, filename })),
];

export async function getDailyCactusImage(
  userId: string,
  date: string
): Promise<ImageSourcePropType> {
  const pick = POOL[hash(`cactus:${userId}:${date}`) % POOL.length];

  if (pick.kind === 'local') {
    return pick.source;
  }

  try {
    const uri = await getCachedCactusImageUri(pick.filename);
    return { uri };
  } catch {
    const fallbackIndex =
      hash(`cactus-fallback:${userId}:${date}`) % LOCAL_CACTUS_IMAGES.length;
    return LOCAL_CACTUS_IMAGES[fallbackIndex];
  }
}
