# Hemera — Product Requirements

**Status:** Draft for review (stage 2 — product requirements).
Not approved until the user signs off. Supersedes nothing in
`docs/product-brief.md` except where §12 explicitly records a delta.

Source of truth order: this document → product brief → README.

---

## 1. Decisions Inherited and New

### 1.1 Confirmed at discovery (product brief §8) — unchanged

- Mobile-first native app, React Native / Expo, TypeScript.
- Local-only SQLite. No accounts, sync, or servers in MVP.
- Today = clock timeline + task pool; user-driven time-blocking. Habits
  live on the Habits tab (revised stage 3, D7).
- MVP = tasks + Today + habits only.
- Soft editorial / journal aesthetic, light theme, standard native
  interaction patterns.
- Personal / beta deployment first.

### 1.2 New confirmed decisions (stage 2)

| # | Decision |
| --- | --- |
| D1 | **Habit schedule model:** a habit is a **set of planned weekdays** ("Mon/Wed/Fri", "every day"). The create/edit sheet shows Mon–Sun day toggles instead of a per-week count. *(Revised stage 4 → D11; the earlier integer 1–7 target is dropped.)* |
| D2 | **Habit occurrence states:** `pending`, `done`, `skipped`, `missed`. Skip = intentional rest day; does not count toward the weekly count. Missed = the local day ended with the occurrence still pending; does not count toward the weekly count and is displayed neutrally. |
| D3 | **Past-scheduled task policy:** an open task whose scheduled block ended stays in the pool flagged *needs rescheduling* for **7 days**, then auto-archives into a muted, collapsed **Later** group at the bottom of the pool (expandable; one-tap reschedule or complete). Nothing becomes invisible. *(Supersedes the brief §10.2 recommendation to keep items flagged forever — see §12.)* |
| D4 | **Past-day access:** date navigation on Today reaches **any past day** with full edit capability. There is still no dedicated History screen. |
| D5 | **Habit deletion = archive.** Archived habits disappear from Today and the active Habits list; all occurrence history is retained; habits are restorable. |
| D6 | **Habit representation (stage-3 revision of A10).** A habit is represented by its **name plus a state dot/check only** — no emoji, icon, monogram, or per-habit colour. State is always the dot/check so nothing about a habit implies success. (Earlier in stage 3 a serif monogram + fixed tint palette was proposed; it was withdrawn in favour of this simpler form.) |
| D7 | **Habit UI lives on the Habits tab only.** Today has no habit elements — no strip, chips, or habit controls. Completing/skipping today's occurrence happens on the Habits tab in 2 taps. **No horizontally scrolling element exists anywhere in the app.** Supersedes A13 (habit strip on Today) and revises the brief's "compact habit strip" note. |
| D8 | **Compact timeline (stage-4 revision of A1).** The Today timeline is a compact vertical rail: one node per scheduled task, each labelled with its own start time (e.g. "13:00"); empty time collapses to spacing — no per-hour grid, no fixed 48 px/hour. It still reads as a day (rail + ordering), not a plain list. Supersedes the bounded 24 h viewport (ADR-0001). |
| D9 | **Deadline can carry a time (stage-4 revision of A4).** A deadline is an optional date plus an optional time-of-day. No time = all-day (due at end of day); with a time, due/overdue is evaluated against it (FR-T6). |
| D10 | **Habit week row (stage-4).** Each habit row on the Habits tab shows a **Mon–Sun day-cell row** instead of a plain "3× per week" count; tapping **today's** cell toggles done ↔ blank (1 tap). Planned days are emphasised and progress reads as "n of <planned days> this week" (D11); "target met" appears when done-count ≥ planned-days. Past days are read-only (missed shows muted); future days are inactive. Skip and exceptions are set in the habit detail sheet. Completing/skipping is only possible for today (revises H8). |
| D11 | **Habit days, not a weekly count (stage-4).** A habit stores a set of **planned weekdays** (Mon–Sun; at least one; default every day). The sheet shows day toggles (M T W T F S S) instead of a 1–7 stepper. **Any day can still be completed** — the planned days are a default/emphasis, not a lock; an off-day completion is allowed and counts. Only planned days that passed without a `done`/`skipped` state read as `missed`. Progress = this week's done-count vs the number of planned days in the window. Supersedes the per-week target count (D1). |

### 1.3 Assumptions (challenge any of these)

