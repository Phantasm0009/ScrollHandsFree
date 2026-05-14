# ScrollHandsFree

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-blue.svg)](manifest.json)

ScrollHandsFree is a Chrome extension for hands-free reading on long webpages. It provides user-triggered auto-scroll, pause/resume, reading speed presets, optional voice commands, Reading Focus, an on-page HUD, and local privacy-conscious settings.

The core promise is simple: open a long article, recipe, documentation page, study page, or presentation script and control scrolling without constantly touching the mouse or trackpad.

## Current status

This repository is a vanilla JavaScript Manifest V3 extension. There is no build step, no bundled package manager, no server component, and no analytics pipeline.

The current version focuses on:

- reliable user-triggered scrolling,
- calmer popup controls,
- per-tab state,
- optional on-page controls,
- clearer privacy and microphone messaging,
- local settings and per-site preferences.

## Features

### Core scrolling

- Start, pause, resume, and stop auto-scroll.
- Pause keeps the current session ready; Stop ends the session.
- Smooth time-based scrolling with pixels-per-second behavior.
- Direction controls for scrolling down or up.
- Speed presets: Slow, Reading, Fast, and Skim.
- Fine-tune speed slider.
- End-of-page behavior: stop, loop to top, or reverse direction.
- Per-tab state so the popup reflects the active tab instead of a global stale state.
- Reached-end and reached-top status updates.

### Reading presets

Reading modes adjust speed and behavior together:

- Article
- Recipe
- Documentation
- Study
- Fast skim
- Presentation / teleprompter
- Custom

These presets are convenience defaults, not a separate AI reading system.

### Page and scroll-area handling

- Detects the page scroll target or a likely nested scrollable area.
- Includes a "Choose scroll area" mode for pages with multiple scroll panes.
- Saves selected scroll area information locally per site when available.
- Works best on normal webpages, articles, documentation sites, recipes, and web apps with clear scroll containers.
- Does not run on restricted browser pages such as `chrome://` pages or the Chrome Web Store.

### On-page HUD

The optional HUD gives page-level controls without reopening the popup:

- pause/resume,
- stop,
- slower/faster,
- direction,
- progress percentage,
- estimated time remaining,
- current heading when detectable,
- hide control,
- draggable position saved locally per site.

The HUD is optional and can be turned off from the popup or options page.

### Reading Focus

Reading Focus adds a soft horizontal reading band and dims the rest of the page.

- Toggle from the popup, voice command, or context menu.
- Adjustable band height.
- Adjustable dim opacity.
- Works alongside auto-scroll.
- Intended to reduce visual distraction, not to modify or simplify page content.

### Smart pausing

Optional pausing behavior includes:

- pause at headings,
- pause briefly after manual user scrolling,
- natural-break behavior based on the selected reading rhythm.

This is heuristic behavior. It works best on pages with semantic headings and normal document structure.

### Voice commands

Voice commands are optional. Auto-scroll works without microphone permission.

Supported command categories include:

- start,
- pause/resume,
- stop,
- faster,
- slower,
- up,
- down,
- top,
- bottom,
- focus on/off,
- bigger/smaller focus,
- speed/status style commands.

Voice reliability depends on the browser Web Speech API, microphone permission, selected language, accent, network/platform behavior, and whether the active page allows the content script to run. The extension includes multilingual command dictionaries and a language setting, but this should not be described as guaranteed support for every listed language unless those languages have been tested.

### Voice customization

Options include:

- voice language selection,
- custom aliases for common commands,
- disabled commands,
- a no-microphone command test field,
- visible feedback for listening, recognized commands, unrecognized commands, and microphone/unsupported states.

### Keyboard shortcuts

Chrome allows only four default suggested shortcuts in the manifest, so the extension ships with:

- Start / Pause: `Ctrl+Shift+S`
- Stop: `Ctrl+Shift+X`
- Faster: `Ctrl+Shift+F`
- Slower: `Ctrl+Shift+L`

Toggle Voice is registered without a default shortcut. Assign it manually from Chrome's extension shortcut settings if you want it.

### Popup tools

The popup includes:

- status pill for the active tab,
- current progress and time remaining,
- start/pause/resume control,
- stop control,
- speed presets and slider,
- reading mode selector,
- direction buttons,
- end behavior selector,
- voice setup and command list,
- Reading Focus toggle,
- HUD toggle,
- page tools for scroll area, top/bottom, next heading, and back one paragraph,
- basic accessibility hints,
- privacy summary,
- help and issue links.

### Basic accessibility hints

ScrollHandsFree can show simple page hints for common issues such as:

- images missing alt text,
- heading structure,
- unlabeled form controls,
- missing page language,
- broken ARIA references,
- basic keyboard focus concerns.

This is not a full WCAG audit and should not be marketed as compliance checking.

### Local settings and per-site preferences

Stored locally in Chrome storage:

- default speed,
- current speed,
- reading mode,
- end behavior,
- focus band settings,
- HUD setting and HUD position,
- selected scroll container information,
- per-site speed/blocking preferences,
- resume positions,
- voice aliases and disabled commands,
- local usage counters.

Local usage counters are used only inside the extension UI and are not sent anywhere.

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select this folder.
6. Pin ScrollHandsFree from the extensions menu if you want quick access.

If Chrome reports a manifest error, reload from the folder containing `manifest.json`.

## How to use

### Basic flow

1. Open a long webpage.
2. Click the ScrollHandsFree toolbar icon.
3. Choose a speed preset or reading mode.
4. Click Start scrolling.
5. Use Pause to temporarily pause, Resume to continue, or Stop to end the session.

### Try the sample page

Open `sample-reading.html` from this repository to test scrolling, Reading Focus, HUD behavior, and voice commands on a predictable page.

