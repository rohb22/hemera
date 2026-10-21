# Hemera — Architecture

**Status:** Draft for review (stage 3, part B).
Satisfies `docs/product-requirements.md`. Decisions justified in
`docs/design-decisions/` (ADR-0001…0011; 0001 superseded by 0009).

## 1. Stack

| Concern | Choice | ADR |
| --- | --- | --- |
| Runtime | React Native via **Expo** (managed workflow, TypeScript strict) | — |
| Navigation | **Expo Router** (file-based) | ADR-0005 |
| Database | **expo-sqlite**, hand-written SQL repositories | ADR-0003 |
| State | **Zustand** stores over repositories | ADR-0004 |
| Dates | Wall-clock storage + **date-fns** for local math | ADR-0006 |
| Sheets | Expo Router route modals, native `presentation: 'modal'`/`'formSheet'` (no sheet lib) | ADR-0011 |
| Fonts | `expo-font` + Fraunces via `@expo-google-fonts/fraunces` | ADR-0002 |
| Gestures/anim | `react-native-gesture-handler` + `react-native-reanimated` (swipe actions, row exit) | — |
| Test | `jest-expo` (components), Node env + **`node:sqlite`** (domain + repositories) | §10 |

Excluded by requirement: no network stack, no auth, no analytics —
the release must run fully in airplane mode (NFR-O).

## 2. Project structure

```
app/                        # Expo Router
  _layout.tsx               # providers: fonts, sheet infra, stores
  (tabs)/
    _layout.tsx             # bottom tabs + FAB overlay
    index.tsx               # Today
    habits.tsx              # Habits
  settings.tsx              # pushed stack screen
  sheet/
    quick-add.tsx           # route-modal sheets (presentation: 'formSheet'/'modal')
    task.tsx
    habit.tsx
    habit-detail.tsx
    reschedule.tsx
    date-picker.tsx
src/
  components/               # presentational (rows, dots, habit rows, timeline)
  screens/                  # Today, Habits, Settings containers
  stores/                   # zustand: tasksStore, habitsStore, uiStore
  repositories/             # tasks.ts, habits.ts, occurrences.ts, settings.ts
  domain/                   # PURE: taskLabels.ts, weeklyEval.ts, calendar.ts
  db/
    adapter.ts              # SqlExecutor interface + expo-sqlite impl
    open.ts                 # open expo-sqlite + run migrations (first launch)
    migrate.ts              # migration runner
    migrations/001_initial.ts   # SQL exported as a string
  theme/                    # tokens (design-system.md) as typed module
  lib/                      # ids (uuid), errors (AppError), result helpers
  services.ts               # composition root (repositories)
  bootstrap.ts              # app init (open DB → wire services)
assets/fonts/              # Fraunces (ADR-0002) — via @expo-google-fonts/fraunces
assets/images/             # brand assets — see "App config & assets"
docs/
tests/                      # Jest: domain + repositories (node env)
```

Dependency rule: **screens → stores → repositories → db adapter**.
`domain/` imports nothing from React, SQLite, or stores — pure
functions with injected `now` and constant inputs (testable without any
infrastructure, requirement §7 of stage brief).

**App config & brand assets (M0).** Brand files live in
`assets/images/`: `icon.png` (2048², app icon), `splash-icon.png`
(2048², splash mark), `hemera-logo.png` (2048², in-app logo — small
mark at the top-left of the Today header). Expo config (`app.json`)
references `icon` plus the splash `image` centred on a `background`
colour (`paper`, `design-system.md`). All assets are bundled locally —
no remote/network assets (NFR-P). The icon carries an alpha channel
(accepted for beta; flatten to opaque PNG for store submission).

## 3. Data flow

```
UI event → store action → repository (SQL in a transaction)
        → store updates slices → subscribed screens re-render
Derived labels are computed in render pipelines via domain functions
(never stored — A11, ADR-0007).
```

Writes are **commit-then-render**: the store awaits the repository
(throws `AppError` on failure), then flips state; UI shows pressed
feedback immediately but never marks items done before the durable
write (§5 storage-failure row, NFR-F).

## 4. Schema (migration 001)

