// Single source of truth for the privacy policy version the app has agreed to.
//
// The policy itself lives on the website (privacy.html) so it can be edited
// without shipping an app update. The app only needs to know *which version*
// the user agreed to, so that a MATERIAL change to how health data is handled
// can bump the version below and re-prompt for consent. See
// hasCurrentPrivacyConsent() in lib/consent.ts.

export const PRIVACY_POLICY_URL = 'https://getprickle.app/privacy.html';

// Bump this ONLY when a change materially affects how personal/health data is
// handled (e.g. a new data use). Keep it equal to the "Last updated" date on
// the website for easy cross-reference.
export const PRIVACY_POLICY_VERSION = '2026-07-21';
