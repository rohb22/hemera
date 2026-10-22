# AGENTS.md

## Project status

Hemera has **approved product requirements, an approved architecture,
and an approved implementation plan**. **Stage 5 (development) is
complete** — M0 (walking skeleton), M1 (Today: timeline + scheduling),
M2 (Habits), M3 (past-day navigation + Settings), M3.5 (§5
tooling/dependency decisions) and M4 (polish, hardening, personal beta)
are closed; v0.1.0 is the first GitHub Release APK. Build to the
approved docs; do not silently change behavior.

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
   than a weekly count; D12: the adaptive FAB is the sole creation
   affordance and the pool never duplicates the viewed day's timeline).
   `prototype/index.html` is a throwaway mock, not a deliverable.
4. ✅ Implementation planning → `docs/implementation-plan.md`
   (vertical slices M0–M4, definition of done, §5 open decisions).
5. ✅ Development — **complete (M0–M4)**. M0 (walking skeleton), M1
   (Today: timeline + scheduling), M2 (Habits), M3 (past-day navigation
   + Settings), M3.5 (tooling decisions) and M4 (polish, hardening,
   personal beta) complete, all device-verified. v0.1.0 is the first
   GitHub Release APK. Milestones and DoD per
   `docs/implementation-plan.md`; post-MVP items are the open questions
   in requirements §11 / brief §10.
6. ▶️ Post-MVP — **v1.1 Reminders** approved; R1–R3 implemented on
   `docs/v1.1-reminders.md` (FR-R1–R6, D13–D19), R4 device verification
   pending. Reminders are **local OS-scheduled notifications only** —
   opt-in in Settings, denied permission is a silent fallback, no
   server/push/background fetch, `INTERNET` stays blocked.
7. ▶️ Post-MVP — **v1.2 Reset My Day** approved; X1–X3 implemented on
   `docs/v1.2-reset-my-day.md` (FR-X1–FR-X7, D21–D27), X4 device
   verification pending. The review opens from a quiet line on Today
   (D21), covers exactly the tasks carried over from earlier days
   inside D3's 7-day window (D22), and every row defaults to *Keep
   time* (D23). Choices are applied in one transaction with one Undo
   and a history record written in the same transaction (D26). No
   takeover, no badge, no guilt language.
8. ▶️ Post-MVP queue (remaining): export/backup (requirements §11.2),
   D3 7-day threshold revisit (§11.3), overlap rendering (§11.6);
   packaging plan (universal AAB → bundletool per-ABI APKs) recorded in
   §7 of the v1.1 doc.

## Confirmed constraints (from product brief §8)

- **Stack:** React Native / Expo, TypeScript, local-only SQLite. No
  accounts, no sync, no servers in MVP.
- **MVP scope:** tasks + Today view + habits ONLY. Explicitly excluded:
  events, routines, goals, quick-capture inbox, Reset My Day, History
  UI, reminders, dark mode, localization. Do not add these without
  approval. (**v1.1 exception:** reminders left this list when the user
  approved `docs/v1.1-reminders.md`. **v1.2 exception:** Reset My Day
  left this list when the user approved `docs/v1.2-reset-my-day.md`.
  Nothing else has.)
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
  decision (FR IDs, rules T/H/R, decisions D1–D27, assumptions A1–A21);
  `docs/product-brief.md` is the source of truth for vision and scope.
  Post-MVP features live in their own approved specs:
  `docs/v1.1-reminders.md` (D13–D20) and
  `docs/v1.2-reset-my-day.md` (D21–D27).
- Interview-driven workflow: one high-impact question at a time;
  distinguish confirmed / assumed / open; ask for approval before
  creating deliverables.
- Open questions (export format, archive threshold revisit, overlap
  rendering) are listed in requirements §11 / brief §10 — resolve at the
  appropriate stage, don't silently decide.

## Repository layout

- `README.md` — vision and principles
- `docs/product-brief.md` — approved product brief (stage 1)
- `docs/product-requirements.md` — approved requirements (stage 2)
- `docs/v1.1-reminders.md` — post-MVP v1.1 reminders spec (FR-R1–R6,
  D13–D20; packaging plan §7)
- `docs/implementation-plan.md` — approved implementation plan (stage 4;
  milestones M0–M4, open decisions)
