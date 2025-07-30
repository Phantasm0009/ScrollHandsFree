# ScrollHands Free Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore/detail/scrollhands-free-auto-scro/nffjcdkomkhlgldfbgpinmlahkgnnmpb)

A lightweight Chrome extension that provides hands-free browsing through auto-scrolling and voice commands. Perfect for accessibility, reading long articles, or when your hands are busy.

## ✨ Features

- **🤲 Hands-Free Auto-Scrolling**: Automatically scroll through web pages at your preferred speed
- **🎙️ Voice Control**: Control scrolling with natural voice commands
- **🎯 Focus Mode (Cinema Mode)**: Highlight current reading area while dimming the rest
- **♿ Accessibility Features**: WCAG compliance checking and accessibility enhancements
- **⚡ Lightweight**: Under 50KB - won't slow down your browser
- **🎛️ Customizable**: Adjustable scroll speed, voice commands, and behavior

## 🚀 Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The ScrollHands Free icon will appear in your extension toolbar

## 📖 How to Use

### Basic Controls
1. Click the ScrollHands Free icon in your toolbar
2. Adjust the scroll speed using the slider (1-100 pixels per second)
3. Click "Start" to begin auto-scrolling
4. Click "Stop" to pause scrolling

### Voice Commands
1. Enable voice control by clicking the voice toggle in the popup
2. Use these voice commands:
   - **"start"** or **"begin"** - Start auto-scrolling
   - **"stop"** or **"halt"** - Stop auto-scrolling
   - **"faster"** or **"speed up"** - Increase scroll speed
   - **"slower"** or **"slow down"** - Decrease scroll speed
   - **"pause 5"** - Pause for 5 seconds (any number works)
   - **"focus"** or **"cinema"** - Toggle focus mode

### Focus Mode (Cinema Mode)
- Toggle focus mode to dim the entire page except for a reading band
- Perfect for reducing distractions while reading
- The highlighted area follows your scroll position

### Accessibility Features
- Click "Check Page Accessibility" to run a WCAG compliance audit
- Configure accessibility options in the Options page
- Support for high contrast, reduced motion, and keyboard navigation

## ⚙️ Options & Settings

Access the options page by clicking "Options" in the popup or through Chrome's extension management.

### Scrolling Settings
- **Default Scroll Speed**: Set your preferred scrolling speed
- **Auto-start on Page Load**: Automatically begin scrolling when visiting new pages

### Voice Control Settings
- **Activation Shortcut**: Keyboard shortcut to toggle voice control
- **Supported Commands**: Full list of available voice commands

### Accessibility Settings
- **High Contrast Mode**: Enhanced visibility for better readability
- **Reduced Motion**: Minimize animations for vestibular sensitivity
- **Enhanced Keyboard Navigation**: Improved keyboard accessibility

### Advanced Settings
- **Pause at Headings**: Automatically pause when reaching new sections
- **Smart Pausing**: Intelligent pausing at natural content breaks

## 🛠️ Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension standard
- **Service Worker**: Lightweight background script for message handling
- **Content Script**: Injected into web pages for scrolling functionality
- **Popup & Options**: User interface for controls and configuration

### Permissions
- `activeTab`: Access current tab for scrolling
- `scripting`: Inject content scripts
- `storage`: Save user preferences
- `<all_urls>`: Work on all websites

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
4. Check accessibility features with screen readers

## 🎯 Voice Command Examples

| Command | Action |
|---------|--------|
| "start scrolling" | Begin auto-scroll |
| "stop" | Stop scrolling |
| "go faster" | Increase speed by 10 |
| "slow down" | Decrease speed by 10 |
| "pause for 3 seconds" | Pause for 3 seconds |
| "enable focus mode" | Toggle cinema mode |

## ♿ Accessibility

ScrollHands Free is designed with accessibility in mind:

- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: Full keyboard support for all features
- **Screen Reader Support**: Compatible with NVDA, JAWS, and VoiceOver
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects user motion preferences
- **WCAG Compliance**: Built-in accessibility auditing

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Follow the coding standards in `.github/copilot-instructions.md`
2. Test thoroughly on multiple websites
3. Ensure accessibility compliance
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

- **axe-core**: For accessibility testing capabilities
- **Web Speech API**: For voice recognition functionality
- **Chrome Extension Team**: For the robust extension platform

## 📊 Privacy

ScrollHands Free respects your privacy:
- No data collection or tracking
- No network requests (except for axe-core CDN)
- All settings stored locally in your browser
- No analytics or telemetry

---

**Made with ❤️ for accessible web browsing**
