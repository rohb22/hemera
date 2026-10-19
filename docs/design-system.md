# Hemera — Design System

**Status:** Draft for review (stage 3). Light theme only (MVP).
All values are implementation-ready tokens; the theme module exports
them as a typed object (see `architecture.md` §8).

## 1. Foundations

### 1.1 Color tokens (light)

Warm paper palette — natural, low-contrast chrome, one accent.

| Token | Value | Use |
| --- | --- | --- |
| `color.paper` | `#FAF7F2` | App background |
| `color.surface` | `#FFFFFF` | Cards, sheets, timeline blocks |
| `color.surfaceMuted` | `#F2EDE5` | Skeletons, disabled fills, *Later* rows |
| `color.ink` | `#2A2622` | Primary text (≈13:1 on paper) |
| `color.inkMuted` | `#6E655B` | Captions, metadata (≈5.3:1 on paper) — AA |
| `color.inkFaint` | `#9A9187` | Timeline node times, placeholders (non-essential only) |
| `color.hairline` | `#E5DED3` | Dividers, timeline rail, borders |
| `color.accent` | `#5B6B54` | Primary actions, done-state, focus rings (sage) |
| `color.accentSoft` | `#E8EDE4` | Done-state fills, selected chips |
| `color.attention` | `#8A6D3B` | Due-today / overdue markers (amber, never red) |
| `color.attentionSoft` | `#F3EBDC` | Due-today row wash |
| `color.danger` | `#8C3A2E` | Destructive confirmations ONLY |
| `color.overlay` | `rgba(42,38,34,0.32)` | Sheet scrim |

Rules: no pure black, no pure white-on-color text except `surface` on
`accent` (contrast ≈ 5.4:1). Missed habit occurrences use `inkFaint`
dots — never `danger`. `danger` appears only in delete/archive confirm
dialogs and their buttons. Habits carry no colour of their own in MVP:
state is always the dot/check, so nothing about a habit implies success.
(No per-habit tint palette or monogram — D6 stage-3 revision.)

### 1.2 Typography

Headings: **Fraunces** (bundled, ADR-0002) — soft optical serif.
Body/UI: **system sans** (SF Pro / Roboto) — best Dynamic Type behavior.

| Token | Font | Size / line-height | Use |
| --- | --- | --- | --- |
| `type.display` | Fraunces 500 | 30 / 36 | Today's date in header |
| `type.title` | Fraunces 500 | 22 / 28 | Screen titles |
| `type.section` | Fraunces 500 | 17 / 22 | Pool/section headers |
| `type.body` | Sans 400 | 16 / 22 | Task titles, form values |
| `type.caption` | Sans 400 | 13 / 18 | Metadata ("was scheduled…") |
| `type.overline` | Sans 600 | 11 / 14, letter-spacing 0.6, uppercase | Section overlines, legends |
| `type.button` | Sans 600 | 16 / 20 | Buttons |

All sizes scale with Dynamic Type; Fraunces uses `allowFontScaling`
with sensible max (1.6×) and reflows (no ellipsized headings).

### 1.3 Spacing, radii, elevation

- **Spacing scale** (4-pt base): 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40.
  Screen gutter = 20. Section gap = 24. Row internal gap = 12.
- **Radii:** sm 8 (inputs, small chips) · md 12 (cards, timeline
  blocks) · lg 16 (sheet tops) · pill 999 (chips, buttons).
- **Elevation:** sheets only — shadow `0 -4 24 rgba(42,38,34,0.08)`;
  cards use hairline borders instead of shadows (editorial flatness).

### 1.4 Motion

- Durations: fast 150 ms (press), standard 250 ms (sheet, row exit).
- Easing: standard ease-out; no bounce, no spring overshoot.
- Reduced motion: all transitions become instant (NFR-A).
- The only "celebration" in the product is the quiet *target met* chip
  fading in — nothing animates on completion beyond row exit.

## 2. Components

### 2.1 Buttons
- **Primary:** `accent` fill, `surface` text, pill, 48 pt tall.
- **Secondary:** transparent, hairline border, `ink` text.
- **Ghost:** text-only `accent`.
- **Destructive:** `danger` text on transparent; fills `danger` only in
  the final confirm step.
- Disabled: `surfaceMuted` fill, `inkFaint` text.

