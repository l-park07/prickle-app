/**
 * Prickle — design tokens
 * -----------------------------------------------------------------------------
 * Desert / cactus inspired brand system. Import from here everywhere.
 * Rule of thumb: components should reference `colors` (semantic) and `typography`,
 * NOT raw hex or the raw `palette`. That way a rebrand is a one-file change.
 */

import {
  OpenSans_400Regular,
  OpenSans_500Medium,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
} from '@expo-google-fonts/open-sans';

// palette for app items
export const palette = {
  pale: '#fbe7e2',
  sand: '#eed9bd',
  graham: '#dac5b4',
  mustard: '#cd9e74',
  coral: '#c37a67',
  terracotta: '#a75e5b',
  crimson: '#a7294a',
  green: '#7f9174',
  greyGreen: '#99a797',
  lightGreen: '#a0ae9f',
  milkyGreen: '#b3cb8a',
  offWhite: '#f8f4e8',
  white: '#ffffff',
  ink: '#3b2f2a', // warm near-black — primary body text
  inkSoft: '#7a6f68', // muted clay-grey — secondary text
} as const;

// 2) SEMANTIC COLORS — what things ARE, not what color they happen to be.
//    Components use these. Reassign a role here and the whole app follows.
export const colors = {
  // Surfaces
  background: palette.offWhite,
  surface: palette.white,
  surfaceAlt: palette.pale,
  border: palette.graham,

  // Brand actions
  primary: palette.terracotta, // main buttons, active accents
  onPrimary: palette.offWhite, // text/icons sitting on primary
  accent: palette.crimson, // sparingly: highlights, key CTAs, "today"

  // Text
  textPrimary: palette.ink,
  textSecondary: palette.inkSoft,
  textInverse: palette.offWhite,

  // Tab bar
  tabActive: palette.terracotta,
  tabInactive: palette.offWhite,
  tabBarBg: palette.greyGreen,

  // Status (kept earthy on purpose — see severity note below)
  success: palette.green,
  info: palette.greyGreen,
  error: palette.crimson, // form validation / auth error text
} as const;

// 3) SEVERITY SCALE (1–5) for site scores & the mood/stress slider.
//    Deliberately warm rather than a green→red "good/bad" ramp. Crimson is
//    reserved for UI accents, NOT for "5", so a high score never reads as an
//    alarm or a failure — that matters for Prickle's validating tone.
export const severityScale: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: palette.milkyGreen,
  2: palette.lightGreen,
  3: palette.sand,
  4: palette.coral,
  5: palette.terracotta,
};

// 4) TYPOGRAPHY — this is where Open Sans lives, so <AppText> stops hardcoding it.
//    Every key here must have a matching entry in `fontAssets` below, or it'll
//    silently fall back to the system font when unregistered.
export const fontFamily = {
  regular: 'OpenSans-Regular',
  medium: 'OpenSans-Medium',
  semibold: 'OpenSans-SemiBold',
  bold: 'OpenSans-Bold',
} as const;

// Backs every key above with the asset that has to be registered via useFonts().
// Keeping this next to fontFamily means adding a weight above without adding it
// here is obvious at a glance, instead of silently falling back to the system font.
export const fontAssets = {
  [fontFamily.regular]: OpenSans_400Regular,
  [fontFamily.medium]: OpenSans_500Medium,
  [fontFamily.semibold]: OpenSans_600SemiBold,
  [fontFamily.bold]: OpenSans_700Bold,
} as const;

export const typography = {
  h1: { fontFamily: fontFamily.bold, fontSize: 30, lineHeight: 36 },
  h2: { fontFamily: fontFamily.semibold, fontSize: 24, lineHeight: 30 },
  title: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
} as const;

// 5) SPACING & RADII — use these instead of magic numbers so layouts stay consistent.
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

// 6) One object to rule them all (handy for a ThemeProvider later if you add one).
export const theme = {
  palette,
  colors,
  severityScale,
  fontFamily,
  fontAssets,
  typography,
  spacing,
  radius,
} as const;

export type Theme = typeof theme;
export type TypographyVariant = keyof typeof typography;