```sql
CREATE TABLE tasks (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL
                    CHECK (length(trim(title)) > 0 AND length(title) <= 200),
  notes           TEXT NOT NULL DEFAULT ''
                    CHECK (length(notes) <= 2000),
  deadline_date   TEXT,                -- local 'YYYY-MM-DD' (A4/D9), nullable
  deadline_time   TEXT,                -- local 'HH:MM', nullable (D9; NULL = all-day)
  scheduled_date  TEXT,                -- local 'YYYY-MM-DD', nullable
  start_time      TEXT,                -- local 'HH:MM', nullable
  duration_min    INTEGER,             -- nullable; 5..1440 when set (A2)
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','done')),
  created_at      INTEGER NOT NULL,    -- epoch ms UTC
  completed_at    INTEGER,             -- epoch ms UTC
  -- schedule internal consistency (T1: deadline fully independent)
  CHECK (start_time IS NULL OR scheduled_date IS NOT NULL),
  CHECK (duration_min IS NULL OR (scheduled_date IS NOT NULL
                                  AND start_time IS NOT NULL)),
  CHECK (duration_min IS NULL OR duration_min BETWEEN 5 AND 1440),
  -- deadline time requires a deadline date (D9)
  CHECK (deadline_time IS NULL OR deadline_date IS NOT NULL)
);
CREATE INDEX idx_tasks_open_scheduled ON tasks (scheduled_date)
  WHERE status = 'open';
CREATE INDEX idx_tasks_open_deadline  ON tasks (deadline_date)
  WHERE status = 'open';

CREATE TABLE habits (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL
                 CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  days_mask INTEGER NOT NULL CHECK (days_mask BETWEEN 1 AND 127),
  created_at   INTEGER NOT NULL,
  archived_at  INTEGER                 -- NULL = active (D5)
);

-- Explicit occurrences only; absence derives pending/missed (ADR-0007)
CREATE TABLE habit_occurrences (
  habit_id  TEXT NOT NULL REFERENCES habits (id),
  date      TEXT NOT NULL,            -- local 'YYYY-MM-DD'
  state     TEXT NOT NULL
              CHECK (state IN ('pending','done','skipped')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (habit_id, date)
);

CREATE TABLE settings (               -- key/value (week_start etc., A3)
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
```

Notes:
- Deadline and schedule are **separate columns** — enforced by
  structure, not convention (T1).
- No stored derived flags: *needs rescheduling*, *Later*, *due
  today/missed* are computed (A11, ADR-0007).
- `habit_occurrences` rows are written only by explicit user action;
  un-completing updates the row to `pending` — rows are never deleted
  (R2).
- `habits.days_mask` is a Mon-first weekday bitmask (bit 0 = Monday …
  bit 6 = Sunday), non-zero (ADR-0010, D11). Planned days are a default,
  not a gate: occurrences may exist on unplanned days.
- Timestamps in epoch UTC; user-facing dates/times as local wall-clock
  strings (ADR-0006).

## 5. Domain logic (pure)

| Function | Contract |
| --- | --- |
| `taskPoolSection(task, today, now)` | → `'reschedule' \| 'attention' \| 'pool' \| 'later' \| null` (done → null). Rules per requirements §2.1 derived labels: scheduled end < now + ≤7 days → reschedule; >7 days → later; unscheduled and deadline reached (no time: date ≤ today; with time: datetime ≤ now — D9) → attention. |
| `deadlineReached(task, now)` | boolean for the deadline-time rule above (D9). |
| `poolSorting(section, tasks)` | A12 orders. |
| `occurrenceState(habit, date, row, now)` | row?.state, else (past **planned** day → 'missed', past unplanned → null, else 'pending') (H2, D11). |
| `weeklyProgress(habit, rows, weekStart)` | done-count in `[weekStart, +7d)` vs planned days in the window; met flag (H3/H4, D11). |
| `plannedOn(habit, date)` | boolean — planned weekdays as a Mon-first bitmask (D11, ADR-0010); drives missed derivation and cell emphasis. |
| `weekStartFor(date, weekStartSetting)` | A3. |
| `isCrossMidnight(schedule)` / clip helpers | §5 midnight edge case. |

All take `now: Date` as a parameter — the device clock is injected at
the store boundary only. This makes DST/timezone edge cases (§5)
unit-testable with fixed clocks.

## 6. Date/time handling (ADR-0006)

