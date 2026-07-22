# Prickle — Insights: custom overlay charts

Drop this in `scratch/` and point Claude Code at it. Run in **plan mode
(Shift+Tab)**, approve each plan, review the diff, **one prompt at a time**.
Prompts build on each other — don't skip ahead.

*Revision note: an earlier draft of this plan included a "split summary"
comparing average severity on days a trigger was logged vs days it wasn't.
That has been cut. Eczema flares commonly lag trigger contact by a couple of
days, so a same-day split would both dilute real relationships and present
noise as a single authoritative-looking number. The timeline is the honest
answer — it keeps the lag visible and leaves the judgement with the person.*

---

## 0. What this builds (read first)

The current "Severity comparison" card is being replaced with an **overlay
timeline**, following the original wireframe: chart on top, legend-as-controls
underneath.

### The card, top to bottom

1. **Chart** — full width, first thing you see. Nothing above it but the title.
2. **Legend rows** — one row per series: color swatch, name, toggle. This *is*
   the control surface. Toggling persists to the chart's saved config.
3. **Caption** and a footer row with the export toggle and a ⋯ menu.

### How each data type is drawn

- **Site severity** — solid lines, full weight, in each site's existing color.
  These own the y-axis.
- **Stress / mood** — a line, but visually subordinate: thinner, muted, drawn
  *behind* the site lines, in a neutral token. They share a 1–5 scale with
  severity by coincidence, not by meaning, and the caption must say so.
- **Triggers / medications** — never lines. They're binary per-day events with
  no magnitude. Drawn as **stacked lanes** beneath the plot (one row per enabled
  event series, tick on each logged day), plus a very faint full-height band
  behind the lines when only one or two event series are enabled.

### Rules that fall out of the delay problem

Flares often lag trigger contact by 1–3 days. Everything below follows from
that:

- **Any enabled event series forces daily granularity.** A two-day lag is
  arithmetically invisible in a weekly bucket. Don't let the user ask a question
  the chart can't answer.
- **Lanes, not overlapping bands.** Overlapping translucent bands produce a
  third shade that reads as a third thing. Lanes stack cleanly; bands don't.
- **Never compute or display a same-day association.** No averages split by
  event, no correlation, no "trigger score". The chart shows what was logged and
  when. The reading is the user's.
- **Band and lane colors come from their own non-severity accent tokens.** Green
  means low-severity in this app; a green wash behind the plot carries meaning
  we don't intend. Never reuse `severityScale` for an event.

### Rules that apply to every prompt below

- Follow `CLAUDE.md` and `AGENTS.md`. No hardcoded colors or font families —
  everything from `theme.ts` tokens (`colors`, `typography`, `spacing`,
  `radius`, `severityScale`). Raw hex in a component is a bug.
- All text through `<AppText>` with a `variant`. No bare `<Text>`.
- Small single-purpose components, one per file.
- **No predictive or inferential logic anywhere.** Charts show logged data only.
- Voice: warm, plain, non-clinical. A flare is not a failure.
- New tables follow the sync-ready shape: device-generated UUID `id`,
  `user_id`, `created_at`, `updated_at`, `deleted_at` (soft delete).
- Every interactive element needs an `accessibilityLabel`; every chart needs a
  text alternative.
- **Show the plan first** on every prompt. Don't write code until I approve.

---

## Prompt 1 — Schema + persistence

```
Read scratch/prickle-insights-comparison-prompts.md section 0 first and follow
those rules.

Add persistence for user-created overlay charts.

1. A `custom_charts` table, following the existing sync-ready convention exactly
   (UUID id, user_id, created_at, updated_at, deleted_at). Columns beyond those:
   title TEXT, config TEXT (JSON), sort_order INTEGER, include_in_export
   INTEGER NOT NULL DEFAULT 0.
   Handle this as a migration in whatever way the project already does schema
   changes — check how existing tables are created before inventing a pattern.

2. A TypeScript type for the config payload:
   {
     series: Array<
       | { kind: 'site';    id: string; enabled: boolean }
       | { kind: 'stress' | 'mood';     enabled: boolean }
       | { kind: 'trigger' | 'medication'; id: string; enabled: boolean }
     >;
     range: '30d' | '90d' | '6mo' | '1yr' | 'all';
     granularity: 'auto' | 'daily' | 'weekly' | 'monthly';
     showGaps: boolean;
   }

   The `series` array holds BOTH what appears in the legend and whether each row
   is currently toggled on — a row present but disabled still renders in the
   legend, greyed. Rows absent from the array don't appear at all. This is what
   keeps the legend from becoming a 13-row scroll.

   Parse defensively on read: an unparseable or partial config falls back to
   sane defaults rather than crashing the Insights tab. A series entry
   referencing a site/trigger/medication that no longer exists is dropped
   silently on read, not treated as an error.

3. CRUD in the existing data-access layer, going through useActiveUserId() —
   never user.uid directly: list (ordered by sort_order, excluding
   soft-deleted), create, update, reorder, setIncludeInExport, softDelete.

   Toggling a legend row writes through update. Debounce it — a user flipping
   four toggles shouldn't produce four round trips.

Data layer only in this prompt — no UI. Show the plan first.
```

