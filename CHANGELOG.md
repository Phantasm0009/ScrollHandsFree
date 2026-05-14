# Changelog

## 1.3.0

- Removed always-on `<all_urls>` content script injection and switched to on-demand injection.
- Added context menu actions for starting, choosing scroll area, toggling Reading Focus, and stopping.
- Added a richer on-page HUD with progress, time remaining, direction, speed, pause, stop, and hide.
- Added draggable HUD positioning saved locally per site.
- Added adjustable Reading Focus height and dim opacity.
- Added next-heading and back-one-paragraph page navigation controls.
- Added per-site settings, local resume positions, command aliases, disabled voice commands, diagnostics, import/export, and clear-local-data controls.
- Added first-run welcome, sample reading page, privacy policy, changelog page, and store listing refresh notes.
- Added voice command debouncing and clearer unsupported/microphone-denied states.

## 1.2.0

- Redesigned the popup as a compact reading remote with clearer per-tab status.
- Added first-run onboarding, voice setup disclosure, a privacy panel, and report issue links.
- Added voice language selection and clearer voice statuses for listening, recognized commands, unrecognized commands, and blocked microphone access.
- Added on-page HUD auto-hide behavior so page controls do not cover reading content.
- Fixed status rendering so object responses no longer appear as "[object Object]".
- Refreshed options with dedicated Scrolling, Voice, Keyboard, Advanced, Privacy, and What's New sections.

## 1.1.0

- Added separate pause/resume and stop session controls.
- Added speed presets: Slow, Reading, Fast, and Skim.
- Added reading mode presets: Article, Recipe, Documentation, and Presentation/teleprompter.
- Added an optional focus band for keeping the current reading area visible.
- Added an optional mini floating controller with pause, faster, slower, and hide controls.
- Added working auto-pause at headings for article and documentation-style reading.
- Added auto-pause after manual scrolling so auto-scroll does not fight the user.
- Added per-tab scroll state so the popup reflects the active tab.
- Added nested scrollable area detection for pages, docs, apps, and article layouts.
- Added end-of-page behavior settings: stop, loop, or reverse.
- Added keyboard shortcuts for start/pause, stop, faster, slower, and voice toggle.
