# Hemera — Product Brief

**Status:** Approved draft (product discovery, stage 1)
**Tagline:** Your entire life, organized one day at a time.

## 1. Product Vision

Hemera (Ἡμέρα) is a thoughtful daily life planner that brings tasks and
habits together in one calm, coherent daily view. It helps people plan
realistic days, adapt when plans change, and build consistency without
guilt.

## 2. Target Users

**Primary:** the *overwhelmed planner user* — someone juggling work and
personal commitments who currently splits life across a calendar app, a
to-do app, and a habit tracker, and feels fragmented because of it.

**First problem solved:** "I can't see my day in one place, and I don't
trust any single tool enough to rely on it."

Hemera is not for productivity optimizers or quantified-self users. It is
for people who want to feel calmly on top of their day.

## 3. Core Problem & Product Principles

Core problem: existing tools either force everything onto a rigid
calendar or reduce life to a flat checklist. Neither reflects how people
actually plan — a mix of fixed-time commitments, flexible intentions, and
recurring behaviors.

Principles (from README, refined for decision-making):

- **Clarity over clutter.** The Today view is the product. Every feature
  must justify its presence there.
- **Consistency over streaks.** No flames, scores, or guilt mechanics —
  ever.
- **Realistic planning over idealized schedules.** Unfinished plans are
  normal; the app helps adapt, not scold.
- **Progress without guilt.** Missed occurrences are recorded neutrally.
- **Reflection over productivity scores.** (Defer reflection UI to
  post-MVP; keep the data model reflection-ready.)
- **Distinct things behave distinctly.** Tasks, habits, and (later)
  events/routines/goals are not forced into one shape.

## 4. Primary User Journeys

### J1 — Morning planning (≈2 minutes)
Open Hemera → Today shows the date, habit strip, timeline, and task
pool. User reviews leftover tasks flagged "needs rescheduling," assigns
times to a few tasks by moving them onto the timeline, and commits.

### J2 — Quick task capture (<10 seconds)
A thought occurs → tap the FAB → type a title → save. The task lands in
the pool. Optionally add a deadline or schedule it now or later.

### J3 — During the day
Glance at Today → tap to complete a timeline item or check off a habit.
Swipe left on a scheduled task to reschedule it (tomorrow / pick date).

### J4 — Adapting to a broken day
Life happens. Scheduled tasks that weren't done appear in the pool
flagged **needs rescheduling** — neutrally, with a one-tap "move to
tomorrow." Nothing is auto-deleted or auto-rolled without user action.

### J5 — Habit check-in
From the Today habit strip or Habits tab → mark today's occurrence done,
skip, or leave it. History accumulates; targets are evaluated over a
flexible period, not a brittle daily streak.

## 5. MVP Scope

### Included

| Area | Capability |
| --- | --- |
| Tasks | Create/edit/complete/delete. Optional deadline (date). Optional scheduled time block (date + start time + duration). Notes optional-simple. |
| Today | Date navigation. Clock timeline showing scheduled tasks for the day. Task pool: unscheduled tasks + past-scheduled tasks flagged "needs rescheduling" + tasks due today. Compact habit check-in strip. |
| Habits | Create/edit/complete. Flexible targets (e.g., "3× per week"). Daily occurrences with states: done, missed, skipped. Full history preserved. |
| Habits tab | List of habits with recent completion patterns and today's status. |
| Quick add | FAB on every screen → task or habit. |
| Settings | Minimal: week start day, data export placeholder (disabled or JSON dump). |
| Persistence | Local-only SQLite (via Expo). Schema versioning from day one. |

### Explicitly excluded from MVP

- Events as a distinct type (timed tasks cover this adequately in v1).
- Routines (reusable sequences).
- Goals (long-term outcomes, milestones).
- Quick-capture inbox for non-task thoughts (deferred; task creation must
  be fast enough to compensate).
- **Reset My Day** — named first post-MVP feature; the "needs
  rescheduling" flag is its minimal seed.
- History screen (data model is history-ready; UI later).
- End-of-day reflection.
- Energy-aware planning.
- Accounts, sync, cloud backup.
- Reminders / notifications (local notifications planned for v1.1).
- Dark mode, localization, widgets, iOS/Android feature parity beyond
  core.

## 6. Domain Concepts & Distinct Behaviors