- `docs/v1.2-reset-my-day.md` — post-MVP v1.2 Reset My Day spec
  (FR-X1–FR-X7, D21–D27; milestones X1–X4)
- `assets/images/` — brand assets (`icon.png`, `splash-icon.png`,
  `hemera-logo.png`); referenced from `app.json`
- `app/` — Expo Router routes (`app/_layout.tsx`, `app/(tabs)/`,
  `app/settings.tsx`, `app/archived-habits.tsx`, `app/reset.tsx`,
  `app/sheet/*`)
- `src/` — components, stores, repositories, `domain/` (pure), `db/`,
  `theme/`, `lib/`, `services.ts`, `bootstrap.ts`
  (v1.2 adds `domain/reset.ts`, `repositories/resets.ts`,
  `stores/resetStore.ts`, `components/ResetTaskRow.tsx`,
  `components/ResetHintLine.tsx`, `db/migrations/002_day_resets.ts`)
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

**After adding a route, regenerate the typed routes.** expo-router's
typed routes live in the gitignored `.expo/types/router.d.ts` and are
regenerated **only by the dev server** — `expo export` does not rewrite
them. A new `app/reset.tsx` therefore fails `pnpm typecheck` with
`Argument of type '"/reset"' is not assignable…` until you run
`npx expo start --no-dev --offline` for ~45 s and stop it. Do that
before trusting a typecheck failure on a new path.

**Jest + React 19:** `render()` and `rerender()` are async — always
`await` them. A `fireEvent.press` that changes state does **not** flush
the re-render before the next assertion; wrap it in
`await act(async () => { fireEvent.press(...) })` or the assertion reads
the pre-update tree. `Platform.OS` is `ios` under the `jest-expo`
preset, so mock `@react-native-community/datetimepicker` explicitly in
render tests that open a time picker.

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

**Notifications + Expo Go.** Expo Go ships local notifications but no
push modules, so `expo-notifications`' package **barrel** cannot be
imported under Expo Go — it throws `Cannot find native module
'ExpoTopicSubscriptionModule'` at module-evaluation time and takes every
route that imports it down with it (expo-router then reports those
routes as "missing the required default export").
`src/services/reminders.ts` therefore deep-imports the submodules it
needs and requires them lazily; see `docs/v1.1-reminders.md` §4.2.1.
**Never simplify those back into a barrel import.** The warning
"[expo-notifications] Push notifications … unavailable in Expo Go" is
expected; local notifications still work. For R4 device verification,
build the dev client (`npx eas-cli build -p android --profile preview`)
— that is the authoritative target, since the dev build carries the
full native module set.

**Exact alarms.** `app.json` declares
`android.permission.USE_EXACT_ALARM` so Android schedules reminders as
exact alarms (D20). Without it, `expo-notifications` falls back to
`AlarmManagerCompat.setAndAllowWhileIdle` and reminders arrive late —
sometimes much later on an idle device. `USE_EXACT_ALARM` is a *normal*
permission: granted at install, no OS dialog, no "Alarms & reminders"
screen. It is legitimate here only because Hemera is personal-use
software distributed as a GitHub Release APK and never published to
Google Play, which reserves the permission for reviewed alarm/calendar
apps. **Revisit it before any store release.** `INTERNET` stays in
`android.blockedPermissions`.

DoD gates for every milestone: `pnpm typecheck` + `pnpm lint` +
`pnpm test` all clean.

**Batch APK builds — do not build an APK per fix.** A preview build
costs ~10 minutes of EAS time and the user's device-install cycle, so it
is not the verification loop. Verify statically instead:

- **Unit / render tests** (`pnpm test`) for anything JS-level: payloads,
  navigation targets, component output.
- **`npx expo prebuild --platform android --no-install --clean`** for
  anything manifest/theme-level. The generated `android/` folder is
  gitignored; read `android/app/src/main/AndroidManifest.xml` and
  `android/app/src/main/res/values/styles.xml` to confirm permissions,
  `windowLightStatusBar`, and the merged manifest. Delete `android/`
  afterwards, and `git checkout -- package.json` (prebuild rewrites the
  `android`/`ios` scripts).
- **Library manifests** under `node_modules/<pkg>/android/src/main/` for
  what Gradle merges in at build time (e.g. the `expo-notifications`
  service, receiver and `NotificationForwarderActivity`).
- Build the APK **once**, before the next feature milestone.
