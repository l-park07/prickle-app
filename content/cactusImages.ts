/**
 * Local cactus art bundled into the app binary. This is the offline fallback
 * pool — always available even with no network, used when a remote image
 * (see remoteCactusImages.ts) can't be fetched or cached.
 *
 * Metro requires static `require()` calls, so this list can't be built from
 * reading the directory at runtime — adding one just means appending another
 * require() line here.
 */
export const LOCAL_CACTUS_IMAGES: number[] = [
  require('../assets/cactus-images/daily-cactus/cactus-00.png'),
  require('../assets/cactus-images/daily-cactus/cactus-01.png'),
];
