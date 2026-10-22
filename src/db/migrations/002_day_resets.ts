export const sql = `
CREATE TABLE IF NOT EXISTS day_resets (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL,
  applied_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS day_reset_items (
  reset_id       TEXT NOT NULL REFERENCES day_resets (id) ON DELETE CASCADE,
  task_id        TEXT NOT NULL,
  action         TEXT NOT NULL
                  CHECK (action IN ('keep','pool','pick','dismiss')),
  from_date      TEXT,
  from_time      TEXT,
  from_duration  INTEGER,
  to_date        TEXT,
  to_time        TEXT,
  to_duration    INTEGER,
  PRIMARY KEY (reset_id, task_id)
);
CREATE INDEX IF NOT EXISTS idx_day_resets_date ON day_resets (date);
`;

export const version = 2;
export const name = '002_day_resets';
