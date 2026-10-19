# ADR-0002: Bundled Fraunces for headings, system sans for body

**Status:** Accepted (stage 3, user-approved).
**Context:** Editorial identity depends on the serif display face.
Options: all-system fonts (zero assets, generic on Android); bundled
serif + system sans (full control of headings, native body text);
fully bundled (max control, two font files, more load-edge cases).
**Decision:** Bundle **Fraunces** (via `@expo-google-fonts/fraunces`,
`expo-font` preloading behind the splash screen) for `display`/`title`/
`section` tokens; use platform system sans for body/caption/button —
best Dynamic Type behavior with zero body-font risk.
**Consequences:** Splash covers font load; one asset family. If Fraunces
renders poorly at small optical sizes on device, fallback plan is New
York/Noto Serif via platform select (no other changes — tokens isolate
the swap).
