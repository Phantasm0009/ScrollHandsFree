# ScrollHands Free Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore)

A lightweight Chrome extension that turns long pages into a calm hands-free reading experience with auto-scroll, optional voice commands, Reading Focus, and local privacy-conscious settings.

## ✨ Features

- **🤲 Hands-Free Auto-Scrolling**: Automatically scroll pages or nested scroll areas at your preferred speed
- **Pause / Resume / Stop**: Pause keeps the current session ready; Stop ends it
- **Speed Presets**: Slow, Reading, Fast, and Skim presets with a fine-tune slider
- **Reading Modes**: Article, Recipe, Documentation, Study, Fast Skim, and Presentation presets
- **🎙️ Voice Commands**: Start, pause, stop, change speed, change direction, and jump to top or bottom
- **🎯 Reading Focus**: Optional soft reading band with adjustable height and dim strength
- **On-Page HUD**: Optional draggable page controls with pause/resume, stop, speed, direction, progress, and current heading
- **Smart Pausing**: Optional pause at headings, natural content breaks, and after manual user scroll
- **Per-Tab State**: The popup reflects whether the current tab is scrolling, paused, listening, stopped, or at the end
- **Per-Site Settings**: Save site-specific speed, blocked-site preferences, and selected scroll areas
- **Page Navigation**: Choose a scroll area, jump to the next heading, jump back one paragraph, or jump to page ends
- **Resume Position**: Locally remember reading position and ask before resuming
- **Basic Accessibility Hints**: Show simple page hints without claiming a full WCAG audit

## 🚀 Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The ScrollHands Free icon will appear in your extension toolbar

## 📖 How to Use

### Basic Controls
1. Click the ScrollHands Free icon in your toolbar
2. Choose a speed preset or adjust the slider
3. Click "Start" to begin auto-scrolling
4. Click "Pause" to keep the session ready, or "Stop" to end it
5. Use "At page end" to stop, loop to top, or reverse direction

### Voice Commands
1. Enable voice commands by clicking the voice toggle in the popup
2. Use these voice commands:
   - **"start"** or **"begin"** - Start auto-scrolling
   - **"pause"** - Pause the current session
   - **"stop"** or **"halt"** - Stop and end the session
   - **"faster"** or **"speed up"** - Increase scroll speed
   - **"slower"** or **"slow down"** - Decrease scroll speed
   - **"up"** or **"down"** - Change direction
   - **"top"** or **"bottom"** - Jump to the page ends
   - **"focus on"** or **"focus off"** - Toggle Reading Focus

### Reading Focus
- Toggle Reading Focus to soften the page outside the current reading area
- Perfect for reducing distractions while reading
- Works best with article, documentation, and study reading modes

### On-Page HUD and Page Tools
- Enable the HUD for page-level controls without reopening the popup
- Use Page Tools to choose a scroll area, jump to top/bottom, or view basic accessibility hints
- Right-click a page to start scrolling, choose a scroll area, toggle Reading Focus, or stop

## ⚙️ Options & Settings

Access the options page by clicking "Options" in the popup or through Chrome's extension management.

### Scrolling Settings
- **Default Scroll Speed**: Set your preferred scrolling speed
- **End-of-Page Behavior**: Stop, loop, or reverse when reaching the top or bottom
- **Pause After Manual Scrolling**: Pause briefly when you manually adjust the page
- **Auto-Pause at Headings**: Pause briefly when a heading reaches the reading area

### Voice Commands Settings
- **Voice Language**: Choose browser auto-detection or a supported language
- **Command List**: Short list of supported commands
- **Custom Aliases**: Add local aliases for common commands
- **Disabled Commands & Test Mode**: Turn off commands you do not use and test alias matching without the microphone
- **Microphone Note**: Voice commands are handled by the browser; ScrollHandsFree does not collect or store audio

### Keyboard Shortcuts
- **Start / Pause**: Ctrl+Shift+S
- **Stop**: Ctrl+Shift+X
- **Faster**: Ctrl+Shift+F
- **Slower**: Ctrl+Shift+L
- **Toggle Voice**: assign manually at `chrome://extensions/shortcuts`

### Advanced Settings
- **Reading Focus**: Turn the reading band on by default and adjust band size/dim strength
- **On-Page HUD**: Turn the on-page controller on by default
- **Per-Site Settings**: Block a site or set a site-specific reading speed
- **HUD Position**: Drag the HUD and ScrollHandsFree saves its position locally for the site
- **Privacy Tools**: Export/import settings and clear locally stored settings, positions, aliases, counters, or per-site preferences

## 🛠️ Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension standard
- **Service Worker**: Lightweight background script for message handling
- **On-Demand Content Script**: Injected only when the user starts a page action
- **Popup & Options**: User interface for controls and configuration

### Permissions
- `activeTab`: Temporary access to the current tab after a user action
- `scripting`: Inject the content script only when needed
- `storage`: Save user preferences
- `contextMenus`: Provide right-click page actions
- `optional_host_permissions`: Available for future persistent per-site behavior; normal scrolling uses user-triggered active tab access

### Browser Compatibility
- Chrome 88+ (Manifest V3 requirement)
- Chromium-based browsers (Edge, Opera, Brave)

## 🔧 Development

### Project Structure
```
scrollhands/
├── .github/
│   └── copilot-instructions.md  # Development guidelines
├── icons/
│   ├── icon16.png              # Extension icons
│   ├── icon48.png
│   └── icon128.png
├── manifest.json               # Extension manifest
├── background.js               # Service worker
├── content.js                  # Content script
├── popup.html                  # Popup interface
├── popup.js                    # Popup logic
├── options.html                # Options page
├── options.js                  # Options logic
└── README.md                   # This file
```

### Building
No build process required - this is a vanilla JavaScript extension.

### Testing
1. Load the extension in Chrome developer mode
2. Test on various websites (news sites, blogs, documentation)
3. Verify voice commands work in different environments
4. Verify Reading Focus, HUD controls, scroll-area detection, and basic accessibility hints

## 🎯 Voice Command Examples

| Command | Action |
|---------|--------|
| "start scrolling" | Begin auto-scroll |
| "pause" | Pause the current session |
| "stop" | Stop and end the session |
| "go faster" | Increase speed by 10 |
| "slow down" | Decrease speed by 10 |
| "up" | Scroll upward |
| "down" | Scroll downward |
| "top" | Jump to the top |
| "bottom" | Jump to the bottom |

## ♿ Accessibility

ScrollHands Free is designed with accessibility in mind:

- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: Keyboard-accessible popup, options, and HUD controls
- **Screen Reader Support**: Clear labels and status messages for core controls
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects user motion preferences
- **Basic Page Hints**: Optional hints for common page issues such as missing image alt text, headings, labels, language, and ARIA references. This is not a full WCAG audit.

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Follow the coding standards in `.github/copilot-instructions.md`
2. Test thoroughly on multiple websites
3. Keep accessibility claims accurate and test keyboard/screen-reader behavior
4. Keep the extension lightweight

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports & Feature Requests

Please use GitHub Issues to report bugs or request features. Include:
- Browser version
- Website where the issue occurred
- Steps to reproduce
- Expected vs actual behavior

## 🙏 Acknowledgments

- **Web Speech API**: For browser-handled voice recognition
- **Chrome Extension Team**: For the robust extension platform

## 📊 Privacy

ScrollHands Free respects your privacy:
- No data collection or tracking
- All settings stored locally in your browser
- Microphone access is requested only when you enable voice commands
- Voice recognition is handled by your browser
- No analytics or telemetry

---

**Made for calmer hands-free reading**
