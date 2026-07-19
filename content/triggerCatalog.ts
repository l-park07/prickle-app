/**
 * triggerCatalog.ts — the STATIC catalog of common eczema triggers.
 *
 * This is CONTENT, not user data. It follows the same content-vs-logic split as
 * messages.ts / assessments.ts: this file is pure data and is safe to hand-edit.
 * Adding a trigger = appending one object. Never put picker/query logic in here.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW THIS IS PROCESSED (data flow — read before wiring anything up)
 *
 *   CATALOG (this file)            static list the Triggers tab renders and the
 *                                  Log modal searches. Not tied to any user.
 *        │  user taps "+" / "Start watching"
 *        ▼
 *   triggers (SQLite table)        the USER'S personal trigger list. One row per
 *                                  trigger the user has added, stamped with their
 *                                  user_id (via useActiveUserId — never user.uid).
 *                                  A catalog trigger stores its `slug` (this file's
 *                                  `id`) so we know where it came from; a custom
 *                                  "Other" trigger has slug = null.
 *        │  user checks it on a given day
 *        ▼
 *   log_triggers (join table)      presence of a row = encountered that day.
 *                                  absence = not encountered. (Same invariant as
 *                                  the rest of the app — never coerce absence to
 *                                  "no". A missing row is a real "unchecked".)
 *
 *   experiments (SQLite table)     an OBSERVATION WINDOW. Created when the user
 *                                  starts watching a trigger from the configure
 *                                  modal: user_id, trigger_id, start_date,
 *                                  end_date (start + 14 days minimum). The Home
 *                                  calendar reads active windows to draw the band.
 *
 * So: catalog is browse/discover + education. triggers is the user's list.
 * log_triggers is the daily fact. experiments is "I'm paying attention to this
 * right now." Four distinct things; don't collapse them.
 *
 * KNOWN vs WATCHED — there is ONE list (the `triggers` table). A trigger is
 * "watched" iff it has an active experiments row (deleted_at IS NULL, end_date in
 * the future); otherwise it's "known". Known triggers are added via onboarding,
 * the Log modal, or the Triggers tab and just mean "this is something I track" —
 * checking one on a given day = encountered it. Watching is started only from the
 * Triggers tab and adds the observation window / calendar band on top. When a
 * window ends, the trigger stays on the list as a plain known trigger.
 *
 * CUSTOM (user-added) TRIGGERS do NOT live in this file. This file is the shipped,
 * static, described catalog. A custom trigger (added when the typed name matches
 * nothing here) is written to the `triggers` table for that user with slug = null
 * and a user-picked category (one of the five ids below, or 'other'). It has a
 * label but no blurb/detail. It appears in the Log-modal SEARCH INDEX (catalog ∪
 * the user's own triggers) so it's re-loggable, but it is NOT rendered inside the
 * educational catalog accordion in the Triggers tab — it lives in the user's
 * trigger list, shown with its category as subtext. Never append customs here.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PLACEHOLDERS: every `blurb` and `detail` (and the category `blurb`/`note`) is a
 * bracketed placeholder for LB to write. Grep for "[" to find all of them:
 *     grep -n "\[" content/triggerCatalog.ts
 * Replace every bracketed string before release. blurb = one line shown in the
 * category list. detail = the longer "how it may flare your eczema" shown in the
 * configure modal when you start watching it.
 *
 * IDs are stable slugs and must never be reused or renamed once shipped — an
 * experiment/trigger row may reference them. Retire with a `retired: true` flag
 * rather than deleting, same rule as messages/cactus.
 */

export type TriggerCategoryId =
  | 'indoor'
  | 'outdoor'
  | 'ingesting'
  | 'applying'
  | 'touching';

export interface CatalogTrigger {
  /** Stable slug. Never reuse or rename once shipped. */
  id: string;
  label: string;
  /** One-liner shown under the trigger in the expanded category list. */
  blurb: string;
  /** Longer "how it may flare your eczema" shown in the configure modal. */
  detail: string;
  /** Optional concrete examples (e.g. which fruits). */
  examples?: string[];
  /** Set true to retire without deleting; keep the id reserved. */
  retired?: boolean;
}