### 2.2 Chips
- **Meta chip** (forms): pill presets — durations 15/30/60/90.
- **Day toggle** (habit form): Mon–Sun pill toggles; selected = `accent`
  fill (`surface` text), unselected = `surface` + hairline (`inkMuted`).
- **Status chip:** "Today" pill (header), "target met" chip
  (`accentSoft` bg, `accent` text).

### 2.2a Habit row (Habits tab)
Full-width vertical row (no horizontal scrollers anywhere, D7, D10):
name (`type.body`) · **Mon–Sun day-cell row** (spec §2.4; today's cell is
the 1-tap completion control) · quiet progress caption
(`type.caption` `inkMuted`, e.g. "2 of 3 this week"; "target met" when
reached). Planned days are emphasised; unplanned days are shown faint but
remain tappable today (D11). Tapping the row body opens the habit detail
sheet (skip lives there).

### 2.3 Task row
Check control (44 pt, empty ring → `accent` filled + check on complete)
· title `type.body` · caption `type.caption` `inkMuted` · hairline
separator inset from check control. Due-today rows get a 3 pt
`attention` left bar + caption in `attention`. *Later* rows render at
0.6 opacity with `surfaceMuted` background.

### 2.4 Habit day cells (visual legend)
Each of the seven cells (Mon–Sun) shows its weekday letter above a
state shape:

| State | Shape | Color |
| --- | --- | --- |
| done | filled circle 12 pt | `accent` |
| skipped | hollow ring 12 pt, 1.5 pt stroke | `inkMuted` |
| missed (planned) | small circle 8 pt | `inkFaint` |
| today, not yet | hollow ring 12 pt, 1.5 pt stroke | `inkMuted` |
| planned, no record (past) | small circle 8 pt | `inkFaint` |
| unplanned / future-inactive | hollow ring 12 pt, hairline stroke | `hairline` |
| unplanned (tappable today) | hollow ring 12 pt, hairline stroke, weekday letter `inkFaint` | `hairline` |

Cell tap target ≥44 pt. Shape + size + colour + weekday-label
quadruple-encode every state (FR-H3 AC, ux-design §8).

### 2.5 Timeline — compact rail (D8)
Rail = 2 pt vertical hairline down the left; node = 8 pt dot on the rail
per task; time label = `type.caption` `inkMuted`, right-aligned left of
the rail; task block = `surface`, md radius, hairline border, title
`type.body`; duration hinted by step-wise min-height (not proportional
hour spacing). Now marker = 1 pt `accent` line crossing the rail with a
6 pt dot cap, only on today. Deadline marker = `attentionSoft` wash +
`attention` left bar (FR-T6). Overlap lanes split the block width
equally with a 4 pt gutter (ux-design §10.1).

### 2.6 Sheets, dialogs, toast
- Sheets: `surface`, top radius lg, grab handle (hairline pill), title
  `type.section`, keyboard-avoiding, swipe-to-dismiss + explicit close.
- Confirm dialogs: centered card, title + one-line consequence copy,
  destructive button on the right.
- Undo toast: pill, `ink` bg, `surface` text, single *Undo* action;
  one at a time; 5 s; sits above the tab bar (A5).

### 2.7 Form fields
Label = `type.overline`; input = surfaceMuted fill, sm radius, 48 pt
min; inline validation text in `attention` (never `danger` for
non-destructive validation); focus ring 2 pt `accent`.

### 2.8 Empty states
Typographic panels (Fraunces line + sans subline + one CTA). No
illustrations required for MVP; slot reserved for later art.

## 3. Iconography
Outline style, 1.75 pt stroke, `ink`/`inkMuted`. Source: a single
consistent set (`@expo/vector-icons` Feather/Lucide equivalents). Icons
never carry state alone (paired with color/shape/label).

## 4. Do / Don't

- DO encode state with shape + label, not color alone.
- DON'T use red anywhere except destructive confirmations.
- DON'T add counts, percentages, streaks, or scores (H4, principles).
- DO keep one accent; if a screen needs a second emphasis, it's
  probably two screens.
- DO hide native scroll indicators app-wide (`showsVerticalScrollIndicator
  = false`): on curved-edge phones the platform scrollbar hugs the glass
  and is hard to reach; rely on content/overscroll cues instead.
- DON'T use shadows on cards; borders and whitespace only.
- DO leave at least one "quiet zone" (16 pt empty) around section
  headers.
