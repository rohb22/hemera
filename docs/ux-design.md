# Hemera — UX Design

**Status:** Draft for review (stage 3, part A).
Satisfies `docs/product-requirements.md` (FR IDs cited inline).
Companion documents: `design-system.md` (tokens/components),
`architecture.md` (technical), `design-decisions/` (ADRs).

## 1. Design principles in practice

- **Clarity over clutter.** Today is the product. Two tabs, one FAB,
  sheets for everything else. No badges, no counters, no dashboards.
- **Progress without guilt.** Copy and color never scold. There is no
  red "failure" state anywhere. Missed = a quiet neutral dot.
- **Realistic planning.** Unfinished work is normal: it flows into
  *needs rescheduling* and *Later* without drama and without disappearing.
- **Editorial calm.** Generous whitespace, serif headings, hairline
  dividers, one restrained accent. The interface should read like a
  well-set page, not a control panel.

## 2. Information architecture

```
Tabs
├── Today            (tab 1 — default launch screen)
├── Habits           (tab 2)
└── FAB → Quick add  (overlay on both tabs)

Stack (pushed)
├── Settings         (gear icon, Today header)
└── Archived habits  (from Settings)

Sheets (modal layer, any screen)
├── Task create / edit
├── Habit create / edit
├── Habit detail (4-week history)
├── Reschedule options
├── Date picker (mini calendar)
└── Confirm dialogs (delete task, archive habit)

Undo toast (transient, above tab bar)
```

Navigation: Expo Router — `(tabs)` group, `settings` push, sheets as
router modals with sheet presentation (ADR-0005).

## 3. Screen inventory

| Screen | Purpose | Key FRs |
| --- | --- | --- |
| Today | The day at a glance: header, timeline, pool. Date-nav to any past day. No habits (D7). | FR-D1–D5 |
| Habits | All active habits: current-week day cells (planned days emphasised), progress caption; tap → detail sheet. | FR-H1–H5 |
| Settings | Week start, archived habits, export placeholder, about. | FR-S1–S3 |
| Task sheet | Create/edit title, notes, deadline, schedule; complete/un-complete; delete. | FR-T1–T4 |
| Habit sheet | Create/edit name, **Mon–Sun day toggles**; archive. | FR-H1, H4, H5 |
| Habit detail | Name, planned days, "this week" summary, last 4 weeks of dots. | FR-H3, A9 |
| Reschedule sheet | Tomorrow / Pick date / Clear schedule. | FR-T5 |
| Date picker | Mini calendar respecting week-start; marks today. | FR-T5 |
| Quick add | Opens in the presenting tab's mode: Today → Task (autofocus title), Habits → Habit. | FR-A1 (revised, M2) |

## 4. Today screen

### 4.1 Zones (top → bottom, single page scroll — FR-D1)

1. **Date header** (fixed): trimmed `hemera-mark.png` logo top-left
   (~64 pt, user-tuned — stage 5), serif display of weekday + date
   ("Tuesday, October 20"),
   ‹ › day controls flanking it, a quiet *Today* pill when viewing today
   (tapping it returns to today from any past day; tapping the *Today*
   tab in the bottom nav does the same), gear icon top-right.
2. **Timeline — compact rail (D8).** A single vertical rail down the
   left; one node per scheduled task in chronological order, each node
   showing its own start time (e.g. "13:00") and a block whose weight
   hints at duration (A2). Empty time collapses to spacing — there are
   no per-hour rows and no fixed hourly grid. Overlapping tasks share a
   node's lane(s) side-by-side (A7). A soft "now" marker sits between
   nodes on today only. On open of today the view scrolls to now / the
   first upcoming node (A1); no auto-scroll on past days. Midnight-
   crossing blocks note the day edge (§5). Empty day: soft "Nothing
   scheduled" line.
3. **Task pool** (continues in page scroll): sections in order —
   ***Needs rescheduling*** (A12 sort: most recent first; each row:
   title, "was scheduled Tue 14:00" caption, quick actions *Tomorrow* /
   complete) → ***Due today / overdue*** (unscheduled with deadline ≤
   today; caption "Due today" / "Was due Sun") → ***Unscheduled*** (newest
   first) → ***Later*** (collapsed disclosure, hidden when empty;
   expand reveals muted rows with one-tap reschedule/complete, D3).
   The pool excludes tasks already on the viewed day's timeline — one
   home per task (D12, FR-D4).
   Empty pool: "All clear for today" (no counters).

### 4.2 Task row anatomy

Left: 44 pt circular check control (tap = complete, with 5 s undo toast
— A5). Center: title (1 line, ellipsized), caption line with schedule /
deadline / "was scheduled…" metadata in muted ink. Right: nothing —
overflow menu (⋯) duplicates all swipe actions for accessibility.
Gestures: **swipe right** = complete; **swipe left** = reschedule menu
(*Tomorrow* / *Pick date* / *Clear schedule* — FR-T5; *Clear schedule*
leaves the deadline untouched, T1). Tapping the row body opens the task
sheet. Done tasks animate out of their section with the undo toast.

### 4.3 Past-day view (D4)

Identical layout; header shows the viewed date; no now-line; no habit
UI (D7). Tasks can be scheduled and completed on past days; completing
from a past day stamps the real completion time (§5). A *Today* pill
returns home.

## 5. Flows (system behavior detail)

