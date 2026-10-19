# ADR-0010: Habits are scheduled by weekday, not a weekly count

**Status:** Accepted (stage 4, user-directed; recorded as D11).
**Context:** D1 modelled habits as a per-week frequency target (an
integer 1–7, "3× per week"). While reviewing the habit form, the user
asked to drop the "×/week" stepper and instead pick the actual days
(M T W T F S S), since many habits happen on specific days
("Mon/Wed/Fri"), and a weekday set reads more naturally than a count.
Candidates: keep the 1–7 count (rejected — implies a quantity the user
doesn't think in), a weekday set that also locks completion to planned
days (rejected — too rigid; the user chose "default days, still
completable any day"), and a weekday set plus a separate count (rejected
— two overlapping concepts to explain).
**Decision:** A habit stores a set of **planned weekdays** (Mon–Sun, at
least one, default every day), stored as a Mon-first bitmask
`habits.days_mask` (bit 0 = Monday … bit 6 = Sunday; CHECK 1–127). The
create/edit sheet shows Mon–Sun day toggles instead of a 1–7 stepper. The
planned days are a **default/emphasis, not a gate**: any day can still be
completed, and off-day completions count. Only planned weekdays that
passed without a `done`/`skipped` state derive as `missed`; past
unplanned days stay neutral. Week progress = done-count vs the number of
planned days in the evaluation window (A3 week-start). This supersedes
D1's count target and revises D10's progress wording.
**Consequences:** `target_count` is removed from the schema and the form;
every "3× per week"-style string, the "target met" wording, `H2/H3/H5`,
`FR-H1/H3/H5`, A9/A10, and the habits/design-system/habit-detail copy
change to day-based language. The Mon–Sun day cells already exist (D10),
so the UI change is mostly the form's stepper → toggles. Missed
derivation and `weeklyProgress` now depend on `days_mask` (new pure
helper `plannedOn`). Changing planned days re-derives display only and
never rewrites occurrence history (H5). Requirements: D1 revised, D11
added, A9/A10/H2/H3/H5/FR-H1/H3/H5 amended.
