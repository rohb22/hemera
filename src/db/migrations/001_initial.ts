export const sql = `
CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL
                    CHECK (length(trim(title)) > 0 AND length(title) <= 200),
  notes           TEXT NOT NULL DEFAULT ''
                    CHECK (length(notes) <= 2000),
  deadline_date   TEXT,
  deadline_time   TEXT,
  scheduled_date  TEXT,
  start_time      TEXT,
  duration_min    INTEGER,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','done')),
  created_at      INTEGER NOT NULL,
  completed_at    INTEGER,
  CHECK (start_time IS NULL OR scheduled_date IS NOT NULL),
  CHECK (duration_min IS NULL OR (scheduled_date IS NOT NULL
                                  AND start_time IS NOT NULL)),
  CHECK (duration_min IS NULL OR duration_min BETWEEN 5 AND 1440),
  CHECK (deadline_time IS NULL OR deadline_date IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_tasks_open_scheduled ON tasks (scheduled_date)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_tasks_open_deadline  ON tasks (deadline_date)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS habits (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL
                 CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  days_mask    INTEGER NOT NULL CHECK (days_mask BETWEEN 1 AND 127),
  created_at   INTEGER NOT NULL,
  archived_at  INTEGER
);

CREATE TABLE IF NOT EXISTS habit_occurrences (
  habit_id   TEXT NOT NULL REFERENCES habits (id),
  date       TEXT NOT NULL,
  state      TEXT NOT NULL
               CHECK (state IN ('pending','done','skipped')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (habit_id, date)
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
`;

export const version = 1;
export const name = '001_initial';