| # | Assumption | Materiality |
| --- | --- | --- |
| A1 | Timeline renders as a **compact vertical rail** — one node per scheduled task, each labelled with its own start time; empty stretches collapse to spacing (no per-hour grid). Opening Today scrolls to now / the first upcoming item (only when viewing the current day). *(Revised stage 4 — D8.)* | Low — visual only |
| A2 | Scheduling a task with a start time but no duration defaults to **30 minutes**, editable. Minimum duration 5 minutes; maximum 24 hours. | Low |
| A3 | Week start day defaults to **Monday**, user-changeable in Settings; weekly habit evaluation windows follow this setting. Changing it re-derives display windows but never rewrites occurrence states. | Medium |
| A4 | Deadlines are a **date plus an optional time-of-day**. With no time the deadline is all-day (due at end of day); with a time, "due/overdue" is evaluated against that time. *(Revised stage 4 — D9.)* | Medium |
| A5 | Completing an item shows an **undo** affordance (~5 s). Done items can also be un-completed from their edit sheet. Nothing is ever auto-un-completed. | Medium |
| A6 | Deleting a task is a **permanent delete** with confirmation (no trash can in MVP). Habit occurrences are never deleted by any action. | Medium |
| A7 | Overlapping time blocks are allowed; the timeline renders overlaps without a conflict-resolution UI (e.g., side-by-side or stacked lanes). | Low |
| A8 | Scheduling a task directly into the past is allowed (backfilling); it will immediately derive as *needs rescheduling* on next render. | Low |
| A9 | The Habits tab shows, per habit: name, Mon–Sun day cells with planned days emphasised, this-week progress caption, and a detail sheet with the last 4 weeks of occurrence dots. This is per-habit detail, not a History/day-browse screen. | Medium |
| A10 | Habits have **no personalization in MVP** — no emoji, icon, monogram, or colour; a habit is its name + planned days (D6, D11). | Low |
| A11 | *Needs rescheduling* and *needs attention* (deadline ≤ today) are **derived at read time**, never stored. All dates/times are device-local; timezone or clock changes re-derive cleanly. | High |
| A12 | Sorting: *needs rescheduling* = most recently scheduled first; deadline-attention = earliest deadline first; unscheduled = newest created first. | Low |
| A13 | ~~The habit strip on Today shows all active habits, horizontally scrollable; each chip shows name + status; tap opens inline Done/Skip actions.~~ **Superseded (stage 3, D7):** Today shows no habit UI; all habit interaction lives on the Habits tab; no horizontal scrolling anywhere. | — |
| A14 | English-only; no localization infrastructure, but no architecture work should make strings hard to extract later. | Low |

---

## 2. Domain Model and Rules

### 2.1 Task

**Fields:** title (required, non-empty, trimmed, max 200 chars),
notes (optional, plain text, max 2000 chars), deadline (optional date +
optional time-of-day), schedule (optional: date + start time + duration),
created_at, completed_at, deleted (permanent on delete).

**States:** `open`, `done`.

**Derived labels (never stored):**

- *needs rescheduling*: open ∧ scheduled block end < now ∧ age since
  scheduled end ≤ 7 days.
- *Later (auto-archived)*: open ∧ age since scheduled end > 7 days.
- *due today / overdue deadline*: open ∧ deadline reached — with no
  time, deadline date ≤ today (local); with a time, deadline datetime ≤
  now (local).

**Rules:**

- T1. Deadline and scheduled time are independent fields; a task may
  have neither, either, or both.
- T2. A done task is never auto-reopened, archived, or rescheduled.
- T3. Completing a past-scheduled or overdue task simply marks it done;
  all derived labels disappear automatically.
- T4. Rescheduling sets a new schedule (tomorrow / pick date+time /
  clear schedule). Clearing the schedule returns the task to the plain
  unscheduled pool.
- T5. One-off only. Recurring tasks do not exist in MVP; habits cover
  recurrence. (Data model must not preclude later recurrence.)
- T6. Tasks never appear on the timeline without a schedule; scheduled
  tasks never appear in the pool except under the derived labels above.
- T7. Completing or deleting a task from a past-day view is allowed
  (D4) and records the same fields.

### 2.2 Habit

**Fields:** name (required, max 100 chars), days (non-empty set of
planned weekdays, default every day), created_at, archived_at (nullable).

**Occurrence:** (habit_id, local date) unique; state ∈ {pending, done,
skipped, missed}.

**Rules:**

