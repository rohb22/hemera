# ADR-0008: Habits are represented by name + state dot (no avatar)

**Status:** Accepted (stage 3, user-approved).
**Context:** The brief left habit representation open (originally an emoji
field). Candidates considered in stage 3: an emoji field (rejected — reads
generic, undercuts the editorial identity), a serif monogram in a tinted
circle from a fixed palette (designed, then withdrawn — it adds a palette,
a schema column, a picker, and choices the MVP doesn't need), and a curated
icon set (rejected — a whole icon library to design/bundle).
**Decision:** A habit is represented by its **name plus a state dot/check
only**. No emoji, no icon, no monogram, no per-habit colour. State is always
the dot/check, so nothing about a habit implies success. Schema: `habits`
stores `id`, `name`, `days_mask`, `created_at`, `archived_at` — no
representation column.
**Consequences:** Least UI, least schema, nothing to personalise, no icon
assets or bundled fonts for this purpose, unlimited name coverage. If a
later version wants per-habit identity, a nullable column can be added by
migration without touching existing rows. Requirements A10 is revised
(recorded as D6).
