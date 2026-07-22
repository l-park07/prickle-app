// Prickle — local SQLite schema (expo-sqlite)
// ----------------------------------------------------------------------------
// Design goals:
//   * "Long" / normalized so sites, meds, and triggers are ROWS not COLUMNS
//     (users track different sites and multiple meds/triggers per day).
//   * Sync-ready: every row has a UUID, timestamps, user_id, and soft-delete
//     so phase-3 Firestore sync is a mechanical push/pull (see earlier notes).
//   * The wide "spreadsheet" view (one column per site) is generated in code
//     for display/export — it is NOT how the data is stored.
//
// Conventions:
//   * id           TEXT  -> a UUID you generate on the device (crypto.randomUUID / expo-crypto)
//   * user_id      TEXT  -> Firebase Auth uid, stamped once the user is signed in
//   * *_at         TEXT  -> ISO 8601 timestamps
//   * deleted_at   TEXT  -> NULL = live; set = soft-deleted (so deletions sync too)
// Applied with db.execAsync(...) on app launch (CREATE TABLE IF NOT EXISTS is idempotent).
// See src/lib/db.ts.

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- --- User-configurable reference tables ------------------------------------

-- The body sites a user chooses to track (Neck, Elbows, Hands, ...).
-- Charts toggle a line on/off by filtering on site_id — no schema change.
CREATE TABLE IF NOT EXISTS sites (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  name        TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,   -- 0/1; lets a user retire a site without deleting history
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);

-- A user-created overlay chart for the Insights tab (site severity lines +
-- stress/mood + trigger/medication event lanes). config is JSON — see
-- CustomChartConfig in manageCustomCharts.ts for the shape.
CREATE TABLE IF NOT EXISTS custom_charts (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT,
  title              TEXT NOT NULL,
  config             TEXT NOT NULL,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  include_in_export  INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  deleted_at         TEXT
);

-- The treatments a user tracks. category powers your "manage treatments" feature.
CREATE TABLE IF NOT EXISTS medications (
  id              TEXT PRIMARY KEY,
  user_id         TEXT,
  name            TEXT NOT NULL,            -- "Prescription TCS", "Dupixent", "Cetirizine", ...
  category        TEXT NOT NULL,            -- 'tcs' | 'prescribed_inhibitor' | 'biologic' | 'antihistamine' | 'otc' | 'lifestyle' | 'homeopathic' | 'other'
  delivery_method TEXT,                     -- 'topical' | 'oral' | 'injectable' | 'other', nullable
  frequency       TEXT,                     -- free-text label, e.g. "Daily", "1 week on / 2 weeks off"
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT
);

-- Known or suspected triggers — the ONE trigger list. is_testing flags ones
-- under active investigation (your trigger-discovery feature).
-- A trigger is "watched" iff it has an active experiments row (see below);
-- otherwise it's "known". That state lives on experiments, not here.
CREATE TABLE IF NOT EXISTS triggers (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  name        TEXT NOT NULL,                -- "Hard water", "Fragranced products", "Cold dry air", ...
  slug        TEXT,                         -- content/triggerCatalog.ts CatalogTrigger.id; NULL for a custom (name-only) trigger
  category    TEXT NOT NULL DEFAULT 'other', -- 'indoor'|'outdoor'|'ingesting'|'applying'|'touching'|'other' — denormalized so rendering the subtext never needs a catalog join
  is_testing  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);