- H1. Occurrences exist for every local day from creation date onward.
  Days before creation have no occurrences and are never backfilled.
- H2. `missed` is **derived** and applies only to **planned days**: a
  past planned weekday with no done/skipped state reads as missed. Past
  unplanned days are neutral (no state shown, never missed). It is never
  stored as a mutation of history and never displayed with punitive
  language or color.
- H3. Weekly evaluation: count of `done` occurrences in the current
  evaluation window (per week-start setting, A3) vs. the number of
  **planned days** in that window. `skipped` never counts; `missed` is
  absence, not a count. Off-day completions do count as done.
- H4. Target met → quiet visual confirmation for that week (e.g., a
  subtle "met" indicator). No streaks, scores, percentages, or flames —
  anywhere, ever.
- H5. Editing a habit's name or planned days affects future evaluation
  and display only. Past occurrence states are never rewritten.
- H6. Skip is an explicit user action on a specific day; it cannot be
  bulk-applied.
- H7. Archiving (via delete action, confirmed) removes the habit from
  the active Habits list. Occurrence history is retained and the habit
  is restorable from Settings → Archived habits.
- H8. Completing/skipping a habit occurrence is possible **only for
  today** (D10). Past occurrences are read-only; future occurrences
  cannot be pre-completed or pre-skipped.

### 2.3 Recurring occurrences (cross-cutting)

- R1. Every occurrence (habit-day, task time block) carries independent
  state; partial completion of a recurring series never mutates siblings.
- R2. Missed ≠ deleted. History is append-only; no user action deletes
  an occurrence record.
- R3. All "day" boundaries use the device-local timezone at read time;
  derived states are recomputed on every render, not cached as truth.

### 2.4 Deferred types — conceptual rules only (not built in MVP)

These constrain the data model but require no MVP UI:

- **Event:** date + start time + duration; **no completion semantics**;
  would never enter the task pool. (MVP uses timed tasks instead.)
- **Routine:** named template of steps (task/habit references) that
  *expands* into new independent items on demand; expansion never links
  expanded items back for state mutation.
- **Goal:** longer-term outcome with optional linked tasks/milestones;
  completing linked items never auto-completes the goal.
- **Quick capture:** inbox item, distinct from a task, later
  *convertible* to a task (conversion preserves created_at).

---

## 3. Functional Requirements

Acceptance criteria (AC) are written to be testable as-is.

### 3.1 Tasks (FR-T)

**FR-T1 — Create task.** From the FAB quick-add, a task can be created
with only a title.
- AC: Given the quick-add sheet is open, when I type a title and save,
  then the task exists in the unscheduled pool with today's creation
  date and no deadline/schedule. Total interaction ≤ 10 s.
- AC: Given an empty or whitespace-only title, when I save, then save
  is blocked with inline validation.

**FR-T2 — Edit task.** Title, notes, deadline (date + optional time),
schedule (date, start time, duration) editable from the task edit sheet.
- AC: Changing the schedule of an open task updates the timeline/pool
  placement on next render.
- AC: A task with a start time but no duration gets 30 min default
  (A2) and the duration is editable.

**FR-T3 — Complete / un-complete.** Tap complete (or swipe right);
undo affordance appears ~5 s; un-complete available in edit sheet.
- AC: Completing a scheduled task removes it from the timeline and sets
  completed_at.
- AC: Un-completing restores it; if its schedule is now in the past it
  derives as *needs rescheduling*.

**FR-T4 — Delete task.** Permanent with confirmation (A6).
- AC: Cancelled confirmation deletes nothing.

**FR-T5 — Reschedule task.** Swipe-left actions: *Tomorrow*, *Pick
date/time*, *Clear schedule*.
- AC: *Tomorrow* sets start time preserved, date = today + 1.
- AC: *Clear schedule* leaves deadline untouched (T1).

**FR-T6 — Deadline behavior.** A deadline is a date + optional time
(A4, D9). A deadline ≤ now marks the task *due today / overdue* in the
pool (or as a marker on its rail node if scheduled).
- AC: With no time set, the whole deadline day counts as due; the task
  stays "due today" until the day ends and is overdue from the next day.
- AC: With a time set, the task is "due today" until that time passes,
  then overdue.
- AC: A scheduled task with a deadline does not appear twice (timeline
  only, with a deadline marker).

### 3.2 Today view (FR-D)