---

## Prompt 2 — Selectors

```
Extend src/lib/chartSelectors.ts. Follow section 0 rules.

1. Generalize getTriggerDays into getEventDays(db, userId, kind, id, from, to)
   where kind is 'trigger' | 'medication', returning string[] of dates the item
   was logged. Keep getTriggerDays as a thin wrapper if anything already calls
   it, or update the callers — your choice, tell me which in the plan.

   Follow the existing LEFT JOIN + `deleted_at IS NULL` in the ON clause
   convention. Putting it in WHERE degrades to an inner join and silently kills
   the null state — this already bit us once in getMonthWorstSeverity.

2. Add getMoodSeries alongside the existing getStressSeries, same SeriesPoint
   shape.

3. Add a pure helper resolveGranularity(range, requested, hasEventSeries):
   - If hasEventSeries is true, the result is ALWAYS 'daily', regardless of
     what was requested. Bucketing makes a multi-day lag invisible, which is the
     main thing these charts exist to let someone look for.
   - Otherwise: 'auto' resolves to daily for 30d/90d, weekly for 6mo, monthly
     for 1yr/all. An explicit requested value wins.
   Return both the resolved granularity and a boolean saying whether it was
   forced, so the UI can explain itself.

Add Jest tests for resolveGranularity covering every range, every requested
value, and both hasEventSeries states. Test getEventDays against a day with the
item logged, a day logged without it, a day not logged at all, and a
soft-deleted log_triggers row. Show the plan first.
```

---

## Prompt 3 — Chart primitives

```
Fix the shared chart rendering defects and add the event lane. These affect the
existing site-severity chart too, so do them in the shared chart component
rather than duplicating. Follow section 0 rules.

1. X-axis labels: render at most 5, evenly spaced, always including first and
   last. Never one per bucket — the current behaviour is an unreadable
   overlapping smear.

2. Isolated points: a series segment of length 1 currently draws nothing when
   gaps are shown. Render those as a dot in the series color so single logged
   days are visible.

3. Insufficient-data state: if no enabled series has at least 2 buckets with
   data, don't render axes and empty plot furniture. Render a warm centered
   empty state instead — something like "Not enough logged days yet to show
   this. It'll fill in as you go." Never imply the user did something wrong.

4. New EventLanes component. A strip rendered directly beneath the plot,
   sharing the plot's x-scale EXACTLY (it must stay aligned when the y-axis
   label width changes — take the scale as a prop, don't recompute it):
   - One row per enabled event series, stacked vertically, ~10–12px each.
   - A filled tick at each date in that series' string[] of dates.
   - Each row's tick color comes from a new non-severity accent token set. Add
     these to theme.ts — warm neutral/clay family, distinguishable from each
     other and from every site line color and every severityScale entry.
   - Rows are labelled for screen readers ("Heat, logged on 14 of 90 days").

5. Faint background bands: when exactly one or two event series are enabled,
   also render full-height vertical bands behind ALL lines at very low opacity
   in that series' accent color. At three or more enabled event series, skip the
   bands entirely and rely on lanes — overlapping translucent bands produce a
   third shade that reads as a third thing.

6. Every chart exposes a text alternative describing what it plots and over what
   range, so the card isn't opaque to a screen reader.

Show me the plan and tell me which existing files you'll touch before editing.
```

---

## Prompt 4 — The OverlayCard

```
Build the overlay card. Follow section 0 rules and the layout in section 0.

Structure, top to bottom — note the chart comes FIRST, before any controls:

- Header: title (from config, or auto-generated from the enabled series), a
  share icon matching the existing cards, and a ⋯ overflow button (no-op for
  now).
- The chart, full width. Site lines at full weight; stress/mood as a thinner
  muted line drawn behind them; EventLanes beneath the plot.
- Caption, always present, two lines:
  "Triggers can take a few days to show up, if they show up at all. Look for
  what happens in the days after a marker, not just on it."
  And when stress or mood is enabled, add: "Stress and severity share a 1–5
  scale but measure different things."
- Legend rows — this is the control surface. One row per series in config.series:
  a color swatch, the name, and a toggle. The swatch must distinguish HOW that
  series is drawn: a short line segment for line series, a small filled block
  for event series. Disabled rows render greyed but stay in place — don't
  reorder or hide them on toggle, it makes the list jump under the user's thumb.
  Toggling writes through the debounced update from prompt 1.
- If granularity was forced to daily by an enabled event series, one quiet line
  under the legend saying so, e.g. "Showing daily — trigger markers need day-level
  detail to be readable."
- Footer row: "Include in export" switch, matching existing switch styling.

No time range control, no group-by, no gaps control on the card face. Those live
in the sheet in prompt 5. Reuse existing toggle/switch primitives — don't build
new ones. Show the plan first.
```

