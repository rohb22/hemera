# ADR-0003: expo-sqlite with hand-written SQL repositories

**Status:** Accepted (stage 3, user-approved). Test runner refined in M0:
repository tests run the same SQL against Node's built-in `node:sqlite`
(no native build) instead of better-sqlite3.
**Context:** ~5 tables, 2 screens. Options: Drizzle ORM (typed schema,
codegen migrations — extra source of truth and toolchain for marginal
gain at this size); WatermelonDB (observable framework, heavy for MVP);
plain repositories (transparent SQL, zero deps).
**Decision:** `expo-sqlite` + repository modules with prepared
statements and typed row mappers. Repositories depend on a narrow
`SqlExecutor` interface so tests run the same SQL against
better-sqlite3 in-memory. Migrations are bundled numbered SQL files
applied by a small runner (forward-only, transactional, recorded in
`schema_migrations`).
**Consequences:** SQL stays legible and reviewable; type safety comes
from mappers + domain types (schema drift caught by repo tests). No
codegen step. If the schema grows past ~15 tables, revisit Drizzle.