**FR-D1 — Layout.** Top-to-bottom: date header (with prev/next day
controls), timeline (scheduled tasks), task pool sections.
- AC: Sections follow pool ordering A12; *Later* group is collapsed by
  default and hidden entirely when empty.

**FR-D2 — Date navigation.** Prev/next day; any past day reachable
(D4). The current day is visually identified ("Today").
- AC: Opening Today while viewing today auto-scrolls the timeline to
  "now" (A1); navigating to other days does not auto-scroll.

**FR-D3 — Timeline.** Compact vertical rail (D8): one node per scheduled
task in chronological order, each labelled with its own start time and
sized subtly by duration; empty stretches collapse to spacing. Taps open
the edit sheet; swipe right completes.
- AC: A day with no scheduled tasks shows a calm empty state, not an
  empty grid.
- AC: No per-hour rows or fixed hourly spacing exist.

**FR-D4 — Task pool.** Sections: *needs rescheduling* → *due
today/overdue* (unscheduled with deadline) → *unscheduled* → *Later*.
- AC: Completing or rescheduling any item updates its section on next
  render with no manual refresh.

**FR-D5 — Past-day edit.** Any past day renders the same layout;
completion and edits allowed (D4). Habits are not shown on Today, so
past-day habit occurrences are not editable here (D10).

### 3.3 Habits (FR-H)

**FR-H1 — Create habit.** Name + planned days as Mon–Sun toggles
(D11; default every day).
- AC: At least one day must be selected; saving with no days is blocked
  in UI. No per-week count field exists.

**FR-H2 — Complete / skip.** On the Habits tab, tapping **today's** day
cell toggles done ↔ blank (1 tap) (D10); an undo affordance appears ~5 s.
Skip is set from the habit detail sheet (today only).
- AC: Tapping today's cell marks done; tapping again (or undo) reverts
  to blank/pending.
- AC: Skip sets today's occurrence to skipped; done/skip states are
  shape **and** label encoded (accessibility §7).
- AC: Past day cells and future day cells are not editable.

**FR-H3 — Weekly progress.** The habit row shows the current week's
Mon–Sun day cells (week start per A3; planned days emphasised, D11) plus
progress as "n of <planned days> this week"; the detail sheet shows the
last 4 weeks (A9, D10).
- AC: Day cells distinguish done / skipped / missed / pending / unplanned
  day without relying on color alone.
- AC: Missed is derived only for past **planned** days; unplanned past
  days stay neutral.
- AC: When weekly done-count ≥ planned-days, a quiet "target met"
  indicator appears; no other celebration UI exists.

**FR-H4 — Archive habit.** Delete action → confirmation → archive
(D5).
- AC: Archived habit leaves the Habits list; restorable from
  Settings → Archived habits with full occurrence history intact.

**FR-H5 — Edit habit.** Name and planned days editable; changes
apply going forward only (H5).
- AC: Changing planned days never rewrites any past occurrence state
  or dot.

### 3.4 Quick add (FR-A)

**FR-A1 — FAB.** Present on Today and Habits tabs; opens sheet with
Task / Habit choice.
- AC: Task is the default path (one extra tap maximum to reach title
  input).

### 3.5 Settings (FR-S)

**FR-S1 — Week start day** (default Monday, A3).
**FR-S2 — Archived habits** list + restore.
**FR-S3 — Export placeholder:** disabled entry labeled for future
export (format TBD, brief §10.4); no data leaves the device in MVP.
- AC: The app makes **zero network requests** in MVP (see NFR-P1).

### 3.6 Persistence (FR-P)

**FR-P1 — Local SQLite** with schema versioning from the first
migration; forward-only migrations; no destructive migrations in
release builds.
- AC: Upgrading the app over an older build preserves all tasks,
  habits, and occurrences.

---

## 4. User Flows

**F1 — Morning planning.** Open app → Today (today) → review *needs
rescheduling* → swipe or tap-to-schedule items onto the timeline →
Habits tab → check off today → done in < 2 min.

**F2 — Quick capture.** Any tab → FAB → type title → save. Optional:
add deadline/schedule in the same sheet without navigating away.

**F3 — During the day.** Swipe right on timeline/pool task to complete
→ undo toast; on the Habits tab, tap today's chip → Done.

**F4 — Broken day.** Next morning, yesterday's undone scheduled tasks
derive as *needs rescheduling* → one-tap *Tomorrow* or pick a date.
After 7 days they move (still expanded-on-demand) to *Later* (D3).

