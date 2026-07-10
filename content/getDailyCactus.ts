/**
 * getDailyCactusImage — picks one cactus image per user per day, deterministically.
 *
 * Same hash scheme as getDailyMessage, salted differently so the cactus and
 * message don't happen to always land on the same index together.
 */
import { hash } from './getDailyMessage';
import { CACTUS_IMAGES } from './cactusImages';

export function getDailyCactusImage(userId: string, date: string): number {
  return CACTUS_IMAGES[hash(`cactus:${userId}:${date}`) % CACTUS_IMAGES.length];
}
