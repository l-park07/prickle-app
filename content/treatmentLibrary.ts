/**
 * treatmentLibrary.ts — seed suggestions for the "Add treatment" filter.
 *
 * WHAT THIS IS
 *   A reference list of commonly used eczema treatments (prescription meds,
 *   OTC products, and NEA-style non-drug therapies) used ONLY to power the
 *   type-to-filter autocomplete when adding a treatment in the Log modal.
 *   It is a convenience layer, not a formulary and NOT medical advice.
 *
 * HOW IT'S USED
 *   - The user types; we filter this list by `name` + `aliases` (case-insensitive).
 *   - The user can ALWAYS free-type a name that isn't here and add it anyway —
 *     never block a real prescription just because it's missing from this file.
 *   - On select we may prefill `method`, `type`, `isSteroid`, and (for TCS)
 *     default the on/off cycle UI to visible. We do NOT prefill cadence,
 *     dosing, or a rest length — those are the user's / their clinician's to set.
 *
 * CONTENT vs LOGIC
 *   This file is editable data, like messages.ts. To add a treatment, append a
 *   row. Never edit the filter/picker to add content. `id`s are stable and must
 *   not be reused; retire an entry with `retired: true` rather than deleting it.
 *
 * POTENCY NOTE
 *   `potency` on topical corticosteroids is an APPROXIMATE band (the US 7-class
 *   system collapsed to 4). Real potency varies by strength and vehicle
 *   (ointment > cream > lotion). Treat it as a rough display/grouping hint only.
 */

export type TreatmentType = 'rx' | 'otc' | 'therapy';

export type DeliveryMethod =
  | 'topical'
  | 'oral'
  | 'injectable'
  | 'phototherapy'
  | 'bath'
  | 'other';

/** Units for a treatment's schedule — see the `medications` table's cadence/active/rest columns. */
export type CadenceUnit = 'day' | 'week' | 'month';
export type WindowUnit = 'day' | 'week';

export type TreatmentKind =
  | 'tcs'                     // topical corticosteroid
  | 'tci'                     // topical calcineurin inhibitor
  | 'pde4'                    // topical PDE4 inhibitor
  | 'topical-jak'            // topical JAK inhibitor
  | 'topical-other'          // other topical Rx (e.g. AhR agonist)
  | 'biologic'
  | 'oral-jak'
  | 'oral-immunosuppressant'
  | 'oral-corticosteroid'
  | 'antihistamine'
  | 'antibiotic'
  | 'emollient'              // moisturizers / barrier
  | 'therapy';               // non-drug (wet wrap, bleach bath, phototherapy…)

export type TcsPotency = 'mild' | 'moderate' | 'potent' | 'very-potent';

export interface SeedTreatment {
  /** stable slug, never reused */
  id: string;
  /** display name (generic where there is one) */
  name: string;
  /** brand names + common spellings, for filter matching only */
  aliases: string[];
  kind: TreatmentKind;
  type: TreatmentType;
  method: DeliveryMethod;
  /** true for topical corticosteroids — lets the UI surface the on/off cycle prominently */
  isSteroid?: boolean;
  /** approximate, TCS only — see POTENCY NOTE above */
  potency?: TcsPotency;
  /** hint that an active/rest cycle is commonly relevant; does not force it */
  suggestCycle?: boolean;
  retired?: boolean;
}