**F5 — Habit check-in.** Tap chip → Done or Skip. On a past day,
same actions for that day's occurrence (D4).

**F6 — Reset (deferred).** See §9 — specified, not built.

**F7 — Archive habit.** Habits tab → habit detail → Delete →
confirmation copy explains archive semantics ("history is kept") →
confirm.

**F8 — First run.** Today shows welcoming empty state with a single
primary CTA ("Add your first task") and a secondary ("Create a habit").

---

## 5. Edge Cases and Error States

| Case | Required behavior |
| --- | --- |
| App open across midnight | Derived labels update on next render/resume; no background processing required. |
| App not opened for days | On next open: pending occurrences for past days read as missed (H2); past-scheduled tasks derive by age (D3). Nothing is lost. |
| Clock/timezone change or travel | All derived states recomputed from stored local dates/times; stored history unchanged (R3). |
| DST transitions | Day boundaries follow local calendar; a 23:00–24:00 block on a 23-hour day remains valid; no special-casing beyond local-time math. |
| Task scheduled 23:30 + 60 min (crosses midnight) | Renders on its start day's timeline, clipped visually at day edge; still one task, one completion state. |
| Empty title / overlong title (200 chars) | Blocked with inline validation; no silent truncation. |
| Duration < 5 min or > 24 h | Blocked with inline validation. |
| Deadline with a time earlier today | Task reads as overdue once that time passes (D9); no time = overdue only after the day ends. |
| Deadline date changed to a past date | Becomes overdue/deferred per FR-T6/D9; no data lost. |
| Habit with no planned days | Blocked in UI (at least one day required, FR-H1). |
| Duplicate habit or task names | Allowed (no uniqueness constraint). |
| Complete from a past day | Allowed; completed_at set to real completion time (not backdated). |
| Undo after leaving screen | Undo toast is per-screen-session; un-complete remains available in edit sheet (A5). |
| Archive habit that has today's pending occurrence | Allowed; habit leaves the Habits tab list; occurrence history retained (D5). |
| Week-start change mid-week | Display windows re-derive; occurrence states untouched (A3). |
| Delete last habit / last task | Allowed; empty states render (§6). |
| Device storage failure | Show a plain, non-destructive error state ("Couldn't save — try again"); never optimistic-mark as done without write confirmation. |

## 6. Empty States

- **First run Today:** calm illustration/typographic panel; CTA "Add
  your first task"; secondary "Create a habit".
- **Empty timeline day:** soft "Nothing scheduled" line inside the
  timeline area.