### Voice setup

1. Open the popup.
2. Turn on Voice Commands.
3. Read the microphone/privacy explanation.
4. Allow microphone access if you want voice commands.
5. Try short commands such as "start", "pause", "faster", "slower", or "stop".

If voice is unsupported or microphone permission is denied, auto-scroll still works.

### Scroll area selection

Use Choose scroll area when a page has multiple scrollable regions, such as:

- documentation pages with sidebars,
- app layouts with nested panes,
- recipe pages with sticky sections,
- modals or internal content panels.

Click the area you want ScrollHandsFree to control.

## Options page

The options page is organized into sections:

- General: default speed, direction, end behavior, HUD default, manual-scroll pause, heading pause.
- Voice: language, command aliases, disabled commands, command test, microphone/privacy note.
- Reading Focus: default focus setting, band height, dim opacity, reading rhythm.
- Sites: current-site block/speed/focus/HUD preferences.
- Accessibility: simple local page hints and clear non-WCAG wording.
- Privacy: local data explanation, clear controls, import/export.
- Advanced: keyboard shortcut information and diagnostics.
- What's New: short changelog summary.

## Permissions and privacy

### Manifest permissions

- `activeTab`: temporary access to the current tab after user action.
- `scripting`: inject `content.js` on demand.
- `storage`: save local settings and per-site preferences.
- `contextMenus`: provide right-click actions.

The extension does not currently request broad host permissions. Normal scrolling is user-triggered through active tab access.

### Data handling

ScrollHandsFree does not include:

- accounts,
- cloud sync,
- analytics,
- telemetry,
- ads,
- tracking pixels,
- server-side storage.

Settings and reading state are stored locally in the browser. Voice commands are handled through the browser's speech recognition API. ScrollHandsFree does not store audio, but browser speech recognition may be processed by the browser or platform provider.

See `privacy.html` for the in-extension privacy policy text.

See `MAINTAINABILITY.md` for the current module-splitting plan and performance cautions.

## Browser compatibility

Primary target:

- Google Chrome with Manifest V3 support.

Expected compatibility:

- Chromium-based browsers such as Edge, Brave, and Opera may work, but voice recognition and shortcut behavior can vary.

Not guaranteed:

- Firefox.
- Safari.
- Restricted browser pages.
- Chrome Web Store pages.
- Pages that block extension injection or do not expose a usable scroll area.

## Development

### Project structure

```text
ScrollHandsFree-main/
|-- manifest.json          # MV3 manifest
|-- background.js          # service worker, commands, state, injection, storage
|-- content.js             # scroll engine, HUD, focus band, voice, page hints
|-- popup.html             # popup UI
|-- popup.js               # popup logic and active-tab controls
|-- options.html           # settings UI
|-- options.js             # settings logic
|-- welcome.html           # first-run page
|-- changelog.html         # update page
|-- privacy.html           # privacy policy page
|-- sample-reading.html    # manual test page
|-- CHANGELOG.md           # release notes
|-- RECENT_UPDATES.md      # short update summary
|-- STORE_LISTING.md       # store listing draft
|-- MULTILINGUAL_VOICE_COMMANDS.md
|-- MAINTAINABILITY.md     # module split and performance notes
|-- icons/
`-- README.md
```

### Build

No build process is required.

### Maintainability note

The current extension still uses large `background.js` and `content.js` files. That keeps the unpacked extension simple, but it is not the ideal long-term architecture. The next maintainability pass should split the code by responsibility:

- scrolling engine,
- scroll-area detection,
- voice commands,
- HUD,
- Reading Focus,
- accessibility hints,
- diagnostics and storage.

Because MV3 content scripts loaded through `chrome.scripting.executeScript` are not as straightforward as normal app modules, the safest path is to introduce a small build step or a deliberate multi-file injection plan before splitting `content.js`.

### Performance notes

The scroll engine uses `requestAnimationFrame` and time-based pixels-per-second movement. HUD/progress updates are throttled, and heading/content-break pause checks are throttled so they do not query the page on every animation frame.

Still, complex sites can behave differently. Test heavy pages, infinite-scroll feeds, documentation apps with nested panes, and pages with animations before shipping a new release.

### Quick validation

```bash
node --check background.js content.js popup.js options.js
python3 -m json.tool manifest.json >/dev/null
```

### Manual testing checklist

Test on:

- a long article,
- documentation with a nested content pane,
- a recipe page,
- a short page,
- a page with headings,
- a page with form controls,
- a restricted page such as `chrome://extensions/`.

Verify:

- start, pause, resume, stop,
- speed presets and slider,
- end-of-page behavior,
- per-tab popup state,
- HUD appearance and drag behavior,
- Reading Focus toggle and sizing,
- scroll area selection,
- next heading and back paragraph,
- resume prompt,
- voice setup and failure states,
- options saving,
- diagnostics,
- basic accessibility hints.

## Known limitations

- Voice commands depend on browser speech recognition and may be inconsistent.
- Multilingual command dictionaries exist, but each advertised language should be tested before public marketing claims.
- Scroll-area detection is heuristic and may choose the wrong pane on complex web apps.
- Basic accessibility hints are not a substitute for a real accessibility audit.
- The extension cannot run on Chrome internal pages, Chrome Web Store pages, and some restricted documents.
- Time remaining is an estimate based on current scroll distance and speed.
- Resume position is stored locally and may be approximate if page layout changes.

## Bug reports

Use GitHub Issues and include:

- browser and version,
- extension version,
- page URL or page type,
- what you clicked or said,
- expected behavior,
- actual behavior,
- whether the HUD, voice, Reading Focus, or custom scroll area was active.

For debugging, use Options -> Advanced -> Copy Diagnostic Info.

## License

MIT. See `LICENSE`.
