# Hemera — Implementation Plan

**Status:** Stage 4 — **approved (user sign-off).** Supersedes the earlier
draft; no application code is written until development (stage 5) is
explicitly approved.
**Source of truth:** `docs/product-requirements.md` (behavior), with
`docs/ux-design.md`, `docs/design-system.md`, `docs/architecture.md`,
and `docs/design-decisions/` (ADR-0001–0010; 0001 superseded by 0009) as
the approved stage-3 design. This plan adds no new behavior; every
milestone references a requirement or ADR. If a rule and this plan
disagree, requirements win.

## 1. Approach

Milestones are **vertical slices**: each one ends with something usable,
demoable on a device, and covered by tests. Foundations are built inside
M0 rather than as a separate up-front phase, so integration risk
(navigation + SQLite + state) surfaces in the first slice. Each milestone
ends with a short device demo and leaves `main` in a working state.

## 2. Definition of Done (applies to every milestone)

A milestone is done only when all hold:

- **Types & lint clean:** `npx tsc --noEmit` and the linter pass with no
  new warnings.
- **Tests pass:** domain/unit tests (pure logic) and repository tests
  (in-memory/temp DB) for everything added; `npm test` green.
- **Runs on device:** verified on iOS and Android (Expo Go/dev build) —
  the milestone demo works from a cold start with real persistence.
- **Persistence:** data added in the demo survives an app relaunch;
  `FR-P1` (schema versioning) is exercised by at least one migration on
  an existing DB.
- **Copy & chrome:** guilt-free language (requirements §9) and no red
  failure chrome; **no horizontally scrolling element** (D7); Today is
  the timeline + pool only (no habit UI), habits live on the Habits tab
  (D7).
- **Docs:** any behavioral change is reflected in requirements/UX/ADR
  before the milestone closes; no silent decisions.
- **No scope creep:** excluded features (brief §8) stay out.

## 3. Milestones

### M0 — Walking skeleton (foundations + one task end-to-end) ✅ complete

**Goal:** an installable app that persists one task through a real
SQLite schema, proving the whole stack.

**Scope / FRs:** FR-P1, FR-T1 (title-only path), FR-T3 (complete + undo),
FR-A1 (FAB shell), FR-D1/D4 (pool render, single section initially),
A5 (5 s undo).

**Tasks**
- Scaffold Expo app (TypeScript, strict) with Expo Router; tabs Today /
  Habits / Settings as shells (ADR-0005). Empty-safe.
- Design tokens + theme (colors, type scale, spacing, radii) from
  `design-system.md`; bundle Fraunces (ADR-0002); wire fonts + splash.
- App config & brand assets: point `app.json` `icon` + splash `image`
  at `assets/images/` (owner supplies a 1024² PNG icon + PNG logo;
  architecture note); splash background = `paper`.
- Tooling: ESLint + Prettier + Jest (jest-expo) + `tsc --noEmit` script.
- DB layer: `SqlExecutor` adapter + expo-sqlite impl (ADR-0003);
  migration runner (ADR-0006 for time storage); base schema
  `tasks`, `habits`, `habit_occurrences`, `settings` (architecture §).
- `tasksRepository` create/list/complete/uncomplete; `tasksStore`
  (Zustand, commit-then-render, ADR-0004); `uiStore` skeleton.
- Quick-add task sheet (title only, autofocus, FR-T1).
- Today pool: single "Unscheduled" section from the DB; task row (check
  control → complete, undo toast 5 s).
- Repo tests + domain test for the one derived label used.

**Demo:** cold start → FAB → type a title → Save → appears in Today pool
→ complete → undo → relaunch → data still there.

**Risks to retire:** expo-sqlite on both platforms; fonts/splash; router
tabs; store↔DB write path.

---

### M1 — Today: timeline + scheduling

**Goal:** plan a day on the timeline and have the app survive a broken
plan.

**Scope / FRs:** FR-D1, FR-D3, FR-D4, FR-D5 (layout only), FR-T2, FR-T5,
FR-T6; A1, A2, A4, A7, A8, A12; D3 (reschedule → 7-day → *Later*); D8,
D9.

**Tasks**
- Compact timeline rail (ADR-0009, D8): one rail hairline, a node +
  start-time label per scheduled task, duration as block height/padding,
  a now marker (today only), auto-scroll to now (A1); no per-hour rows,
  no bounded 24 h grid; page continues to the pool.
- Timeline blocks from scheduled tasks; duration sizing (A2); overlap
  lanes (A7 — decide side-by-side vs stacked here; see §5).