- **Empty pool:** "All clear" style copy; no red/zero counters.
- **No habits (Habits tab):** "No habits yet" + *Create a habit* (the
  FAB's Habit option is the shortcut). Today shows nothing habit-related.
- **Later group empty:** hidden.
- **Week target met:** quiet "target met" chip — no confetti.- **Past day fully complete:** "Day complete" neutral line.

## 7. Non-Functional Requirements

**NFR-P — Privacy.** Local-only storage; zero network requests, no
analytics, no telemetry in MVP (FR-S3 AC). No permissions beyond what
Expo requires by default. OS-level device protection is the only
boundary; no in-app lock in MVP. Privacy nutrition labels prepared at
store time: "Data not collected."

**NFR-A — Accessibility.** Dynamic Type / font scaling respected on all
text; interactive targets ≥ 44×44 pt; text contrast ≥ WCAG AA; every
state distinguishable without color alone (icons/labels — FR-H3 AC);
VoiceOver/TalkBack labels on all controls including swipe actions;
reduced-motion respected (no required animation to convey state).

**NFR-F — Feel / performance.** Cold open → interactive Today < 2 s on
a mid-range device (target); tap feedback < 100 ms with write
confirmation shortly after (never mark done before durable write);
gesture interactions at 60 fps on mid-range hardware.

**NFR-D — Data integrity.** Schema versioning + forward-only migrations
(FR-P1); derived states never persisted (A11); occurrence history
append-only (R2); app updates never delete user data.

**NFR-O — Offline.** Fully functional offline by design; airplane mode
is an acceptance environment for every AC above.

## 8. Explicitly Excluded from MVP

| Excluded | Why | MVP substitute |
| --- | --- | --- |
| Events (distinct type) | Timed tasks cover the need | Task with schedule |
| Routines | Template/instance model = real complexity | None |
| Goals | Own screen + linking model | None |
| Quick-capture inbox | Task creation is fast enough (FR-T1 AC) | FAB task |
| Reset My Day | First post-MVP feature (spec §9) | Derived *needs rescheduling* + one-tap reschedule |
| History screen | Day-browse via date nav covers the need (D4) | Today date navigation |
| End-of-day reflection | Post-MVP | Data model stays reflection-ready |
| Energy-aware planning | Needs heuristics + data model | None |
| Accounts / sync / cloud | Deliberate scope control | — |
| Reminders / notifications | v1.1 (brief §10.3) | — |
| Dark mode, localization, widgets | Post-MVP | Light theme, English |
| Recurring tasks, subtasks, attachments, collaboration | Out of scope | — |
| Overlap conflict resolution | Tolerate overlaps (A7) | — |

## 9. Deferred Feature Specification: Reset My Day

Specified now so architecture can accommodate it; **not built in MVP**.

Trigger: user opens the app on a day after ≥ 1 day with unfinished
scheduled tasks (or manual menu action).

Flow: review screen lists preserved completed items (read-only,
affirming) and unfinished scheduled tasks grouped by how late they are;
per item, choose: *Keep time* (reschedule to equivalent slot today),
*Move to pool* (unschedule), *Pick new time*, *Dismiss* (leaves as-is,
derives normally). Missed habit occurrences are shown as historical
fact, never offered for "makeup," never guilt-laden. Confirming applies
choices in one transaction; history records what happened.

## 10. Success Criteria

Carried from brief §7, restated verifiable:

- Task capture < 10 s; day planning < 2 min (timed usability pass).
- Habit complete in 2 taps from the Habits tab.
- Zero guilt mechanics in a UI audit (no streak/score/failure language
  or chrome).
- Missed occurrences visible and neutral in habit detail (spot-check).
- Update-over-install data integrity test passes (FR-P1 AC).
- Airplane-mode pass of all primary flows.

## 11. Remaining Open Questions (non-blocking)

1. Reminder/notification strategy (v1.1) — brief §10.3.
2. Export format — brief §10.4.
3. Revisit D3's 7-day threshold after beta usage.
4. ~~Habit emoji picker scope~~ **Resolved (stage 3):** habits are
   represented by name + state dot only — no emoji, icon, monogram, or
   per-habit colour (D6).
5. Overlap rendering style (stacked vs. side-by-side lanes).

## 12. Deltas vs. Product Brief (for brief errata pass)

1. **Brief §10.1 resolved** → per-week frequency only (D1).
2. **Brief §10.2 recommendation superseded** → auto-archive after 7
   days to a muted *Later* group (D3), chosen over "stay flagged
   forever."
3. **Brief §10.5 partially resolved** → compact vertical-rail timeline
   (D8; originally a scrollable 24 h grid), 30-min default duration
   (A2).
4. **History exclusion reconciled** → no History screen, but full
   past-day access via date nav (D4).
5. Brief §5's "swipe-to-complete/reschedule" made concrete: swipe right
   = complete, swipe left = reschedule menu (FR-T3, FR-T5).
6. **A10 revised (stage 3):** no habit personalization (no emoji, icon,
   monogram, or per-habit colour); a habit is name + state dot (D6).
7. **A13 superseded / "habit strip" dropped (stage 3):** Today has no
   habit UI and no horizontally scrolling element exists anywhere; all
   habit interaction is on the Habits tab (D7).
8. **A1 revised (stage 4):** the Today timeline is a compact vertical
   rail with a time per task, not a scrollable per-hour 24 h grid (D8);
   this supersedes ADR-0001.
9. **A4 revised (stage 4):** deadlines may carry an optional
   time-of-day (D9).
10. **Habit weekly UI + H8 revised (stage 4):** Mon–Sun day cells with
    today's cell as the 1-tap completion control; target kept; past
    read-only, future inactive; today-only completion (D10).
11. **D1 revised (stage 4):** the habit "3× per week" count target is
    replaced by a set of planned weekdays shown as Mon–Sun toggles in
    the habit sheet; any day is still completable, and only planned days
    can derive missed (D11). Revises D10's progress wording.

---

*Approved (stage 2). Amended in stages 3–4: D6–D11 added, A1/A4/A9/A10
revised, D1 revised, A13 superseded (habit representation, habit UI
placement, compact timeline, deadline time, habit week row, habit days —
see §11 and §12).*