---

## Prompt 5 — The config sheet

```
Build a bottom sheet that configures an overlay chart, used for both creating a
new one and editing an existing one. Follow section 0 rules.

The sheet deliberately does NOT contain the enable/disable toggles — those live
on the card's legend. The sheet handles scope and scale only:

- Title field, prefilled with an auto-generated name; editing it stops the auto
  name from overwriting the user's.
- "What appears in this chart" — a multi-select of everything available (sites,
  Stress, Mood, the user's triggers, the user's medications), grouped with
  visible headers. Checking something adds it to config.series; unchecking
  removes it. This is what keeps the legend curated rather than 13 rows long.
  At least one site must be selected — disable Save rather than erroring after.
  Show a soft warning past ~6 selected: a chart with everything on is
  unreadable, but don't hard-block it.
- Time range: 30d / 90d / 6mo / 1yr / All.
- Granularity: Auto / Day / Week / Month. Show the resolved value inline
  ("Auto (weekly)"). When an event series is selected, show this control
  disabled with an explanation that trigger markers need daily detail — visible
  and explained, not silently removed.
- When a day wasn't logged: Show gaps / Only logged days. Default Show gaps.
  Keep the existing line: "Blank stretches mean you didn't log then — not that
  things were fine."
- Cancel / Save. In edit mode also Delete, styled destructive, with a confirm.

Reuse existing chip/toggle primitives. Save writes through the prompt 1 data
layer. Show the plan first.
```

---

## Prompt 6 — Wire up the Insights tab

```
Restructure the Insights tab. Follow section 0 rules.

- Permanent fixtures, always present, in this order: site severity over time,
  POEM, RECAP. These are a hardcoded array, NOT rows in custom_charts. No ⋯
  menu, not deletable, not reorderable.
- Below them, the custom overlay cards from custom_charts in sort_order.
- Below those, a "+ Add a chart" button opening the prompt 5 sheet in create
  mode.
- Each custom card's ⋯ menu: Edit, Duplicate, Move up, Move down, Delete.
- Delete is a soft delete. Confirm first, then show an undo affordance —
  reversible deletion matters when the thing deleted took configuration effort.
  If the project has no snackbar pattern yet, say so in the plan and propose one
  rather than inventing it silently.
- Empty state when there are no custom charts: one warm line explaining what an
  overlay chart lets you look at, and an invitation. Don't hard-sell it.

Delete the old "Severity comparison" card and any code only it used. Show the
plan and list what you're removing before touching anything.
```

---

## Prompt 7 — Export inclusion

```
Connect custom charts to the existing PDF/CSV export. Follow section 0 rules.

- The card footer switch writes include_in_export through the prompt 1 data
  layer, optimistically with rollback on failure.
- The export flow gets a review step listing what will be included: permanent
  cards (always on, shown but not toggleable) and each custom chart (pre-checked
  from include_in_export). Changes in this review step apply to that export
  only — they don't rewrite include_in_export.
- Custom charts default to excluded. One line explaining why: these are the
  user's own exploratory views, and an export is usually for an appointment.
- The CSV export of an overlay chart is the underlying tidy rows, not a
  rendering of the chart. Event series export as one column per trigger with a
  0/1 per day. Reuse pivotToWide where it fits.
- Any exported chart carries the same caption as the card, including the line
  about delay. A chart in a doctor's hands especially must not imply that a
  marker and a nearby peak are cause and effect.

Show the plan first.
```

---

## Prompt 8 — Accessibility and states pass

```
Final pass over everything built in prompts 3–7. Follow section 0 rules.

- Every chart has a meaningful accessibilityLabel describing what it plots and
  over what range. Each event lane announces its name and how many days were
  marked.
- Every switch, chip, and menu item has an accessibilityLabel and correct role.
- Legend swatches carry meaning by shape as well as color (line segment vs
  block) — verify that survives, and that nothing depends on color alone.
- Check every state: zero sites, one site, one logged day, a site with no scores
  in range, all days logged, a trigger never logged, a trigger logged every day,
  a retired site with history, six event series enabled at once, and a config
  referencing a deleted trigger.
- Confirm no raw hex or font strings crept into any new file.
- Confirm no new code implies causation, prediction, or that a higher score is a
  personal failure.

Report what you found before fixing it.
```

---

## 9. Open questions to settle yourself

- **Cap on custom charts?** A soft limit (10?) keeps the Insights tab from
  becoming an unscrollable wall.
- **Do medications belong here at all?** They're modelled as events like
  triggers so they work mechanically, but "I used my steroid cream and severity
  went down" is a very different reading from a trigger, and it's the one most
  likely to be misread as evidence about treatment. Consider shipping triggers
  only in v1.
- **Lane placement.** Specced beneath the plot. Above the plot is also
  defensible — it puts markers in the reading path before the eye reaches the
  lines. Worth trying both on device.
