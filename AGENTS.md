# AGENTS.md

## Project status

Hemera has **approved product requirements** — there is no application
code yet. Do **not** scaffold frameworks, install dependencies, or
generate files until the user explicitly approves the implementation
stage.

Approved stage order (each requires user approval before starting):

1. ✅ Product discovery → `docs/product-brief.md`
2. ✅ Requirements → `docs/product-requirements.md` (source of truth
   for behavior: domain rules, FR IDs, acceptance criteria)
3. Architecture (Expo structure, SQLite schema, navigation, design tokens)
4. Implementation planning (milestones, task breakdown)
5. Development

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

## Working agreement

- Read `docs/product-requirements.md` before any behavioral or schema
  decision (FR IDs, rules T/H/R, decisions D1–D5, assumptions A1–A14);
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

No build, test, or lint tooling exists yet. Commands will be documented
here once the architecture stage lands.