- Task sheet: schedule section — date (mini calendar), start time
  (native time wheel), duration chips 15/30/60/90 + custom (A2), notes;
  deadline section — date + **optional time** (D9, FR-T2/T6); all-day
  when time is omitted.
- Deadline semantics: overdue = past date, or same day past the time when
  a time is set (`deadlineReached`, D9); derived label distinguishes
  *Due today* vs *Overdue* (FR-D3/§2.1).
- Pool derivation: `taskPoolSection` (reschedule/attention/pool/later);
  sections *Needs rescheduling* → *Due today/overdue* → *Unscheduled* →
  *Later* (collapsed) (FR-D4, A12); captions ("was scheduled …").
- Quick actions: *Tomorrow* on rescheduling rows; clear schedule;
  swipe-left menu + overflow twin (FR-T5).
- 7-day auto-archive to *Later* policy (D3) with pure-logic tests.

**Demo:** schedule two overlapping tasks; one carries a deadline with a
time; a past-scheduled task shows under *Needs rescheduling* → *Tomorrow*;
an old one sits in *Later*.

**Risks:** compact-rail readability with dense days; overlap rendering;
date/time math around day edges (use date-fns — see §5).

---

### M2 — Habits (vertical slice)

**Goal:** the full habit loop, on its own tab, guilt-free.

**Scope / FRs:** FR-H1–H5, FR-A1 (habit option), FR-D2 (Habits tab only);
A9, A13→superseded; D1→D11, D2, D5, D6, D7, D10, D11.

**Tasks**
- Habits tab: vertical list of rows — name + **Mon–Sun day cells**
  (planned days emphasised) + progress caption; no horizontal scrolling
  (D7, D10, D11).
- Day cells (D10/D11): one cell per day Mon–Sun; **today's** cell is the
  only editable one — tap toggles done ↔ blank (1 tap, reversible, no
  confirm), even on an unplanned day; past cells read-only; future cells
  inactive; states done / skipped / missed / not-yet, dual-encoded
  (fill/shape + label).
- Planned days as a Mon-first bitmask + "n of <planned> this week"
  progress; quiet "target met" note, no streak language; planned days
  emphasise cells but never gate them (D11).
- Create/edit habit sheet: name + **Mon–Sun day toggles** (default every
  day, ≥1 required) — no weekly-count stepper (FR-H1/H5, D11); no
  personalization (A10, D6); **Skip today** lives here (2 taps,
  reversible) since the popover is gone (D10).
- `plannedOn`, `weeklyProgress`, `occurrenceState` pure logic (H2/H3/H4);
  missed derived only on past planned days; cells from week-start
  setting (A3, FR-S1 interplay).
- Habit detail sheet: this-week sentence + last-4-weeks dot grid with
  legend (done/skipped/missed/not yet) (A9, FR-H3).
- Archive habit → confirm → history retained + restore path scaffold
  (FR-H4/D5; full restore UI lands in M3 with Settings).
- Missed derivation on day rollover (H2) with tests; neutral display.

**Demo:** create a habit (3×/week) → tap today's cell to complete →
skip another from its sheet → detail shows the 4-week grid → archive with
history kept.

---

### M3 — Past-day navigation + Settings

**Goal:** reach any past day with full edit; minimal settings.

**Scope / FRs:** FR-D2, FR-D5, FR-S1, FR-S2, FR-S3; D4; §6 empty states;
§5 error states.

**Tasks**
- Date navigation: prev/next day, *Today* pill, no now-line on past days;
  full task edit on past days (FR-D5).
- Settings (header gear): week start day (FR-S1); Archived habits list +
  restore (FR-S2, D5); export placeholder disabled (FR-S3).
- Empty states (§6): first-run panel, empty timeline, empty pool,
  no-habits, *Later* hidden, week-target-met; first-run copy finalize.
- Error states (§5): read error panel, write-error toast, storage
  failure; loading skeletons.
- First-run seed? No — keep clean; optional dev-only demo data.

**Demo:** navigate to last week, edit/complete a task; change week start;
archive then restore a habit.

---

### M3.5 — Dependency & tooling decisions (small, do before/within M0–M3)

Resolve the open stage-3 proposals (see §5). Each is a written decision
(ADR or a line in the relevant doc) before its milestone closes.

---

### M4 — Polish, hardening, beta

**Goal:** a beta build you can use daily on your own phone.

**Scope / FRs:** NFR-A (accessibility), NFR-F (perf), §5 edge cases,
FR-P1 (migration from a real prior DB).

