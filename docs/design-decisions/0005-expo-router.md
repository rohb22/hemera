# ADR-0005: Expo Router for navigation

**Status:** Accepted (stage 3, user-approved).
**Context:** Options: Expo Router (file-based, official default, typed
routes, deep links free) vs React Navigation composed in code (more
explicit, more boilerplate).
**Decision:** Expo Router: `(tabs)/` group for Today/Habits with a
custom FAB overlay; `settings` as a pushed route; sheets as route
modals (`sheet/*`) with formSheet/modal presentation.
**Consequences:** Follows Expo defaults (templates, docs, community).
Deep-link support arrives free for the v1.1 reminders feature. Sheet
routes receive params (e.g., `task?_id=…`) instead of prop drilling.
