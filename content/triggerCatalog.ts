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
    blurb: 'Despite living with the same inside air everyday, small daily exposures to triggers build up and make flares all the likely.',
    triggers: [
      { id: 'dust',             label: 'Dust',             blurb: 'a bit gross but there are mites in dust',             detail: "Dust can be made up of mites whose droppings eat away at your skin's protective barrier, letting irritants sneak in and cause an itchy red flare." },
      { id: 'pet-hair',         label: 'Pet hair',         blurb: 'aka dander',         detail: "Tiny flakes of pet skin and dried saliva slip through eczema's weak barrier and trigger an allergic reaction." },
      { id: 'mold',             label: 'Mold',            blurb: 'overreactions inbound',            detail: "Floating mold spores in the air land on eczema and cause your body to overreact and flare." },
      { id: 'indoor-heating',   label: 'Indoor heating',   blurb: 'heat blasting',   detail: "Heaters create dry indoor air and low humidity, which strips away your skin's natural moisture and primes it for dry, cracking flare-ups." },
      { id: 'air-conditioning', label: 'Air conditioning', blurb: 'cold blasting',               detail: 'Air conditioning drops the humidity in a room and causes rapid temperature changes, which dry out the skin and make flares more likely.' },
      { id: 'smoke',            label: 'Smoke',            blurb: '💨💨💨',          detail: 'Smoke from cigarettes or wood fireplaces sends harsh particles and hot, dry air directly against your skin, causing physical irritation and dryness.' },
    ],
  },
  {
    id: 'outdoor',
    label: 'Outdoor',
    blurb: 'While the seasons may change predictably, these fluctuations in temperature and humidity can be a major shock to eczema-prone skin.',
    triggers: [
      { id: 'pollen',        label: 'Pollen',        blurb: 'ACHOO! and itch',        detail: 'Floating pollen acts as an allergen; when it lands on sensitive skin, it signals your immune system to overreact, causing a flare.' },
      { id: 'cold-weather',  label: 'Cold weather',  blurb: 'brrrr means dry skin means flare',  detail: 'Cold air holds very little moisture and physically shocks the skin, creating a harsh environment that leaves your skin brittle and prone to cracking.' },
      { id: 'dry-air',       label: 'Dry air',       blurb: 'dry air -> dry skin',       detail: 'Without enough moisture in the air, your skin has a difficult time retaining moisture, causing severe dryness and subsequent flares.' },
      { id: 'heat',          label: 'Heat',          blurb: 'heat makes sweat makes itch',          detail: 'Hot temperatures make you sweat and increase blood flow to the skin, which can cause overheating, a prickly sensation, and begining the intense itch-scratch cycle.' },
      { id: 'humidity',      label: 'Humidity',      blurb: 'heavy moist air',      detail: 'Thick, moist air makes you sweat more. When that sweat evaporates, it leaves behind a salty residue that stings and irritates broken skin.' },
      { id: 'sun',           label: 'Sun',           blurb: 'UV burns',           detail: 'While a little sunlight helps some people, intense UV rays can essential burn and dry out already damaged skin barriers, making it harder for your skin to hold onto moisture.' },
      { id: 'air-pollution', label: 'Air pollution', blurb: 'chemicals and dirt in the air irritates', detail: 'Microscopic dirt and chemicals from polluted air can settle on your skin, acting like a harsh physical irritant that makes your skin even more flare prone.' },
    ],
  },
  {
    id: 'ingesting',
    label: 'Diet',
    gerund: 'Ingesting',
    blurb: 'Flares due to consumption of certain foods are due to pre-existing allergies and sensitivities. Track your contact with your food allergies and you may find that your eczema has a delayed flare in response to the same allergen. It is strongly discouraged to cut a food without consulting a doctor or allergist first, use Prickle as a way to track already existing behaviors.',
    triggers: [
      { id: 'dairy',     label: 'Dairy',     blurb: '',     detail: 'A dairy allergy or sensitiy makes a dairy-induced flare more likely.' },
      { id: 'gluten',    label: 'Gluten',    blurb: '',    detail: '' },
      { id: 'peanut',    label: 'Peanut',    blurb: '',    detail: '' },
      { id: 'soy',      label: 'Soy',      blurb: '',      detail: '' },
      { id: 'alcohol',   label: 'Alcohol',   blurb: 'Alcohol causes flushing, dehydration, high histimine, and systemic inflammation. A recipe for eczema disaster.',   detail: 'Alcohol increases blood flow in skin, turning it red. This makes the skin feel warm or flushed, and lowers your itch threshold. On eczema-prone skin, that sudden spike in skin temperature directly stimulates sensitive nerve endings, triggering an immediate "itch-scratch" reflex. Consumption of alcohol also contain high levels of histimines (the things that make you itch), can dehydrate both you and your skin, and cause inflammation as your body processes the alcohol.' },
      {
        id: 'fruits',
        label: 'Certain fruits',
        blurb: 'Physical contact with citruses or acidic fruits can cause irritation to eczema',
        detail: 'Contact with acidic/active fruits is often not an internal allergy at all, but rather a topical chemical irritation. Acidic food particles break down sensitive skin tissue on contact, causing localized redness and stinging and thus a flare.',
        examples: ['Pineapple', 'Tomato', 'Strawberries', 'Citrus'],
      },
    ],
  },
  {
    id: 'applying',
    label: 'Cosmetics & Chemicals',
    gerund: 'Applying',
    blurb: 'Introducing a new product with eczema is always a gamble. Something as inconspicuous as your hand lotion or laundry detergent may be aggrevating your eczmea.',
    note: 'Patch testing is applying a tiny amount of product to a small area of skin before using it broadly. Even products listed "hypoallergenic" or "for sensitive skin" can still cause a reaction. Patch testing is good practice to defend against a product-induced flare.',
    triggers: [
      { id: 'scented-soap',        label: 'Scented soaps',          blurb: 'can be stripping',      detail: "Soaps strip away essential protective lipids and dry out the skin, while added fragrances are a leading cause of allergic contact eczema" },
      { id: 'shampoo-conditioner', label: 'Shampoo / conditioner',  blurb: 'scents, sulfates, and soaps, oh my!', detail: 'Foaming agents, dyes, and scents in hair products rinse down over your body, stripping moisture and irritating sensitive eczema-prone areas of the skin.' },
      { id: 'makeup',              label: 'Makeup',                 blurb: 'you can specify what product you are testing in the notes!',              detail: 'Cosmetics often contain preservatives, dyes, or scents that easily irritate delicate facial skin and spark contact allergies.' },
      { id: 'lotions',             label: 'Lotions',                blurb: 'trying a new one is always a risk, especially when it contains fragrances',         detail: 'Liquid lotions often contain high water content, ceramides, alcohols, or preservatives that evaporate quickly causing a painful stinging on broken or cracked skin.' },
      { id: 'perfume',             label: 'Perfume',                blurb: 'fragrance may smell good but can be irritating',             detail: 'Concentrated fragrance mixes are common cosmetic allergic reactions, directly triggering an immune response in sensitive skin.' },
      { id: 'hand-sanitizer',      label: 'Hand sanitiser',         blurb: 'irritating alcohol typically',      detail: 'High concentrations of alcohol rapidly dissolve surface lipids and strip moisture, causing severe skin dehydration and stinging on raw hands.' },
      { id: 'bleach-disinfectant', label: 'Bleach / disinfectant',  blurb: 'harsh chemicals', detail: 'Undiluted household cleaners and bleach act as harsh corrosive agents that directly damage skin cells on contact (causing irritant contact dermatitis).' },
      { id: 'laundry-detergent',   label: 'Laundry detergent',      blurb: 'remain on clothes after washing',           detail: 'Chemical residues and fabric softeners left behind on clothes continuously rub against your skin all day, causing physical and chemical irritation.' },
      { id: 'nail-polish-remover', label: 'Nail polish remover',    blurb: 'acetone is a harsh chemical', detail: 'Harsh solvents like acetone strip natural protective oils on contact and can easily transfer to ultra-sensitive areas like your eyelids when touching your face.' },
      { id: 'aftershave',          label: 'Aftershave',             blurb: 'aftershave is used on already sensitive shaved skin',          detail: 'Alcohol and fragrance ingredients applied directly to freshly shaved, micro-damaged skin cause immediate chemical burning and strip moisture.' },
      { id: 'hair-dye',            label: 'Hair dye',               blurb: 'commonly contains PPD and ammonia',            detail: 'Strong chemical compounds—most notably PPD—easily penetrate a weak skin barrier and trigger allergic contact dermatitis on the scalp and face.' },
    ],
  },
  {
    id: 'touching',
    label: 'Contact',
    gerund: 'Touching',
    blurb: 'Sensitive skin is open and exposed to daily life. Our skin is the front lines and it is open to contact with all kinds of irritants. ',
    triggers: [
      { id: 'sweat',          label: 'Sweat',          blurb: 'one of the most common eczema triggers',          detail: 'As sweat evaporates, it leaves behind salty mineral residues that sting raw, broken skin and trap skin-irritating heat.' },
      { id: 'wool',           label: 'Wool',           blurb: 'can cause a prickly sensation',           detail: 'Coarse, scratchy animal fibers physically prickle and chafe delicate skin, instantly sparking the itch-scratch cycle.' },
      { id: 'tight-clothing', label: 'Tight clothing', blurb: 'creates friction and traps sweat', detail: 'Snug fabrics rub continuously against your body while trapping heat and sweat directly against your sensitive skin.' },
      { id: 'latex',          label: 'Latex',          blurb: 'if you have a latex allergy your eczema may flare',          detail: 'Natural rubber proteins easily penetrate a weak skin barrier, triggering an allergic contact reaction.' },
      { id: 'pool',           label: 'Swimming pool',  blurb: 'chlorine can be no fun',      detail: 'Chlorine and disinfectant chemicals strip away essential natural oils, leaving skin severely dry and chemically irritated.' },
      { id: 'jewelry',        label: 'Jewelry',      blurb: 'nickel is a common culprit for jewelry-based flares', detail: 'Metals like nickel or cobalt dissolve in skin moisture and sweat, slipping through the barrier to cause an allergic rash.' },
      { id: 'bedding',        label: 'Bedding',        blurb: 'you sleep in it every night',         detail: 'Fabrics can trap dust mites, heat, and sweat overnight while rough threads chafe your skin while you sleep.' },
      { id: 'hot-showers',    label: 'Hot showers',    blurb: 'it may feel nice but your skin is not happy',    detail: 'High heat melts away protective surface lipids on your skin and dilates blood vessels, causing sudden moisture loss and intense itching.' },
      { id: 'new-water',      label: 'New water',      blurb: "different than the water you're used to",       detail: "Unfamiliar water supplies often have different pH levels or chemicals that disrupt your sensitive skin barrier." },
      { id: 'hard-water',     label: 'Hard water',     blurb: 'often contains harsh minerals',      detail: 'Minerals like calcium and magnesium strip natural moisture, leave irritating deposits, and make soaps harder to rinse off completely.' },
      { id: 'hand-washing',   label: 'Hand washing',   blurb: 'find the balance between clean and moist hands', detail: 'Repeated soap and water exposure continually washes away protective oils faster than your skin can rebuild them, leading to raw cracks.' },
    ],
  },
];
