# AGENTS.md

## Project status

Hemera has **approved product requirements, an approved architecture,
and an approved implementation plan**. **Stage 5 (development) is
approved and in progress** — M0 (walking skeleton) is complete; M1
(Today: timeline + scheduling) is next. Build to the approved docs; do
not silently change behavior.

Approved stage order (each requires user approval before starting):

1. ✅ Product discovery → `docs/product-brief.md`
2. ✅ Requirements → `docs/product-requirements.md` (source of truth
   for behavior: domain rules, FR IDs, acceptance criteria)
3. ✅ Architecture → `docs/ux-design.md`, `docs/design-system.md`,
   `docs/architecture.md`, `docs/design-decisions/ADR-0001…0011`
   (Expo structure, SQLite schema, navigation, design tokens; revisions
   D6–D11 applied — habits are name + state dot only, no habit UI on
   Today and no horizontal scrolling, compact timeline rail superseding
   ADR-0001, deadline = date + optional time, habit rows use Mon–Sun
   day cells with today tap-to-toggle, habits scheduled by weekday rather
   than a weekly count).
   `prototype/index.html` is a throwaway mock, not a deliverable.
4. ✅ Implementation planning → `docs/implementation-plan.md`
   (vertical slices M0–M4, definition of done, §5 open decisions).
5. ▶️ Development — **in progress (M1)**. M0 complete (walking
   skeleton, device-verified). Milestones and DoD per
   `docs/implementation-plan.md`.

## Confirmed constraints (from product brief §8)

- **Stack:** React Native / Expo, TypeScript, local-only SQLite. No
  accounts, no sync, no servers in MVP.
- **MVP scope:** tasks + Today view + habits ONLY. Explicitly excluded:
  events, routines, goals, quick-capture inbox, Reset My Day, History
  UI, reminders, dark mode, localization. Do not add these without
  approval.
- **Domain rules:** task deadline ≠ scheduled time (separate fields);
  each habit occurrence has independent state; missed ≠ deleted; NO
  streaks, scores, or guilt mechanics anywhere.
- **Design:** soft editorial / journal-like, light theme, serif
  headings, standard native patterns (bottom tabs, FAB, bottom sheets).
  **No horizontally scrolling elements anywhere.** Today = compact
  timeline rail + task pool; habits are a vertical list on the Habits tab
  only, as name + Mon–Sun day cells, scheduled by weekday (D7, D8, D10,
  D11).

## Working agreement

- Read `docs/product-requirements.md` before any behavioral or schema
  decision (FR IDs, rules T/H/R, decisions D1–D11, assumptions A1–A14);
  `docs/product-brief.md` is the source of truth for vision and scope.
- Interview-driven workflow: one high-impact question at a time;
  distinguish confirmed / assumed / open; ask for approval before
  creating deliverables.
- Open questions (reminder strategy, export format, archive threshold
  revisit) are listed in requirements §11 / brief §10 — resolve at the
  appropriate stage, don't silently decide.

## Repository layout

- `README.md` — vision and principles
- `docs/product-brief.md` — approved product brief (stage 1)
- `docs/product-requirements.md` — approved requirements (stage 2)
- `docs/implementation-plan.md` — approved implementation plan (stage 4;
  milestones M0–M4, open decisions)
- `assets/images/` — brand assets (`icon.png`, `splash-icon.png`,
  `hemera-logo.png`); referenced from `app.json`
- `app/` — Expo Router routes (`app/_layout.tsx`, `app/(tabs)/`,
  `app/settings.tsx`, `app/sheet/*`)
- `src/` — components, stores, repositories, `domain/` (pure), `db/`,
  `theme/`, `lib/`, `services.ts`, `bootstrap.ts`
- `tests/` — Jest: domain + repository tests (Node env, `node:sqlite`)
- `prototype/index.html` — throwaway design mock (not a deliverable)

## Tooling & commands (M0)

Requires **pnpm** (v12+). `node_modules` is hoisted (`node-linker=hoisted`
in `.npmrc`); build scripts for `@parcel/watcher` / `unrs-resolver` are
allow-listed in `pnpm-workspace.yaml`.

- `pnpm install` — install dependencies
- `pnpm start` — start Metro / Expo dev server
- `pnpm android` / `pnpm ios` — run a platform
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — `expo lint` (ESLint 9 + `eslint-config-expo`)
- `pnpm test` — Jest (`jest-expo` preset; `tests/**`)

**How to test without Android Studio:** this project is pinned to
**Expo SDK 57** (`expo@~57.0.30`), because that is the SDK the Play
Store **Expo Go** build currently ships. Do not bump to SDK 58 until
the Play Store build matches — Expo Go rejects mismatched projects. The
matching Expo Go app from the Play Store / App Store runs this project
directly. `pnpm start`, then scan the QR with the phone (same Wi‑Fi)
and run the milestone demo script from `docs/implementation-plan.md`.
When Play Store Expo Go moves to SDK 58, the upgrade is
`pnpm add expo@~58 && pnpm expo install --fix` (plus aligning
`jest-expo` / `eslint-config-expo`) — then re-run the gates.

**`pnpm web` is not a supported test target.** expo-sqlite's web build
runs SQLite in a web worker that Metro does not serve, so boot hangs
until the 15 s timeout and the app shows its boot-error screen. Local
SQLite + phone-only scope (brief §8) means device/emulator is the only
real target.

DoD gates for every milestone: `pnpm typecheck` + `pnpm lint` +
`pnpm test` all clean.