**Tasks**
- Accessibility pass: Dynamic Type, labels/roles, dual-encoded states,
  focus order, reduced motion, tap twins for every gesture.
- Performance: cold-start target < 2 s, list/scroll smoothness, avoid
  re-render churn (selectors).
- Edge-case matrix verified on device: midnight, DST, timezone change,
  storage failure, archive-with-pending, 200-char title, duration bounds,
  deadline all-day vs timed (D9).
- Migration test: install previous build's DB → migrate → data intact.
- EAS build config + personal beta distribution (TestFlight / internal);
  privacy labels (no network, local-only).
- Copy review (guilt-free audit) + optional dev demo data for review.

**Demo:** install beta via TestFlight/internal, use it for a real day.

---

## 4. Dependency graph

```
M0 ─▶ M1 ─▶ M2 ─▶ M3 ─▶ M4
        └───────────────┘   (M2 and M3 are independent; either order OK)
```
M0 blocks everything. M1 before M4 (visual QA surface). M2 and M3 may
swap; M3 gives Settings used by M2's restore, so M2→M3 is the smoother
default.

## 5. Open decisions to settle in stage 4/early dev

| # | Decision | Proposal carried | Settle by |
| --- | --- | --- | --- |
| 1 | Bottom-sheet lib | **Resolved (M0): no lib — Expo Router route modals with native `presentation: 'modal'`/`'formSheet'`** (ADR-0011) | M0 — resolved |
| 2 | Date lib | `date-fns` (tree-shakeable, no tz db) | M0 — resolved |
| 3 | Repository test strategy | **Resolved (M0): Node built-in `node:sqlite` in-memory (no native build step)** | M0 — resolved |
| 4 | Migration runner design | **Resolved (M0): numbered migration modules (SQL as exported string) + `schema_migrations` table (forward-only)** | M0 — resolved |
| 5 | `now` snapshot | `now` in `uiStore`, refreshed on AppState resume | M1 |
| 6 | Timeline layout | compact rail w/ node + time per task (ADR-0009, D8) | M1 |
| 7 | Undo window | 5 s toast | M0 — resolved |
| 8 | Overlap lanes | side-by-side equal lanes (A7) vs stacked | M1 |
| 9 | Date/time pickers | custom mini-calendar + native time wheel | M1 |
| 10 | Settings entry | header gear (not a tab) | M3 |
| 11 | Color/type values | as specified in `design-system.md` | M0 — resolved |
| 12 | First-run copy | as specified in `ux-design.md` §6 | M3 |
| 13 | In-app logo placement | small mark, top-left of Today header (brand assets provided) | M0 — resolved |
| 14 | Package manager | **Resolved (M0): pnpm (hoisted node_modules via `node-linker=hoisted`; build scripts allow-listed in `pnpm-workspace.yaml`)** | M0 — resolved |

Anything here can become an ADR if it turns out to be structural.

## 6. Testing strategy

- **Pure logic (fast, exhaustive):** `taskLabels`, `taskPoolSection`,
  `occurrenceState`, `weeklyProgress`, calendar/week-boundary helpers —
  property/table tests, injected `now`/week-start. These carry the
  behavioral risk, so they get the most coverage.
- **Repositories:** real SQL against a temp/in-memory DB; CRUD, archive,
  occurrence uniqueness `(habit_id, date)`, migration up from prior
  version.
- **Stores:** reducer-ish action tests with a fake repository.
- **Manual device pass:** per-milestone demo script; a short checklist
  for a11y and the M4 edge-case matrix.
- No snapshot-testing of UI at MVP scale; keep tests behavioral.

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Compact rail gets tall/unwieldy on very busy days | Rail scales with content; no fixed viewport; M1 prototype check on a dense day |
| Overlap rendering complexity | Decide in M1 with a limited lane algorithm; A7 allows "no conflict UI" |
| Date/DST bugs | date-fns + single `now` snapshot + table tests |
| expo-sqlite API drift | adapter interface isolates it (ADR-0003) |
| Scope creep (events/routines/reminders) | brief §8 guardrail in DoD |

## 8. Definition of Done for stage 4

The plan is "done" when: this doc is approved, the §5 decisions have an
owner milestone, and `AGENTS.md` moves to stage 5 readiness. **No code is
written until development is explicitly approved.**

---

*Approved (stage 4). Stage 5 (development) began after explicit
approval. M0 closed (device-verified via Expo Go; typecheck/lint/tests
green); M1 in progress.*
