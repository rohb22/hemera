# ADR-0006: Local wall-clock storage for schedules and deadlines

**Status:** Accepted (stage 3).
**Context:** R3 requires day boundaries in device-local time at read
time; alternatives are epoch-instant storage (freezes the timezone at
write time — contradicts R3 and breaks travel handling) or storing an
explicit IANA zone per row (overkill; zone data churn).
**Decision:** Store user-facing schedule/deadline parts as local
wall-clock strings (`YYYY-MM-DD`, `HH:MM`) + duration; store only
audit instants (`created_at`, `completed_at`) as epoch UTC. All
"is past / due today / week window" comparisons reconstruct local
`Date`s via date-fns; `now` is injected into domain functions.
**Consequences:** DST and timezone changes re-derive labels correctly
with no migration (§5 edge cases are unit-testable with fixed clocks).
Accepted quirk: a task scheduled before travel re-derives relative to
the *current* zone — that is the intended semantic.
