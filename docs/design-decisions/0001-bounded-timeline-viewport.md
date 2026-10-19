# ADR-0001: Bounded timeline viewport on Today

**Status:** Superseded by ADR-0009 (stage 4, D8). Kept for history.
**Context:** FR-D1 orders Today as header → timeline → pool (the habit
strip was later dropped — D7), but a full 24 h timeline (~2.5 screens at
48 px/hour) would push
the task pool — the morning-planning priority — permanently below the
fold. Alternatives: one continuous scroll (pool always a long scroll
away); segmented Timeline/Tasks toggle (breaks the "one coherent view"
promise).
**Decision:** The timeline renders inside a fixed-height viewport
(~1/3 of screen, internally scrollable, full 24 h preserved); the page
scroll continues into the pool below.
**Consequences:** Pool is one flick away at all times. Requires nested
vertical scrolling (`nestedScrollEnabled` on Android) — verify gesture
feel on real devices in stage 4. Auto-scroll-to-now targets the inner
viewport (A1).
