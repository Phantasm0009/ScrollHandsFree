# Installation

ScrollHandsFree is a vanilla Chrome Manifest V3 extension. There is no build step.

## Load locally

1. Download or clone this repository.
2. Open Chrome.
3. Go to `chrome://extensions/`.
4. Enable Developer mode.
5. Click Load unpacked.
6. Select the folder that contains `manifest.json`.
7. Pin ScrollHandsFree from the Chrome extensions menu if you want quick access.

## Verify it loaded

After loading, open a normal webpage and click the ScrollHandsFree toolbar icon. The popup should show `Ready on this page`.

The extension will not run on Chrome internal pages, Chrome Web Store pages, or other restricted browser pages.

## Quick smoke test

1. Open `sample-reading.html` or `test.html`.
2. Click the extension icon.
3. Press Start scrolling.
4. Try Pause, Resume, Stop, speed presets, Reading Focus, and the on-page HUD.
5. Open Options and save a setting to confirm storage works.

## Troubleshooting

- If Chrome says the manifest could not load, make sure you selected the repository root folder.
- If keyboard shortcuts conflict with another extension, open Chrome's extension shortcut settings and assign different shortcuts.
- If voice commands do not work, check microphone permission and browser speech recognition support. Auto-scroll does not require microphone access.
- If a page has multiple scroll panes, use Choose scroll area from the popup or context menu.
