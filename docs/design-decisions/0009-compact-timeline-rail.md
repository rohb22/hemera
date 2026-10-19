# ADR-0009: Compact timeline rail (supersedes ADR-0001)

**Status:** Accepted (stage 4, user-approved — D8).
**Context:** ADR-0001 gave Today a bounded, internally scrollable 24 h
grid at 48 px/hour. In practice a per-hour grid dominated the screen and
read as spreadsheet-like, not calm; the bounded inner scroll also
competed with the page scroll. The day's meaning comes from *when the
tasks are*, not from empty hours.
**Decision:** The Today timeline is a **compact vertical rail**: a single
hairline spine with one node per scheduled task, in chronological order,
each labelled with its own start time (e.g. "13:00") and a block whose
weight hints at duration. Empty stretches collapse to spacing — no
per-hour rows, no fixed hourly scale. **Overlaps render as side-by-side
equal lanes** (resolved M1, plan §5 #8): overlapping tasks split the
block width into equal columns — the rail stays compact and there is
still no conflict UI (A7). A soft now-marker sits between nodes on today.
**Consequences:** The whole page can be one scroll again (no nested
scroller) — simpler and more consistent with the journal feel. Losing
proportional time height means gaps aren't visually to scale (accepted,
D8). Duration is conveyed qualitatively plus the explicit time label.
ADR-0001's nested-scroll risk is retired. Auto-scroll-to-now targets the
first upcoming node (A1, revised).
