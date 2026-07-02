@AGENTS.md

# Prickle

Prickle is a mobile app (Expo / React Native) for people with eczema to log quick
daily entries and track their skin over time. Eczema is a chronic, and
highly variable condition — the product's job is to **acknowledge and validate**
that experience, not to diagnose or fix it. Keep that tone in mind in copy and UX.

## Stack

- **Expo** (managed workflow) + **Expo Router** (file-based navigation)
- **TypeScript** throughout
- **React Native** core components; styling via a central theme (see below)
- Font: **Open Sans**, loaded via expo-font and applied through `<AppText>`
- Currently building/testing on **Android** (dev build); iOS testing comes later.

## Project conventions

- **Never hardcode colors or font families.** Import from `theme.ts` and use the
  semantic `colors`, `typography`, `spacing`, and `radius` tokens. Raw hex in a
  component is a bug.
- **All text goes through `<AppText>`**, using its `variant` prop (`h1`, `body`,
  `caption`, etc.). Don't use bare `<Text>` in screens.
- Prefer **small, single-purpose components**, each in its own file.
- Use `spacing.*` and `radius.*` tokens instead of magic numbers.
- Keep screens under `app/` (Expo Router); shared UI in `components/`; tokens and
  helpers in their own folders. Match existing structure before inventing new folders.

## Voice & tone (important)

- Warm, plain-spoken, gentle. Never clinical or judgmental.
- A high severity score is **not** a failure. Showing up to log is the win.
- Avoid language that implies the user did something "wrong" or can "cure" eczema.
- Celebrate consistency and self-knowledge, not "good skin days" over "bad" ones.

## The data model (core logging)

A daily entry can include: per-site itch/severity scores (1–5 slider), where the use can add an optional photo
tagged with site + date + score given to that site, medications used (per user input of medications such as TCS, biologics, anti-histimines), triggers contacted (as specified by the user of their common flare triggers such as: heat, tight clothes,
fragranced products, hard water, cold/dry air, etc.),
and a mood/stress score (1–5 slider). A separate **weekly assessment** uses the POEM and
RECAP indexes.

## Clinical & safety notes for any agent working here

- **POEM and RECAP** (University of Nottingham) have their own usage/licensing
  terms. Do not alter their wording or scoring. Flag anything that touches them.
- Prickle is a **tracking tool, not a medical device**. Never generate content
  that gives diagnoses or treatment advice, or that would read as medical advice.
- This app handles **sensitive health data and photos**. Default to privacy: keep
  data local unless a feature explicitly requires otherwise, and surface any change
  that would send user data off-device.
- Do not implement AI or analytic algorithms that modify or attempt to predict data trends. Charts will purely be based on what user inputted into app.

## Commands

- `npx expo start` — start the dev server
- `npx expo run: android` — run on the Android dev build
- (add lint/test/typecheck commands here as you set them up)

## Working style

- For non-trivial changes, **propose a plan first** before editing files.
- Build UI **one component at a time**; keep diffs small and reviewable.