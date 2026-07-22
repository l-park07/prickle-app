/**
 * Prickle — credits & licences
 * =============================================================================
 * THIS IS THE FILE YOU EDIT. Nothing here is logic; it's just content.
 * `profile/credits.tsx` renders it.
 *
 * WHY THIS FILE EXISTS (read before removing anything):
 *   - The Flaticon free licence requires attribution wherever the icons appear.
 *     The icons ship inside the app, so the app must carry the credit — a
 *     website-only page does NOT discharge it. Each line must name the
 *     individual author, not just "Flaticon".
 *   - POEM and RECAP are used under non-commercial permission from the
 *     University of Nottingham. "© University of Nottingham" must stay visible.
 *   - Everything here is bundled, never fetched. The credits screen works
 *     offline, like the rest of Prickle.
 *
 * ADDING AN ICON: download the licence certificate at the same time, save it in
 * `docs/licences/`, and paste the attribution line Flaticon generates for you.
 * Reconstructing this list months later is miserable — do it as you go.
 *
 * OPEN SOURCE SECTION: entries are the app's direct dependencies (see
 * package.json) with the licence each package's own package.json declares.
 * Regenerate this list if dependencies change materially.
 * =============================================================================
 */

export interface CreditEntry {
  /** Displayed text. For Flaticon, use their generated wording verbatim. */
  text: string;
  /** Optional link. Opens in the system browser; never required to read the text. */
  url?: string;
}

export interface CreditSection {
  id: string;
  title: string;
  /** One plain-spoken line explaining what this section is. Optional. */
  blurb?: string;
  entries: CreditEntry[];
}

/** Ordered as they appear on the screen. */
export const CREDIT_SECTIONS: CreditSection[] = [
  {
    id: 'icons',
    title: 'Icons',
    blurb: 'Prickle’s icons come from Flaticon, made by these designers.',
    entries: [
      {
        text: 'Cactus icons created by Ina Mella — Flaticon',
        url: 'https://www.flaticon.com/free-icons/cactus',
      },
      {
        text: 'Cactus icons created by Yobany_MTOM — Flaticon',
        url: 'https://www.flaticon.com/free-icons/cactus',
      },
      {
        text: 'Lophophora icons created by Ylivdesign — Flaticon',
        url: 'https://www.flaticon.com/free-icons/lophophora',
      },
      {
        text: 'Cactus icons created by Magnific — Flaticon',
        url: 'https://www.flaticon.com/free-icons/cactus',
      },
    ],
  },
  {
    id: 'assessments',
    title: 'Assessments',
    blurb:
      'The POEM and RECAP questionnaires are used with permission and are reproduced word for word.',
    entries: [
      {
        text: 'Patient-Oriented Eczema Measure (POEM) — © University of Nottingham',
      },
      {
        text: 'Recap of atopic eczema (RECAP) — © University of Nottingham',
      },
    ],
  },
  {
    id: 'open-source',
    title: 'Open source',
    blurb: 'Prickle is built on these open-source projects.',
    entries: [
      { text: '@expo-google-fonts/open-sans — MIT AND OFL-1.1', url: 'https://github.com/expo/google-fonts' },
      { text: '@expo/ui — MIT', url: 'https://github.com/expo/expo' },
      {
        text: '@react-native-async-storage/async-storage — MIT',
        url: 'https://github.com/react-native-async-storage/async-storage',
      },
      {
        text: '@react-native-vector-icons/ionicons — MIT',
        url: 'https://github.com/react-native-vector-icons/vector-icons',
      },
      { text: 'Expo (expo, expo-router, and expo-* modules) — MIT', url: 'https://github.com/expo/expo' },
      { text: 'Firebase JS SDK — Apache-2.0', url: 'https://github.com/firebase/firebase-js-sdk' },
      { text: 'React — MIT', url: 'https://github.com/facebook/react' },
      { text: 'React Native — MIT', url: 'https://github.com/facebook/react-native' },
      {
        text: 'react-native-gesture-handler — MIT',
        url: 'https://github.com/software-mansion/react-native-gesture-handler',
      },
      {
        text: 'react-native-gifted-charts — MIT',
        url: 'https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts',
      },
      {
        text: 'react-native-reanimated — MIT',
        url: 'https://github.com/software-mansion/react-native-reanimated',
      },
      {
        text: 'react-native-safe-area-context — MIT',
        url: 'https://github.com/AppAndFlow/react-native-safe-area-context',
      },
      {
        text: 'react-native-screens — MIT',
        url: 'https://github.com/software-mansion/react-native-screens',
      },
      { text: 'react-native-svg — MIT', url: 'https://github.com/react-native-community/react-native-svg' },
      {
        text: 'react-native-view-shot — MIT',
        url: 'https://github.com/gre/react-native-view-shot',
      },
      { text: 'react-native-web — MIT', url: 'https://github.com/necolas/react-native-web' },
      {
        text: 'react-native-webview — MIT',
        url: 'https://github.com/react-native-webview/react-native-webview',
      },
      {
        text: 'react-native-worklets — MIT',
        url: 'https://github.com/software-mansion/react-native-reanimated',
      },
    ],
  },
];

/** Shown at the foot of the credits screen. */
export const CREDITS_FOOTER = {
  webLabel: 'Full credits on getprickle.app',
  webUrl: 'https://getprickle.app/credits.html',
};
