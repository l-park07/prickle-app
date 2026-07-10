/**
 * Rotating cactus art for Home. Metro requires static `require()` calls, so
 * this list can't be built from reading the directory at runtime — adding a
 * new placeholder just means appending another require() line here.
 */
export const CACTUS_IMAGES: number[] = [
  require('../assets/cactus-images/daily-cactus/cactus-1.png'),
  require('../assets/cactus-images/daily-cactus/cactus-2.png'),
  require('../assets/cactus-images/daily-cactus/cactus-3.png'),
  require('../assets/cactus-images/daily-cactus/cactus-4.png'),
];