- Storage: local wall-clock (`YYYY-MM-DD`, `HH:MM`) + duration;
  instants (`created_at`, `completed_at`) in epoch UTC.
- Comparisons ("is this block past?") construct a local `Date` from
  stored parts via date-fns, so device timezone/DST math is the OS's
  (R3). Derived states recompute every read; nothing derived is cached
  as truth.
- Consequences accepted: backdating across a timezone change re-derives
  labels relative to the new zone (requirements §5, by design).
- Week windows respect the `week_start` setting (A3) in display and
  evaluation; changing the setting never rewrites rows.

## 7. Repositories & migrations

- Repositories (`tasks.ts`, `habits.ts`, `occurrences.ts`,
  `settings.ts`) are the **only** modules containing SQL. They accept a
  `SqlExecutor` (`query`, `execute`, `transaction`) —
  `db/adapter.ts` implements it over expo-sqlite; tests implement it
  over Node's built-in `node:sqlite` (§10).
- Migration runner: numbered migration modules (SQL exported as a
  string) applied in order, each in a transaction, recorded in
  `schema_migrations` (forward-only, keyed by version — no
  `user_version` pragma needed). Release builds never drop or rewrite
  user tables (FR-P1, NFR-D).
- First launch runs 001 before the UI mounts (splash-gated, §9).

## 8. State stores (Zustand)

| Store | Slice |
| --- | --- |
| `tasksStore` | `byId`, `todayView: { date, sections }`, actions: `create/update/complete/uncomplete/remove/reschedule/clearSchedule`, `loadDay(date)`. |
| `habitsStore` | `active[]`, `archived[]`, `weekDots`, actions: `create/update/archive/restore/setOccurrence(habitId, date, 'done'\|'skipped'\|'pending')`. |
| `uiStore` | toast queue (undo), sheet routing helpers, `now` snapshot refreshed on AppState active + day change (drives derived recompute). |

Derived labels are **selectors** (recomputed from raw rows + `now`),
not stored fields — a timezone or clock change only requires a `now`
refresh (midnight edge case in §5: AppState `change` listener bumps
`now`, screens re-derive).

## 9. Error handling & resilience

- All repository failures surface as typed `AppError` (`code:
  'write' | 'read' | 'migration'`).
- Stores expose `{ status: 'loading' | 'ready' | 'error' }`; Today's
  error state renders the calm retry panel (ux-design §6).
- Transactions wrap multi-row writes; no partial state on failure.
- Migration failure on upgrade: keep DB untouched, show "couldn't
  update" panel with retry — never silently wipe (NFR-D).

## 10. Testing

| Layer | How |
| --- | --- |
| `domain/` | Pure Jest unit tests; fixed `now` fixtures covering: DST days, midnight-crossing blocks, 7-day Later boundary (inclusive/exclusive), week-start variants, missed derivation. |
| repositories | Node-env Jest + `node:sqlite` in-memory running the **same migration SQL**; CRUD + constraint tests (CHECKs, uniqueness), transaction rollback. |
| stores | Jest with mocked repositories: commit-then-render ordering, error paths leave state unchanged. |
| components | `jest-expo` + Testing Library: task row states, dots legend dual-encoding, sheet validation messages. |
| E2E | None in MVP (stage 4 may add Maestro smoke flows). |

CI-ready single command: `npm test` (both envs via project split).

## 11. Performance & accessibility notes

- Cold open: splash until fonts + DB open + first `loadDay` resolve;
  target < 2 s (NFR-F). SQLite indices cover the two hot reads
  (today's open scheduled tasks; open tasks by deadline).
- Lists: Today's sections render plain `ScrollView` slices (a day is
  bounded data); Habits screen likewise — no virtualization needed at
  MVP scale; revisit if a user accumulates hundreds of habits.
- A11y is structural: every interactive component in `components/`
  ships with `accessibilityRole`/`accessibilityLabel` and a ≥44 pt hit
  target by default (reviewed in component checklist, stage 4).

## 12. Explicit non-goals

Sync, accounts, analytics, widgets, dark mode, localization
infrastructure. **v1.1 notifications are local OS-scheduled reminders
only** — no push, no server, no background fetch
(`docs/v1.1-reminders.md`, D13); `INTERNET` stays blocked. The schema's
epoch timestamps and append-only occurrence rows keep a future
export/sync path feasible without redesign.
