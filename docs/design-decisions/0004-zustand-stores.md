# ADR-0004: Zustand stores over repositories

**Status:** Accepted (stage 3, user-approved).
**Context:** Data flow options: plain hooks + refetch (zero deps, easy
to ship stale screens); TanStack Query (cache layer, retry semantics —
useful for remote data, overkill for local reads); Zustand (small
stores, explicit invalidation, testable without rendering).
**Decision:** One Zustand store per domain (`tasks`, `habits`, `ui`).
Store actions call repositories, await durable writes, then update
slices (commit-then-render — never flip UI state before the write
confirms). Derived labels are selectors, not stored fields.
**Consequences:** Single obvious data path; store tests are plain Jest.
Manual invalidation discipline required (mitigated: every mutation
action updates its slice in the same function — no cross-screen cache
layer to forget).