export const TREATMENT_LIBRARY: SeedTreatment[] = [
  // ── Topical corticosteroids (TCS) ────────────────────────────────────────
  // 'otc' is a default — 2.5% strength is often Rx-only; switchable from "Add details".
  { id: 'tcs-hydrocortisone', name: 'Hydrocortisone', aliases: ['Cortaid', 'Cortizone-10', 'hydrocortisone 1%', 'hydrocortisone 2.5%'], kind: 'tcs', type: 'otc', method: 'topical', isSteroid: true, potency: 'mild', suggestCycle: true },
  { id: 'tcs-desonide', name: 'Desonide', aliases: ['Desonate', 'DesOwen', 'Verdeso'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'mild', suggestCycle: true },
  { id: 'tcs-alclometasone', name: 'Alclometasone dipropionate', aliases: ['Aclovate'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'mild', suggestCycle: true },
  { id: 'tcs-triamcinolone', name: 'Triamcinolone acetonide', aliases: ['Kenalog', 'Triderm'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'moderate', suggestCycle: true },
  { id: 'tcs-fluocinolone', name: 'Fluocinolone acetonide', aliases: ['Synalar', 'Capex', 'Derma-Smoothe'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'moderate', suggestCycle: true },
  { id: 'tcs-hydrocortisone-butyrate', name: 'Hydrocortisone butyrate', aliases: ['Locoid'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'moderate', suggestCycle: true },
  { id: 'tcs-hydrocortisone-valerate', name: 'Hydrocortisone valerate', aliases: ['Westcort'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'moderate', suggestCycle: true },
  { id: 'tcs-mometasone', name: 'Mometasone furoate', aliases: ['Elocon'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'moderate', suggestCycle: true },
  { id: 'tcs-fluticasone', name: 'Fluticasone propionate', aliases: ['Cutivate'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'moderate', suggestCycle: true },
  { id: 'tcs-betamethasone-valerate', name: 'Betamethasone valerate', aliases: ['Beta-Val', 'Luxiq'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'potent', suggestCycle: true },
  { id: 'tcs-betamethasone-dipropionate', name: 'Betamethasone dipropionate', aliases: ['Diprolene', 'Diprosone'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'potent', suggestCycle: true },
  { id: 'tcs-fluocinonide', name: 'Fluocinonide', aliases: ['Lidex', 'Vanos'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'potent', suggestCycle: true },
  { id: 'tcs-desoximetasone', name: 'Desoximetasone', aliases: ['Topicort'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'potent', suggestCycle: true },
  { id: 'tcs-clobetasol', name: 'Clobetasol propionate', aliases: ['Temovate', 'Clobex', 'Olux'], kind: 'tcs', type: 'rx', method: 'topical', isSteroid: true, potency: 'very-potent', suggestCycle: true },

  // ── Topical calcineurin inhibitors (steroid-sparing) ─────────────────────
  { id: 'tci-tacrolimus', name: 'Tacrolimus ointment', aliases: ['Protopic'], kind: 'tci', type: 'rx', method: 'topical' },
  { id: 'tci-pimecrolimus', name: 'Pimecrolimus cream', aliases: ['Elidel'], kind: 'tci', type: 'rx', method: 'topical' },

  // ── Topical PDE4 inhibitors ──────────────────────────────────────────────
  { id: 'pde4-crisaborole', name: 'Crisaborole', aliases: ['Eucrisa'], kind: 'pde4', type: 'rx', method: 'topical' },
  { id: 'pde4-roflumilast', name: 'Roflumilast (topical)', aliases: ['Zoryve'], kind: 'pde4', type: 'rx', method: 'topical' },

  // ── Topical JAK inhibitors ───────────────────────────────────────────────
  { id: 'tjak-ruxolitinib', name: 'Ruxolitinib cream', aliases: ['Opzelura'], kind: 'topical-jak', type: 'rx', method: 'topical' },
  { id: 'tjak-delgocitinib', name: 'Delgocitinib cream', aliases: ['Anzupgo'], kind: 'topical-jak', type: 'rx', method: 'topical' },

  // ── Other topical Rx ─────────────────────────────────────────────────────
  { id: 'top-tapinarof', name: 'Tapinarof cream', aliases: ['Vtama', 'VTAMA'], kind: 'topical-other', type: 'rx', method: 'topical' },

  // ── Biologics (injectable) ───────────────────────────────────────────────
  { id: 'bio-dupilumab', name: 'Dupilumab', aliases: ['Dupixent'], kind: 'biologic', type: 'rx', method: 'injectable' },
  { id: 'bio-tralokinumab', name: 'Tralokinumab', aliases: ['Adbry', 'Adtralza'], kind: 'biologic', type: 'rx', method: 'injectable' },
  { id: 'bio-lebrikizumab', name: 'Lebrikizumab', aliases: ['Ebglyss'], kind: 'biologic', type: 'rx', method: 'injectable' },
  { id: 'bio-nemolizumab', name: 'Nemolizumab', aliases: ['Nemluvio'], kind: 'biologic', type: 'rx', method: 'injectable' },

  // ── Oral JAK inhibitors ──────────────────────────────────────────────────
  { id: 'ojak-upadacitinib', name: 'Upadacitinib', aliases: ['Rinvoq', 'rinvoq'], kind: 'oral-jak', type: 'rx', method: 'oral' },
  { id: 'ojak-abrocitinib', name: 'Abrocitinib', aliases: ['Cibinqo'], kind: 'oral-jak', type: 'rx', method: 'oral' },
  { id: 'ojak-baricitinib', name: 'Baricitinib', aliases: ['Olumiant'], kind: 'oral-jak', type: 'rx', method: 'oral' },

  // ── Oral systemic immunosuppressants (often off-label in AD) ──────────────
  { id: 'sys-cyclosporine', name: 'Cyclosporine', aliases: ['Neoral', 'Sandimmune', 'Gengraf'], kind: 'oral-immunosuppressant', type: 'rx', method: 'oral' },
  { id: 'sys-methotrexate', name: 'Methotrexate', aliases: ['Trexall', 'Rasuvo', 'Otrexup'], kind: 'oral-immunosuppressant', type: 'rx', method: 'oral' },
  { id: 'sys-azathioprine', name: 'Azathioprine', aliases: ['Imuran', 'Azasan'], kind: 'oral-immunosuppressant', type: 'rx', method: 'oral' },
  { id: 'sys-mycophenolate', name: 'Mycophenolate mofetil', aliases: ['CellCept'], kind: 'oral-immunosuppressant', type: 'rx', method: 'oral' },

  // ── Oral corticosteroids (short courses) ─────────────────────────────────
  { id: 'oral-prednisone', name: 'Prednisone', aliases: ['Deltasone', 'oral steroid'], kind: 'oral-corticosteroid', type: 'rx', method: 'oral', isSteroid: true, suggestCycle: true },

  // ── Antihistamines (itch / sleep) ────────────────────────────────────────
  { id: 'ah-diphenhydramine', name: 'Diphenhydramine', aliases: ['Benadryl', 'Benedryl'], kind: 'antihistamine', type: 'otc', method: 'oral' },
  { id: 'ah-cetirizine', name: 'Cetirizine', aliases: ['Zyrtec'], kind: 'antihistamine', type: 'otc', method: 'oral' },
  { id: 'ah-loratadine', name: 'Loratadine', aliases: ['Claritin'], kind: 'antihistamine', type: 'otc', method: 'oral' },
  { id: 'ah-fexofenadine', name: 'Fexofenadine', aliases: ['Allegra'], kind: 'antihistamine', type: 'otc', method: 'oral' },
  { id: 'ah-hydroxyzine', name: 'Hydroxyzine', aliases: ['Atarax', 'Vistaril'], kind: 'antihistamine', type: 'rx', method: 'oral' },

  // ── Antibiotics (for infected eczema; situational) ───────────────────────
  { id: 'abx-mupirocin', name: 'Mupirocin', aliases: ['Bactroban', 'Centany'], kind: 'antibiotic', type: 'rx', method: 'topical' },
  { id: 'abx-cephalexin', name: 'Cephalexin', aliases: ['Keflex'], kind: 'antibiotic', type: 'rx', method: 'oral' },

  // ── Emollients / barrier (OTC) ───────────────────────────────────────────
  { id: 'emol-moisturizer', name: 'Moisturizer / emollient', aliases: ['CeraVe', 'Cetaphil', 'Vanicream', 'Eucerin', 'Aveeno', 'La Roche-Posay', 'lotion'], kind: 'emollient', type: 'otc', method: 'topical' },
  { id: 'emol-barrier-ointment', name: 'Barrier ointment', aliases: ['Aquaphor', 'petroleum jelly', 'Vaseline', 'petrolatum'], kind: 'emollient', type: 'otc', method: 'topical' },

  // ── Non-drug therapies (NEA-recommended) ─────────────────────────────────
  { id: 'th-wet-wrap', name: 'Wet wrap therapy', aliases: ['wet wraps', 'wet wrapping'], kind: 'therapy', type: 'therapy', method: 'other' },
  { id: 'th-bleach-bath', name: 'Bleach bath', aliases: [], kind: 'therapy', type: 'therapy', method: 'bath' },
  { id: 'th-soak-and-seal', name: 'Soak and seal', aliases: ['bathe and moisturize'], kind: 'therapy', type: 'therapy', method: 'bath' },
  { id: 'th-oatmeal-bath', name: 'Colloidal oatmeal bath', aliases: ['oatmeal bath', 'Aveeno bath'], kind: 'therapy', type: 'otc', method: 'bath' },
  { id: 'th-phototherapy', name: 'Phototherapy (NB-UVB)', aliases: ['light therapy', 'UVB', 'narrowband UVB'], kind: 'therapy', type: 'therapy', method: 'phototherapy' },
  { id: 'th-cool-compress', name: 'Cool compress', aliases: ['cold compress'], kind: 'therapy', type: 'therapy', method: 'other' },
];

/**
 * The complementary name to show alongside a stored treatment's `name`, for
 * display only — not used for matching. A treatment can be stored under
 * either its generic name or a brand alias (whichever the user searched
 * under, see LibraryTreatmentMatch.matchedName), so this looks it up either
 * way and returns whichever side wasn't stored: "Upadacitinib" -> "Rinvoq",
 * but also "Rinvoq" -> "Upadacitinib". Returns null for a free-typed name or
 * a library entry with no aliases.
 */
export function findCommonName(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  const entry = TREATMENT_LIBRARY.find(
    (e) => e.name.toLowerCase() === normalized || e.aliases.some((a) => a.toLowerCase() === normalized)
  );
  if (!entry) return null;
  if (entry.name.toLowerCase() === normalized) return entry.aliases[0] ?? null;
  return entry.name;
}