-- Optional structured experiments (Jason's "Active Experiment": detergent, diet, ...).
-- Also doubles as a trigger's observation window: trigger_id/start_date/end_date
-- are set when the user starts "watching" a trigger from the Triggers tab. A
-- trigger counts as watched while a row here has trigger_id = that trigger,
-- deleted_at IS NULL, and end_date in the future. Once end_date has passed,
-- reviewed_at stays NULL until the end-of-window prompt is completed (see
-- getPendingReviewObservations in manageTriggers.ts) — that's what separates
-- "ended, needs review" from "archived" on the Triggers tab.
CREATE TABLE IF NOT EXISTS experiments (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  name         TEXT NOT NULL,
  hypothesis   TEXT,
  started_on   TEXT,                          -- 'YYYY-MM-DD'
  ended_on     TEXT,
  trigger_id   TEXT REFERENCES triggers(id),  -- set when this row is a trigger's watch window
  start_date   TEXT,                          -- 'YYYY-MM-DD', watch window start
  end_date     TEXT,                          -- 'YYYY-MM-DD', watch window end (start + 14 days minimum)
  note         TEXT,                          -- optional end-of-window note; nothing writes this yet
  reviewed_at  TEXT,                          -- set once the end-of-window add/remove + note prompt is completed
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT
);

-- Free-text, date-stamped notes a user leaves against a trigger's watch window
-- (experiments row), added either mid-observation or from the Triggers Watch
-- Archive. Many-to-one so a window can carry a running log, not just one note.
CREATE TABLE IF NOT EXISTS observation_notes (
  id            TEXT PRIMARY KEY,
  user_id       TEXT,
  experiment_id TEXT NOT NULL REFERENCES experiments(id),
  body          TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_observation_notes_experiment ON observation_notes(experiment_id);

-- --- Daily logging ---------------------------------------------------------

-- One row per user per day. Site scores / meds / triggers hang off this.
CREATE TABLE IF NOT EXISTS daily_logs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT,
  log_date      TEXT NOT NULL,               -- 'YYYY-MM-DD'
  stress        INTEGER,                     -- 0-5, nullable (some days blank in your data)
  mood          INTEGER,                     -- 0-5, nullable
  experiment_id TEXT REFERENCES experiments(id),
  note          TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT
);
-- One live log per day per user:
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_user_date
  ON daily_logs(user_id, log_date) WHERE deleted_at IS NULL;

-- The heart of the "long" design: one row per site per day.
CREATE TABLE IF NOT EXISTS site_scores (
  id          TEXT PRIMARY KEY,
  log_id      TEXT NOT NULL REFERENCES daily_logs(id),
  site_id     TEXT NOT NULL REFERENCES sites(id),
  score       INTEGER,                       -- 0-5, nullable (site may be unscored that day)
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_site_scores_log ON site_scores(log_id);
CREATE INDEX IF NOT EXISTS idx_site_scores_site ON site_scores(site_id);

-- Many-to-many: which meds were taken on a given day (multi-select checkboxes).
CREATE TABLE IF NOT EXISTS log_medications (
  id            TEXT PRIMARY KEY,
  log_id        TEXT NOT NULL REFERENCES daily_logs(id),
  medication_id TEXT NOT NULL REFERENCES medications(id),
  created_at    TEXT NOT NULL,
  deleted_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_log_meds_log ON log_medications(log_id);

-- Many-to-many: which triggers were contacted on a given day (multi-select).
CREATE TABLE IF NOT EXISTS log_triggers (
  id          TEXT PRIMARY KEY,
  log_id      TEXT NOT NULL REFERENCES daily_logs(id),
  trigger_id  TEXT NOT NULL REFERENCES triggers(id),
  created_at  TEXT NOT NULL,
  deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_log_triggers_log ON log_triggers(log_id);

-- Photos: store the LOCAL uri now; cloud_url stays NULL until phase-3 upload.
CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  log_id      TEXT REFERENCES daily_logs(id),
  site_id     TEXT REFERENCES sites(id),
  local_uri   TEXT NOT NULL,                 -- expo-file-system path
  cloud_url   TEXT,                          -- filled after Cloud Storage upload later
  score       INTEGER,                       -- the score tagged to this photo
  taken_at    TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_photos_log ON photos(log_id);

-- --- Weekly clinical assessment (POEM & RECAP) -----------------------------
-- Separate cadence from daily logs. Store the raw scores only; derive the
-- severity/control BAND in code (the bands are deterministic ranges, so storing
-- them like the spreadsheet does just risks drift).
CREATE TABLE IF NOT EXISTS weekly_assessments (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  week_start  TEXT NOT NULL,                 -- 'YYYY-MM-DD' (Monday of the ISO week)
  poem_score  INTEGER,                       -- 0-28
  recap_score INTEGER,                       -- 0-28
  answers     TEXT,                          -- JSON per-question answers for THIS row, so an edit can pre-fill
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_user_week
  ON weekly_assessments(user_id, week_start) WHERE deleted_at IS NULL;
`;