### Task
Actionable item. **Deadline** (must be done *by* a date) is a separate
field from **scheduled time** (intended *when* it will be done). A task
may have neither, either, or both. States: open, done. A done task is
never un-completed automatically. Overdue or past-scheduled open tasks
surface in the pool flagged *needs rescheduling*.

### Habit
Recurring behavior with a **flexible target** (e.g., "3× per week")
rather than a daily binary. Each day generates an *occurrence* with a
neutral state: done, missed, or skipped. Missed occurrences are never
deleted and never break the record; there is no streak counter. Hitting
the weekly target is celebrated with quiet feedback, not gamification.

### Recurrence rule (applies to habits in MVP)
Habit → generates daily occurrences → each occurrence has independent
completion state. History = the immutable log of occurrences. Editing a
habit's target affects future evaluation only, never past records.

### Not-yet concepts (design must not preclude them)
- **Event:** time + duration anchor, no completion semantics.
- **Routine:** template that expands into tasks/habits for a day.
- **Goal:** outcome linked to tasks/milestones.
- **Quick capture:** inbox item later convertible to a task.

The task/habit schema should store enough (type discriminator or
separate tables, timestamps, occurrence linkage) that these can be added
without migration pain.

## 7. Initial Success Criteria

- Capture a task in **< 10 seconds** from any screen.
- Plan a day in **< 2 minutes** from a cold open.
- Complete a habit in **2 taps** from Today.
- Zero guilt mechanics in the UI (no streaks, scores, failure states).
- Missed habit occurrences remain visible and neutral in history.
- Data survives app updates (schema versioning + no destructive
  migrations).
- The app feels calm: restrained palette, generous whitespace, no
  notification spam.

## 8. Confirmed Decisions

1. **User:** overwhelmed planner user; first win is one coherent daily
   view.
2. **Platform:** mobile-first native via **React Native / Expo**
   (developer preference).
3. **Today interaction model:** timeline + task pool with user-driven
   time-blocking; habits as a compact strip.
4. **MVP scope:** tasks + Today + habits only (see §5).
5. **Data:** local-only, no accounts, no sync; schema versioning and a
   future export/sync path designed in from day one.
6. **Visual direction:** soft editorial / journal-like; light theme
   first; serif headings; muted natural palette; no gamification chrome.
7. **Interaction:** standard native patterns — bottom tabs (Today,
   Habits), FAB quick-add, bottom sheets, swipe-to-complete/reschedule.
8. **Deployment:** personal / beta first (TestFlight); keep store
   submission costs cheap (privacy labels, permissions discipline).

## 9. Assumptions

- Habit strip on Today shows today's status for all active habits,
  scrollable if long.
- Time-blocked tasks render on the timeline in chronological order;
  tasks without a time never appear on the timeline, only in the pool.
- "Needs rescheduling" is a derived state (computed from dates), not a
  stored flag — no data corruption risk if the clock/timezone changes.
- English-only MVP; no localization infrastructure yet.
- No authentication of any kind in MVP; device lock/OS-level protection
  is the privacy boundary.

## 10. Unresolved Questions

1. **Habit target model:** per-week frequency ("3×/week"), specific
   weekdays ("Mon/Wed/Fri"), or both? Recommendation: start with
   per-week frequency only.
2. **Overdue rollover policy:** should past-scheduled tasks stay in the
   pool indefinitely until acted on, or expire after N days? (Recommend:
   stay, visually de-emphasized with age.)
3. **Reminder strategy for v1.1:** local notifications for scheduled
   tasks and habit check-ins — timing, opt-in UX.
4. **Export format:** plain JSON dump vs. human-readable CSV/Markdown —
   matters when backup ships.
5. **Timeline bounds:** fixed day window (e.g., 6:00–23:00) vs.
   scrollable 24h; all-day / no-time display treatment.
6. **Task duration default:** when scheduling a task with a start time
   but no duration, what renders on the timeline? (Recommend: 30 min
   default, editable.)

## 11. Next Stages (approved order)

1. Product discovery (this document).
2. Requirements deep-dive: habit target semantics, task lifecycle edge
   cases, acceptance criteria per feature.
3. Architecture: Expo project structure, SQLite schema, navigation,
   design system tokens.
4. Implementation planning: milestones, task breakdown.
5. Development.