**F1 Morning planning.** Open → today + auto-scroll to now. Pool shows
*needs rescheduling* first. *Tomorrow* (or swipe-left actions) reschedules
without opening the sheet. Scheduling a task: task sheet → Schedule →
date (mini calendar) + start time (native time wheel) + duration
(preset chips 15/30/60/90 + custom; default 30, min 5, max 1440 — A2).

**F2 Quick capture.** FAB → sheet autofocuses title → type → *Save*.
Extra fields (deadline/schedule/notes) expand inline; saving with only a
title is always valid (FR-T1).

**F3 During the day.** Check control or swipe-right completes → undo
toast (5 s, single *Undo* action). On the Habits tab, tapping today's
day cell marks done (1 tap). Writes commit before the UI flips; on write
failure: toast "Couldn't save — try again" and the row stays unchanged
(§5 storage-failure row).

**F4 Broken day.** Derived automatically — no flow to trigger it.
Rows appear under *needs rescheduling* with neutral "was scheduled…"
captions; after 7 days they move to *Later* (D3).

**F5 Habit check-in.** Habits tab → tap **today's** day cell → done
(1 tap; tap again or undo reverts; FR-H2). *Skip* is chosen in the habit
detail sheet. Only today's occurrence is editable (D10); past cells are
read-only and future cells inactive.

**F6 Deadline with time.** Task sheet → Deadline → date (mini calendar)
+ optional time (native time wheel); clearing the time makes it
all-day. Overdue is evaluated against the time when present (FR-T6,
D9).

**F7 Archive habit.** Habit sheet → Delete → confirm dialog: "Archive
this habit? Its history is kept and you can restore it later." →
archived (D5), toast with *Undo*.

**F8 First run.** Today shows a copy-only typographic empty panel
("A quiet start" / "Tap + to add your first task. Habits live on their
own tab."); the adaptive FAB (+) is the single CTA (D12).

## 6. States

| State | Behavior |
| --- | --- |
| Cold launch | Native splash while fonts preload + DB opens; Today renders with skeletons (timeline/pool placeholders) only if the read takes > 300 ms; target is direct render < 2 s (NFR-F). |
| Read error | Full-screen calm error panel: "Couldn't load your day." + *Try again*. Never a blank screen. |
| Write error | Non-destructive toast; UI state unchanged; no partial writes (transactions). |
| Empty | Per requirements §6 — no red, no zero-counters; the adaptive FAB is the single CTA on first run (D12). |
| Loading (sheets) | Sheets open instantly with form content; saves show inline spinner on the button, inputs disabled briefly. |

## 7. Habits screen

Header: serif "Habits" + count-free. Rows (vertical list — no horizontal
scrolling anywhere, D7, D10): name + a **Mon–Sun day-cell row** for the
current week (week start per A3; planned days emphasised) + quiet
progress caption (e.g. "2 of 3 this week"; when met, a quiet "target met"
indicator — FR-H3, D11).
- **Day cells:** tapping **today's** cell toggles done ↔ blank (1 tap,
  FR-H2), with an undo toast on complete. Today's cell is tappable even
  on an unplanned day (D11). Past cells are read-only (missed shows muted
  on planned days; unplanned past days stay neutral); future cells are
  inactive. Each cell is ≥44 pt with a label ("Tue, done" / "Wed,
  skipped" / "not planned").
- Tapping the row body (not a cell) → habit detail sheet: name, planned
  days, this-week progress sentence ("2 of 3 this week" — factual, not
  evaluative), **Set skip** for today, and the last-4-weeks day grid
  with a legend (done / skipped / missed / not yet). Overflow: Edit,
  Archive. Empty: "No habits yet" + *Create a habit*.
- Habit sheet: name + **Mon–Sun day toggles** (default every day;
  at least one required) — no weekly-count stepper (D11).

## 8. Accessibility (NFR-A, operationalized)

- All targets ≥ 44×44 pt with hit slop on icon-only controls.
- Every gesture has a tap twin (check control, overflow menu).
- Dynamic Type respected; timeline node time labels and rows reflow;
  blocks never shrink text below the minimum scale.
- Dots/states dual-encoded (shape + accessibilityLabel: "done",
  "skipped", "missed", "not yet"); VoiceOver reads rows as single
  elements with explicit actions announced.
- Focus order follows visual order; sheets trap focus while open.
- Reduced motion: block/tap animations become instant state changes.

## 9. Copy glossary (guilt-free language)

Use: *needs rescheduling*, *was scheduled*, *due today*, *was due*,
*skipped*, *target met*, *All clear*, *Later*.
Never: streak, fail, broken, missed *count*, productivity score, "you
were away", red failure chrome. "Missed" appears only as a factual
legend label for habit dots.

## 10. Open UX questions (carried)

1. Overlap rendering: equal side-by-side lanes (current choice, A7) vs.
   stacked offset cards — decide with real-device testing in stage 4.
2. ~~Habit emoji~~ **Resolved (stage 3):** habits are represented by
   name + state dot only — no emoji, icon, monogram, or per-habit
   colour (requirements D6, revised).
3. ~~Habit strip on Today~~ **Resolved (stage 3):** no habit UI on
   Today and **no horizontally scrolling element anywhere**; habits are
   a vertical list on the Habits tab (requirements D7, supersedes A13).
