# ADR-0007: Hybrid habit-occurrence storage (explicit rows, derived states)

**Status:** Accepted (stage 3).
**Context:** Options: materialize a row per habit per day from creation
(needs a catch-up generator, unbounded row growth); store only
completion events and derive the rest.
**Decision:** Store rows in `habit_occurrences` only for **explicit**
user actions (`done`, `skipped`, or revert-to-`pending`); a missing row
derives as `pending` (today/future) or `missed` (past day after
creation) at read time, per H2. Un-completing updates the row to
`pending` — occurrence rows are never deleted (R2). `missed` is never
written.
**Consequences:** No background jobs, no generator bugs, no growth
problem; weekly evaluation = `COUNT(state='done')` in the window.
History semantics hold: the record of a missed day is the *absence* of
an explicit action, rendered as a neutral dot. If a future feature needs
stored `missed` (e.g., reflection prompts), migration 00N can
materialize derived history without changing the UI contract.