export interface TriggerCategory {
  id: TriggerCategoryId;
  /** Display name shown on the accordion header, e.g. "Diet". */
  label: string;
  /** The route gerund, e.g. "Ingesting". Absent for Indoor/Outdoor (they are
   *  places you're in, not channels — the missing gerund is intentional). */
  gerund?: string;
  /** One-liner shown in the category header area. */
  blurb: string;
  /** Optional category-level note (e.g. patch-testing for Applying). */
  note?: string;
  triggers: CatalogTrigger[];
}

export const TRIGGER_CATALOG: TriggerCategory[] = [
  {
    id: 'indoor',
    label: 'Indoor',
    blurb: '[why the indoor environment matters — one line]',
    triggers: [
      { id: 'dust',             label: 'Dust',             blurb: '[why dust is a trigger]',             detail: '[how dust may flare eczema]' },
      { id: 'pet-dander',       label: 'Pet dander',       blurb: '[why pet dander is a trigger]',       detail: '[how pet dander may flare eczema]' },
      { id: 'pet-hair',         label: 'Pet hair',         blurb: '[why pet hair is a trigger]',         detail: '[how pet hair may flare eczema]' },
      { id: 'mold',             label: 'Mould',            blurb: '[why mould is a trigger]',            detail: '[how mould may flare eczema]' },
      { id: 'indoor-heating',   label: 'Indoor heating',   blurb: '[why indoor heating is a trigger]',   detail: '[how indoor heating may flare eczema — dry-air link]' },
      { id: 'air-conditioning', label: 'Air conditioning', blurb: '[why AC is a trigger]',               detail: '[how AC may flare eczema]' },
      { id: 'smoke',            label: 'Smoke (cigarettes)', blurb: '[why smoke is a trigger]',          detail: '[how smoke may flare eczema]' },
    ],
  },
  {
    id: 'outdoor',
    label: 'Outdoor',
    blurb: '[why outdoor conditions matter — one line]',
    triggers: [
      { id: 'pollen',        label: 'Pollen',        blurb: '[why pollen is a trigger]',        detail: '[how pollen may flare eczema]' },
      { id: 'cold-weather',  label: 'Cold weather',  blurb: '[why cold weather is a trigger]',  detail: '[how cold weather may flare eczema]' },
      { id: 'dry-air',       label: 'Dry air',       blurb: '[why dry air is a trigger]',       detail: '[how dry air may flare eczema]' },
      { id: 'heat',          label: 'Heat',          blurb: '[why heat is a trigger]',          detail: '[how heat may flare eczema]' },
      { id: 'humidity',      label: 'Humidity',      blurb: '[why humidity is a trigger]',      detail: '[how humidity may flare eczema]' },
      { id: 'sun',           label: 'Sun',           blurb: '[why sun is a trigger]',           detail: '[how sun may flare eczema]' },
      { id: 'air-pollution', label: 'Air pollution', blurb: '[why air pollution is a trigger]', detail: '[how air pollution may flare eczema]' },
    ],
  },
  {
    id: 'ingesting',
    label: 'Diet',
    gerund: 'Ingesting',
    blurb: '[why diet matters — one line; note most food links are individual/uncommon in adults]',
    triggers: [
      { id: 'dairy',     label: 'Dairy',     blurb: '[why dairy is a trigger]',     detail: '[how dairy may flare eczema]' },
      { id: 'egg',       label: 'Egg',       blurb: '[why egg is a trigger]',       detail: '[how egg may flare eczema]' },
      { id: 'gluten',    label: 'Gluten',    blurb: '[why gluten is a trigger]',    detail: '[how gluten may flare eczema]' },
      { id: 'peanut',    label: 'Peanut',    blurb: '[why peanut is a trigger]',    detail: '[how peanut may flare eczema]' },
      { id: 'tree-nut',  label: 'Tree nut',  blurb: '[why tree nuts are a trigger]', detail: '[how tree nuts may flare eczema]' },
      { id: 'fish',      label: 'Fish',      blurb: '[why fish is a trigger]',      detail: '[how fish may flare eczema]' },
      { id: 'shellfish', label: 'Shellfish', blurb: '[why shellfish is a trigger]', detail: '[how shellfish may flare eczema]' },
      { id: 'soya',      label: 'Soya',      blurb: '[why soya is a trigger]',      detail: '[how soya may flare eczema]' },
      { id: 'lentils',   label: 'Lentils',   blurb: '[why lentils are a trigger]',  detail: '[how lentils may flare eczema]' },
      { id: 'alcohol',   label: 'Alcohol',   blurb: '[why alcohol is a trigger]',   detail: '[how alcohol may flare eczema]' },
      {
        id: 'fruits',
        label: 'Certain fruits',
        blurb: '[why certain fruits are a trigger]',
        detail: '[how these fruits may flare eczema]',
        examples: ['Pineapple', 'Tomato', 'Strawberries', 'Citrus'],
      },
    ],
  },
  {
    id: 'applying',
    label: 'Cosmetics & Chemicals',
    gerund: 'Applying',
    blurb: '[why things you apply matter — one line]',
    note: '[importance of patch testing — one or two lines]',
    triggers: [
      { id: 'scented-soap',        label: 'Scented soaps',          blurb: '[why scented soaps are a trigger]',      detail: '[how scented soaps may flare eczema]' },
      { id: 'shampoo-conditioner', label: 'Shampoo / conditioner',  blurb: '[why shampoo/conditioner is a trigger]', detail: '[how shampoo/conditioner may flare eczema]' },
      { id: 'makeup',              label: 'Makeup',                 blurb: '[why makeup is a trigger]',              detail: '[how makeup may flare eczema]' },
      { id: 'lotions',             label: 'Lotions',                blurb: '[why lotions can be a trigger]',         detail: '[how lotions may flare eczema]' },
      { id: 'perfume',             label: 'Perfume',                blurb: '[why perfume is a trigger]',             detail: '[how perfume may flare eczema]' },
      { id: 'hand-sanitizer',      label: 'Hand sanitiser',         blurb: '[why hand sanitiser is a trigger]',      detail: '[how hand sanitiser may flare eczema]' },
      { id: 'bleach-disinfectant', label: 'Bleach / disinfectant',  blurb: '[why bleach/disinfectant is a trigger]', detail: '[how bleach/disinfectant may flare eczema]' },
      { id: 'laundry-detergent',   label: 'Laundry detergent',      blurb: '[why detergent is a trigger]',           detail: '[how detergent may flare eczema — it stays on everything you wear]' },
      { id: 'nail-polish-remover', label: 'Nail polish remover',    blurb: '[why nail polish remover is a trigger]', detail: '[how nail polish remover may flare eczema]' },
      { id: 'aftershave',          label: 'Aftershave',             blurb: '[why aftershave is a trigger]',          detail: '[how aftershave may flare eczema]' },
      { id: 'hair-dye',            label: 'Hair dye',               blurb: '[why hair dye is a trigger]',            detail: '[how hair dye may flare eczema]' },
    ],
  },
  {
    id: 'touching',
    label: 'Contact',
    gerund: 'Touching',
    blurb: '[why things that touch your skin matter — one line]',
    triggers: [
      { id: 'sweat',          label: 'Sweat',          blurb: '[why sweat is a trigger]',          detail: '[how sweat may flare eczema]' },
      { id: 'wool',           label: 'Wool',           blurb: '[why wool is a trigger]',           detail: '[how wool may flare eczema]' },
      { id: 'tight-clothing', label: 'Tight clothing', blurb: '[why tight clothing is a trigger]', detail: '[how tight clothing may flare eczema]' },
      { id: 'latex',          label: 'Latex',          blurb: '[why latex is a trigger]',          detail: '[how latex may flare eczema]' },
      { id: 'pool',           label: 'Swimming pool',  blurb: '[why pool water is a trigger]',      detail: '[how pool water may flare eczema]' },
      { id: 'jewelry',        label: 'Jewellery',      blurb: '[why jewellery is a trigger — nickel]', detail: '[how jewellery may flare eczema — earrings and eyeshadow can share a culprit: nickel]' },
      { id: 'bedding',        label: 'Bedding',        blurb: '[why bedding is a trigger]',         detail: '[how bedding may flare eczema — also carries dust & dander]' },
      { id: 'hot-showers',    label: 'Hot showers',    blurb: '[why hot showers are a trigger]',    detail: '[how hot showers may flare eczema]' },
      { id: 'new-water',      label: 'New water',      blurb: '[why new water is a trigger]',       detail: '[how new water may flare eczema — travel, a different home]' },
      { id: 'hard-water',     label: 'Hard water',     blurb: '[why hard water is a trigger]',      detail: '[how hard water may flare eczema — often mistaken for a seasonal pattern]' },
      { id: 'hand-washing',   label: 'Hand washing',   blurb: '[why frequent hand washing is a trigger]', detail: '[how frequent hand washing may flare eczema]' },
    ],
  },
];
