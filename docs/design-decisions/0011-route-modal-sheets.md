# ADR-0011: Route-modal sheets (native) instead of a bottom-sheet library

**Status:** Accepted (stage 5, M0).
**Context:** Plan §5.1 carried `@gorhom/bottom-sheet` as the sheet
mechanism. That adds a JS-driven sheet stack (reanimated + gesture-handler
peer constraints) and must track RN 0.88 / reanimated 4. Expo Router
already presents routes as native sheets via `presentation: 'modal'`
or `'formSheet'`, which the architecture assumed for `app/sheet/*`.
**Decision:** No third-party sheet library. Sheets are Expo Router route
modals (`app/sheet/*`) presented with the native `modal`/`formSheet`
presentation. Sheet state lives in route params, not component state.
**Consequences:** Fewer dependencies and peer-version risks; native,
platform-consistent sheet feel and gestures; accessibility and reduced
motion come from the OS. Two caveats: presentation is platform-dependent
(`formSheet` is iOS-idiomatic; Android uses `modal`), and deep custom
sheet detents (e.g. a half-height "quick add") are not free — if a future
slice needs multi-detent chrome, revisit with an ADR.
