# Maintainability Notes

ScrollHandsFree currently favors a no-build Chrome extension structure. That keeps local loading simple, but it leaves `content.js` and `background.js` larger than ideal.

## Current state

- `content.js` owns scrolling, scroll-area detection, Reading Focus, HUD, voice commands, and basic accessibility hints.
- `background.js` owns storage, command routing, tab state, context menus, injection, diagnostics, and keyboard shortcuts.
- `popup.js` and `options.js` are smaller but still contain both UI wiring and state mapping.

## Recommended split

When introducing a build step or deliberate multi-file injection, split by responsibility:

- `scroll-engine`: requestAnimationFrame loop, speed, direction, boundaries, pause/resume.
- `scroll-targets`: document/nested container detection, choose-scroll-area mode, selectors.
- `reading-focus`: focus band DOM and settings.
- `hud`: on-page controller, progress display, drag positioning.
- `voice`: Web Speech setup, language selection, command matching, aliases, debouncing.
- `accessibility-hints`: simple local checks and result formatting.
- `diagnostics`: content script health, page scrollability, voice support, current state.
- `storage-state`: per-tab state, per-site settings, resume positions, local counters.

## Refactor cautions

- Do not add remote code or CDN dependencies.
- Do not broaden permissions to support the refactor.
- Keep content-script injection user-triggered.
- Preserve popup behavior on restricted pages.
- Keep voice transcript text out of logs and stored state.
- Keep accessibility copy clear: basic hints only, no WCAG compliance claim.

## Performance cautions

- Avoid DOM-wide queries inside every animation frame.
- Throttle HUD/progress updates.
- Throttle heading and content-break checks.
- Test nested scroll panes, infinite-scroll pages, and heavy animation pages.
- Prefer passive scroll listeners.
- Keep the HUD small and avoid layout-shifting page content.
