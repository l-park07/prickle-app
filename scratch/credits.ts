/**
 * Prickle — credits, licences & acknowledgements
 * =============================================================================
 * THIS IS THE FILE YOU EDIT. Nothing here is logic; it's just content.
 * `profile/credits.tsx` renders it, and `public/credits.html` mirrors it.
 * When you change one, change the other.
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
    title: 'Weekly assessments',
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
    id: 'sources',
    title: 'Where the information comes from',
    blurb:
      'The facts and trigger explanations in Prickle are drawn from these sources. Prickle is a tracking tool, not medical advice — your clinician knows your skin.',
    entries: [
      {
        text: 'National Eczema Association',
        url: 'https://nationaleczema.org',
      },
      {
        text: 'Eczema Care Online',
        url: 'https://www.eczemacareonline.org.uk',
      },
    ],
  },
];

/**
 * AI disclosure.
 * Deliberately scoped: tools helped with code and copy, not with the ideas,
 * the design, or the illustrations — and nothing in the shipped app uses AI.
 * That last sentence matters most; keep it.
 */
export const AI_DISCLOSURE = {
  title: 'How AI was used',
  body: [
    'Prickle was built with help from AI tools — Claude, Claude Code, and Gemini — for writing and reviewing code, and for drafting and editing text.',
    'The idea behind Prickle, its design, its illustrations, and every decision about clinical content are human-made and human-reviewed.',
    'Prickle itself contains no AI. Nothing you log is sent to a model, nothing is analysed or predicted, and your entries stay on your device.',
  ],
};

/**
 * Acknowledgements.
 *
 * ⚠ Before shipping: confirm each person is happy to be named, and check
 * whether they want their title used. On a health app, a name with a clinical
 * title reads to some users as a medical endorsement of the product. If that
 * isn't what they've agreed to, drop the title or the name.
 */
export const THANKS = {
  title: 'Thank you',
  blurb: 'Prickle is better for the time, advice, and encouragement of:',
  people: [
    'Aisha Hashimi',
    'Aaron Rossman',
    'Katie Britt',
    'Julie Gehring',
    'Dr. Andrew Heggland',
    'Dr. Richelle deMayo',
    'Erin Smith',
    'Mike Rota',
    'Jung Park',
    'Beth Park',
  ],
};

/** Shown at the foot of the credits screen. */
export const CREDITS_FOOTER = {
  ossLabel: 'Open-source licences',
  webLabel: 'Full credits on getprickle.app',
  webUrl: 'https://getprickle.app/credits.html',
};
