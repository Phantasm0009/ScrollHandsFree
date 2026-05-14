
// Constants for storage keys
const STORAGE_KEYS = {
  DEFAULT_SPEED: 'defaultSpeed',
  CURRENT_SPEED: 'currentSpeed',
  VOICE_ENABLED: 'voiceEnabled',
  PAUSE_AT_HEADINGS: 'pauseAtHeadings',
  SMART_PAUSING: 'smartPausing',
  END_BEHAVIOR: 'endBehavior',
  READING_MODE: 'readingMode',
  FOCUS_BAND_ENABLED: 'focusBandEnabled',
  MINI_CONTROLLER_ENABLED: 'miniControllerEnabled',
  AUTO_PAUSE_ON_USER_SCROLL: 'autoPauseOnUserScroll',
  VOICE_LANGUAGE: 'voiceLanguage',
  VOICE_SETUP_SEEN: 'voiceSetupSeen',
  ONBOARDING_SEEN: 'onboardingSeen',
  WHATS_NEW_SEEN_VERSION: 'whatsNewSeenVersion',
  DEFAULT_DIRECTION: 'defaultDirection',
  HUD_ENABLED: 'hudEnabled',
  FOCUS_BAND_HEIGHT: 'focusBandHeight',
  FOCUS_DIM_OPACITY: 'focusDimOpacity',
  READING_RHYTHM: 'readingRhythm',
  VOICE_ALIASES: 'voiceAliases',
  DISABLED_COMMANDS: 'disabledCommands',
  PER_SITE_SETTINGS: 'perSiteSettings',
  LAST_POSITIONS: 'lastPositions',
  USAGE_COUNTERS: 'usageCounters'
};

// Default settings
const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.DEFAULT_SPEED]: 50,
  [STORAGE_KEYS.CURRENT_SPEED]: 50,
  [STORAGE_KEYS.VOICE_ENABLED]: false,
  [STORAGE_KEYS.PAUSE_AT_HEADINGS]: 2,
  [STORAGE_KEYS.SMART_PAUSING]: false,
  [STORAGE_KEYS.END_BEHAVIOR]: 'stop',
  [STORAGE_KEYS.READING_MODE]: 'custom',
  [STORAGE_KEYS.FOCUS_BAND_ENABLED]: false,
  [STORAGE_KEYS.MINI_CONTROLLER_ENABLED]: false,
  [STORAGE_KEYS.AUTO_PAUSE_ON_USER_SCROLL]: true,
  [STORAGE_KEYS.VOICE_LANGUAGE]: 'auto',
  [STORAGE_KEYS.VOICE_SETUP_SEEN]: false,
  [STORAGE_KEYS.ONBOARDING_SEEN]: false,
  [STORAGE_KEYS.WHATS_NEW_SEEN_VERSION]: '',
  [STORAGE_KEYS.DEFAULT_DIRECTION]: 1,
  [STORAGE_KEYS.HUD_ENABLED]: false,
  [STORAGE_KEYS.FOCUS_BAND_HEIGHT]: 24,
  [STORAGE_KEYS.FOCUS_DIM_OPACITY]: 0.08,
  [STORAGE_KEYS.READING_RHYTHM]: 'smooth',
  [STORAGE_KEYS.VOICE_ALIASES]: {},
  [STORAGE_KEYS.DISABLED_COMMANDS]: {},
  [STORAGE_KEYS.PER_SITE_SETTINGS]: {},
  [STORAGE_KEYS.LAST_POSITIONS]: {},
  [STORAGE_KEYS.USAGE_COUNTERS]: {}
};

const SPEED_PRESETS = {
  slow: 20,
  reading: 45,
  fast: 75,
  skim: 100
};

const POSITION_PERSIST_INTERVAL_MS = 2500;
const positionPersistTimes = new Map();

const READING_MODE_PRESETS = {
  custom: {
    label: 'Custom'
  },
  article: {
    label: 'Article',
    speed: 45,
    endBehavior: 'stop',
    focusBandEnabled: true,
    miniControllerEnabled: false,
    autoPauseAtHeadings: true,
    headingPauseSeconds: 1.2
  },
  recipe: {
    label: 'Recipe',
    speed: 25,
    endBehavior: 'stop',
    focusBandEnabled: false,
    miniControllerEnabled: true,
    autoPauseAtHeadings: true,
    headingPauseSeconds: 2.5
  },
  documentation: {
    label: 'Documentation',
    speed: 38,
    endBehavior: 'stop',
    focusBandEnabled: true,
    miniControllerEnabled: false,
    autoPauseAtHeadings: true,
    headingPauseSeconds: 1.8
  },
  study: {
    label: 'Study',
    speed: 30,
    endBehavior: 'stop',
    focusBandEnabled: true,
    miniControllerEnabled: true,
    autoPauseAtHeadings: true,
    headingPauseSeconds: 2.5,
    readingRhythm: 'deliberate'
  },
  fastSkim: {
    label: 'Fast skim',
    speed: 85,
    endBehavior: 'stop',
    focusBandEnabled: false,
    miniControllerEnabled: true,
    autoPauseAtHeadings: false,
    headingPauseSeconds: 0,
    readingRhythm: 'smooth'
  },
  teleprompter: {
    label: 'Presentation',
    speed: 32,
    endBehavior: 'stop',
    focusBandEnabled: true,
    miniControllerEnabled: true,
    autoPauseAtHeadings: false,
    headingPauseSeconds: 0,
    readingRhythm: 'smooth'
  }
};

const DEFAULT_TAB_STATE = {
  status: 'stopped',
  isScrolling: false,
  isPaused: false,
  hasActiveSession: false,
  currentSpeed: DEFAULT_SETTINGS[STORAGE_KEYS.CURRENT_SPEED],
  direction: 1,
  endBehavior: DEFAULT_SETTINGS[STORAGE_KEYS.END_BEHAVIOR],
  readingMode: DEFAULT_SETTINGS[STORAGE_KEYS.READING_MODE],
  focusBandEnabled: DEFAULT_SETTINGS[STORAGE_KEYS.FOCUS_BAND_ENABLED],
  miniControllerEnabled: DEFAULT_SETTINGS[STORAGE_KEYS.MINI_CONTROLLER_ENABLED],
  hudEnabled: DEFAULT_SETTINGS[STORAGE_KEYS.HUD_ENABLED],
  hudPosition: null,
  focusBandHeight: DEFAULT_SETTINGS[STORAGE_KEYS.FOCUS_BAND_HEIGHT],
  focusDimOpacity: DEFAULT_SETTINGS[STORAGE_KEYS.FOCUS_DIM_OPACITY],
  autoPauseAtHeadings: DEFAULT_SETTINGS[STORAGE_KEYS.SMART_PAUSING],
  autoPauseOnUserScroll: DEFAULT_SETTINGS[STORAGE_KEYS.AUTO_PAUSE_ON_USER_SCROLL],
  readingRhythm: DEFAULT_SETTINGS[STORAGE_KEYS.READING_RHYTHM],
  target: 'page',
  positionPercent: 0,
  timeRemainingSeconds: 0,
  currentHeading: '',
  lastKnownUrl: '',
  listening: false,
  voiceMessage: 'Off',
  message: 'Ready on this page'
};

/**
 * Initialize extension settings on installation
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const existingSettings = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    const settingsToSet = {};

    // Only set defaults for missing settings
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (!(key in existingSettings)) {
        settingsToSet[key] = value;
      }
    }

    if (Object.keys(settingsToSet).length > 0) {
      await chrome.storage.local.set(settingsToSet);
    }

    createContextMenus();
    if (details.reason === 'install') {
      chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') }).catch(() => {});
    } else if (details.reason === 'update') {
      chrome.tabs.create({ url: chrome.runtime.getURL('changelog.html') }).catch(() => {});
    }

    console.log('ScrollHands Free extension initialized');
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenus();
});

function createContextMenus() {
  if (!chrome.contextMenus) return;

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'scrollhands-start',
      title: 'Start ScrollHandsFree here',
      contexts: ['page', 'selection', 'link', 'editable']
    });
    chrome.contextMenus.create({
      id: 'scrollhands-choose-area',
      title: 'Choose scroll area',
      contexts: ['page', 'selection', 'link', 'editable']
    });
    chrome.contextMenus.create({
      id: 'scrollhands-toggle-focus',
      title: 'Toggle Reading Focus',
      contexts: ['page', 'selection', 'link', 'editable']
    });
    chrome.contextMenus.create({
      id: 'scrollhands-stop',
      title: 'Stop ScrollHandsFree',
      contexts: ['page', 'selection', 'link', 'editable']
    });
  });
}

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  try {
    switch (info.menuItemId) {
      case 'scrollhands-start':
        await sendScrollCommandToTab(tab.id, { command: 'startScroll' });
        await incrementUsageCounter('contextStarts');
        break;
      case 'scrollhands-choose-area':
        await sendScrollCommandToTab(tab.id, { command: 'chooseScrollArea' });
        break;
      case 'scrollhands-toggle-focus': {
        const state = await getStoredTabState(tab.id);
        await sendScrollCommandToTab(tab.id, {
          command: 'setFocusBand',
          enabled: !state.focusBandEnabled
        });
        await incrementUsageCounter('focusToggles');
        break;
      }
      case 'scrollhands-stop':
        await sendScrollCommandToTab(tab.id, { command: 'stopScroll' });
        break;
      default:
        break;
    }
  } catch (error) {
    console.warn('Context menu action failed:', error.message);
  }
});

/**
 * Handle keyboard shortcuts
 */
chrome.commands.onCommand.addListener(async (command) => {
  try {
    switch (command) {
      case 'toggle-scroll':
        await handleToggleScrollCommand();
        break;
      case 'stop-scroll':
        await handleStopScrollCommand();
        break;
      case 'speed-up':
        await handleAdjustSpeedCommand(15);
        break;
      case 'speed-down':
        await handleAdjustSpeedCommand(-15);
        break;
      case 'toggle-voice-control':
        await handleToggleVoiceCommand();
        break;
      default:
        console.warn('Unknown keyboard command:', command);
    }
  } catch (error) {
    console.error('Error handling keyboard shortcut:', error);
  }
});

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (!request?.command || (request.target && request.target !== 'background')) {
      return false;
    }

    switch (request.command) {
      case 'startScroll':
        handleStartScroll(request.speed, request.direction, sendResponse);
        return true; // Keep message channel open for async response
      case 'toggleScroll':
        handleToggleScroll(sendResponse);
        return true; // Keep message channel open for async response
      case 'pauseScroll':
        handlePauseScroll(sendResponse);
        return true; // Keep message channel open for async response
      case 'stopScroll':
        handleStopScroll(sendResponse);
        return true; // Keep message channel open for async response
      case 'setSpeed':
        handleSetSpeed(request.speed, sendResponse);
        return true; // Keep message channel open for async response
      case 'setSpeedPreset':
        handleSetSpeedPreset(request.preset, sendResponse);
        return true; // Keep message channel open for async response
      case 'setEndBehavior':
        handleSetEndBehavior(request.endBehavior, sendResponse);
        return true; // Keep message channel open for async response
      case 'setReadingMode':
        handleSetReadingMode(request.mode, sendResponse);
        return true; // Keep message channel open for async response
      case 'setFocusBand':
        handleSetFocusBand(request.enabled, sendResponse);
        return true; // Keep message channel open for async response
      case 'setMiniController':
        handleSetMiniController(request.enabled, sendResponse);
        return true; // Keep message channel open for async response
      case 'chooseScrollArea':
        handleChooseScrollArea(sendResponse);
        return true;
      case 'jumpToTop':
        handleJumpToBoundary('top', sendResponse);
        return true;
      case 'jumpToBottom':
        handleJumpToBoundary('bottom', sendResponse);
        return true;
      case 'jumpToNextHeading':
        handleJumpToPageElement('jumpToNextHeading', sendResponse);
        return true;
      case 'jumpBackParagraph':
        handleJumpToPageElement('jumpBackParagraph', sendResponse);
        return true;
      case 'resumePosition':
        handleResumePosition(request.positionPercent, sendResponse);
        return true;
      case 'getAccessibilityHints':
        handleGetAccessibilityHints(sendResponse);
        return true;
      case 'getDiagnostics':
        handleGetDiagnostics(sendResponse);
        return true;
      case 'toggleVoice':
        handleToggleVoice(request.enabled, sendResponse);
        return true; // Keep message channel open for async response
      case 'checkAccessibility':
        handleAccessibilityCheck(sendResponse);
        return true; // Keep message channel open for async response
      case 'getTabState':
        handleGetTabState(sendResponse);
        return true; // Keep message channel open for async response
      case 'getSettings':
        handleGetSettings(sendResponse);
        return true; // Keep message channel open for async response
      case 'saveSettings':
        handleSaveSettings(request.settings, sendResponse);
        return true; // Keep message channel open for async response
      case 'saveSiteSettings':
        handleSaveSiteSettings(request.settings, sendResponse);
        return true;
      case 'resetCurrentSite':
        handleResetCurrentSite(sendResponse);
        return true;
      case 'clearLocalData':
        handleClearLocalData(request.types, sendResponse);
        return true;
      case 'exportSettings':
        handleExportSettings(sendResponse);
        return true;
      case 'importSettings':
        handleImportSettings(request.settings, sendResponse);
        return true;
      case 'accessibilityReport':
        handleAccessibilityReport(request.data);
        break;
      case 'voiceCommand':
        // Voice command processed in content script, update popup status
        handleVoiceCommandFeedback(request.commandText, request.success, request.feedback);
        break;
      case 'voiceFeedback':
        handleVoiceFeedback(request.message, request.commandType, sender.tab?.id);
        break;
      case 'voiceStatusUpdate':
        // Voice recognition status changed, update popup
        handleVoiceStatusUpdate(request.status, request.enabled, sender.tab?.id);
        break;
      case 'scrollStateUpdate':
        handleScrollStateUpdate(request.state, sender.tab?.id, request.transient === true);
        break;
      case 'miniControllerClosed':
        handleMiniControllerClosed(request.state, sender.tab?.id);
        break;
      default:
        if (['updateScrollState', 'updateVoiceStatus'].includes(request.command)) {
          return false;
        }
        console.warn('Unknown command:', request.command);
        sendResponse({ success: false, error: 'Unknown command' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
});

/**
 * Ensure content script is injected and send message
 */
async function sendMessageToTab(tabId, message) {
  try {
    // First try to ping the content script to see if it's loaded
    try {
      const pingResponse = await chrome.tabs.sendMessage(tabId, { command: 'ping', target: 'content' });
      if (pingResponse?.success) {
        // Content script is ready, send the actual message
        return await chrome.tabs.sendMessage(tabId, { ...message, target: 'content' });
      }
    } catch (pingError) {
      // Content script not loaded, continue to injection
    }

    // Content script is not loaded, inject it first
    console.log('Injecting content script for tab:', tabId);
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });

    // Wait a bit for the script to initialize
    await new Promise(resolve => setTimeout(resolve, 200));

    // Try sending the message again
    return await chrome.tabs.sendMessage(tabId, { ...message, target: 'content' });

  } catch (error) {
    console.error('Error in sendMessageToTab:', error);
    throw error;
  }
}

async function sendMessageToExistingContentScript(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, { ...message, target: 'content' });
  } catch (error) {
    return null;
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function getRuntimeSettings() {
  const settings = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return {
    ...DEFAULT_SETTINGS,
    ...settings
  };
}

function isRestrictedUrl(url = '') {
  if (url.startsWith(chrome.runtime.getURL(''))) {
    return false;
  }
  return /^(chrome|chrome-extension|edge|about|devtools):/i.test(url) || url.startsWith('https://chrome.google.com/webstore') || url.startsWith('https://chromewebstore.google.com/');
}

function getSiteKey(url = '') {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return '';
    }
    return parsed.hostname.replace(/^www\./, '');
  } catch (error) {
    return '';
  }
}

async function getSiteSettings(tab) {
  const key = getSiteKey(tab?.url || '');
  if (!key) {
    return { key: '', settings: {} };
  }

  const result = await chrome.storage.local.get([STORAGE_KEYS.PER_SITE_SETTINGS]);
  const allSiteSettings = result[STORAGE_KEYS.PER_SITE_SETTINGS] || {};
  return {
    key,
    settings: allSiteSettings[key] || {}
  };
}

function toDisplayText(value, fallback = '') {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    const preferred = value.message ?? value.status ?? value.feedback ?? value.text ?? value.error ?? value.command;
    if (preferred !== undefined) {
      return toDisplayText(preferred, fallback);
    }
  }

  return fallback;
}

function normalizeTabState(state = {}, settings = DEFAULT_SETTINGS) {
  const normalized = {
    ...DEFAULT_TAB_STATE,
    currentSpeed: settings[STORAGE_KEYS.CURRENT_SPEED] || settings[STORAGE_KEYS.DEFAULT_SPEED] || DEFAULT_TAB_STATE.currentSpeed,
    endBehavior: settings[STORAGE_KEYS.END_BEHAVIOR] || DEFAULT_TAB_STATE.endBehavior,
    readingMode: settings[STORAGE_KEYS.READING_MODE] || DEFAULT_TAB_STATE.readingMode,
    focusBandEnabled: settings[STORAGE_KEYS.FOCUS_BAND_ENABLED] || false,
    miniControllerEnabled: settings[STORAGE_KEYS.MINI_CONTROLLER_ENABLED] || false,
    hudEnabled: settings[STORAGE_KEYS.HUD_ENABLED] || false,
    focusBandHeight: Number(settings[STORAGE_KEYS.FOCUS_BAND_HEIGHT]) || DEFAULT_TAB_STATE.focusBandHeight,
    focusDimOpacity: Number(settings[STORAGE_KEYS.FOCUS_DIM_OPACITY]) || DEFAULT_TAB_STATE.focusDimOpacity,
    autoPauseAtHeadings: settings[STORAGE_KEYS.SMART_PAUSING] || false,
    autoPauseOnUserScroll: settings[STORAGE_KEYS.AUTO_PAUSE_ON_USER_SCROLL] !== false,
    readingRhythm: settings[STORAGE_KEYS.READING_RHYTHM] || DEFAULT_TAB_STATE.readingRhythm,
    ...state
  };

  return {
    ...normalized,
    status: toDisplayText(normalized.status, DEFAULT_TAB_STATE.status),
    target: toDisplayText(normalized.target, DEFAULT_TAB_STATE.target),
    message: toDisplayText(normalized.message, DEFAULT_TAB_STATE.message),
    voiceMessage: toDisplayText(normalized.voiceMessage, normalized.listening ? 'Listening' : 'Off'),
    currentSpeed: Math.max(1, Math.min(100, parseInt(normalized.currentSpeed, 10) || DEFAULT_TAB_STATE.currentSpeed)),
    positionPercent: Math.max(0, Math.min(100, Number(normalized.positionPercent) || 0)),
    timeRemainingSeconds: Math.max(0, Number(normalized.timeRemainingSeconds) || 0),
    currentHeading: toDisplayText(normalized.currentHeading, ''),
    lastKnownUrl: toDisplayText(normalized.lastKnownUrl, '')
  };
}

function buildContentSettings(settings = DEFAULT_SETTINGS, siteSettings = {}) {
  const merged = {
    ...settings,
    ...siteSettings
  };

  return {
    currentSpeed: merged[STORAGE_KEYS.CURRENT_SPEED] || merged[STORAGE_KEYS.DEFAULT_SPEED] || DEFAULT_TAB_STATE.currentSpeed,
    direction: Number(merged[STORAGE_KEYS.DEFAULT_DIRECTION]) === -1 ? -1 : 1,
    endBehavior: merged[STORAGE_KEYS.END_BEHAVIOR] || DEFAULT_TAB_STATE.endBehavior,
    readingMode: merged[STORAGE_KEYS.READING_MODE] || DEFAULT_TAB_STATE.readingMode,
    focusBandEnabled: merged[STORAGE_KEYS.FOCUS_BAND_ENABLED] || false,
    miniControllerEnabled: merged[STORAGE_KEYS.MINI_CONTROLLER_ENABLED] || false,
    hudEnabled: merged[STORAGE_KEYS.HUD_ENABLED] || false,
    focusBandHeight: Number(merged[STORAGE_KEYS.FOCUS_BAND_HEIGHT]) || DEFAULT_SETTINGS[STORAGE_KEYS.FOCUS_BAND_HEIGHT],
    focusDimOpacity: Number(merged[STORAGE_KEYS.FOCUS_DIM_OPACITY]) || DEFAULT_SETTINGS[STORAGE_KEYS.FOCUS_DIM_OPACITY],
    autoPauseAtHeadings: merged[STORAGE_KEYS.SMART_PAUSING] || false,
    headingPauseSeconds: Number(merged[STORAGE_KEYS.PAUSE_AT_HEADINGS]) || DEFAULT_SETTINGS[STORAGE_KEYS.PAUSE_AT_HEADINGS],
    autoPauseOnUserScroll: merged[STORAGE_KEYS.AUTO_PAUSE_ON_USER_SCROLL] !== false,
    readingRhythm: merged[STORAGE_KEYS.READING_RHYTHM] || DEFAULT_SETTINGS[STORAGE_KEYS.READING_RHYTHM],
    userScrollPauseSeconds: 2.5,
    voiceLanguage: merged[STORAGE_KEYS.VOICE_LANGUAGE] || DEFAULT_SETTINGS[STORAGE_KEYS.VOICE_LANGUAGE],
    voiceAliases: settings[STORAGE_KEYS.VOICE_ALIASES] || {},
    disabledCommands: settings[STORAGE_KEYS.DISABLED_COMMANDS] || {},
    scrollContainerSelector: siteSettings.scrollContainerSelector || '',
    hudPosition: siteSettings.hudPosition || null
  };
}

async function getStoredTabState(tabId) {
  const settings = await getRuntimeSettings();
  const result = await chrome.storage.session.get(['tabScrollStates']);
  const tabScrollStates = result.tabScrollStates || {};
  return normalizeTabState(tabScrollStates[tabId], settings);
}

async function storeTabState(tabId, state) {
  if (!tabId || !state) return;

  const result = await chrome.storage.session.get(['tabScrollStates']);
  const tabScrollStates = result.tabScrollStates || {};
  const settings = await getRuntimeSettings();
  tabScrollStates[tabId] = normalizeTabState(state, settings);
  await chrome.storage.session.set({ tabScrollStates });
  notifyPopupScrollState(tabId, tabScrollStates[tabId]);
}

function notifyPopupScrollState(tabId, state) {
  chrome.runtime.sendMessage({
    target: 'popup',
    command: 'updateScrollState',
    tabId,
    state
  }).catch(() => {
    // Popup might not be open.
  });
}

async function sendScrollCommandToActiveTab(message) {
  const tab = await getActiveTab();
  return sendScrollCommandToTab(tab?.id, message, tab);
}

async function sendScrollCommandToTab(tabId, message, providedTab = null) {
  if (!tabId) {
    return { success: false, error: 'No active tab found' };
  }

  const tab = providedTab || await chrome.tabs.get(tabId).catch(() => null);
  if (isRestrictedUrl(tab?.url || '')) {
    return {
      success: false,
      error: 'This page does not allow extensions to run.',
      state: normalizeTabState({
        status: 'stopped',
        message: 'This page does not allow extensions to run.',
        lastKnownUrl: tab?.url || ''
      }),
      tabId
    };
  }

  const settings = await getRuntimeSettings();
  const site = await getSiteSettings(tab);
  if (site.settings?.blocked) {
    return {
      success: false,
      error: 'ScrollHandsFree is disabled on this site.',
      state: normalizeTabState({
        status: 'stopped',
        message: 'ScrollHandsFree is disabled on this site.',
        lastKnownUrl: tab?.url || ''
      }, settings),
      tabId
    };
  }

  const existingState = await getStoredTabState(tabId);
  const enrichedMessage = {
    ...message,
    speed: message.speed !== undefined
      ? message.speed
      : existingState.currentSpeed || site.settings?.currentSpeed || settings[STORAGE_KEYS.CURRENT_SPEED] || settings[STORAGE_KEYS.DEFAULT_SPEED],
    direction: message.direction !== undefined ? message.direction : existingState.direction || site.settings?.defaultDirection || settings[STORAGE_KEYS.DEFAULT_DIRECTION] || 1,
    endBehavior: message.endBehavior || existingState.endBehavior || site.settings?.endBehavior || settings[STORAGE_KEYS.END_BEHAVIOR],
    settings: buildContentSettings(settings, site.settings)
  };

  const response = await sendMessageToTab(tabId, enrichedMessage);

  if (response?.state) {
    await storeTabState(tabId, {
      ...response.state,
      lastKnownUrl: tab?.url || response.state.lastKnownUrl || ''
    });
  }

  return {
    success: Boolean(response?.success),
    error: response?.error,
    state: response?.state ? normalizeTabState({
      ...response.state,
      lastKnownUrl: tab?.url || response.state.lastKnownUrl || ''
    }, settings) : await getStoredTabState(tabId),
    tabId
  };
}

/**
 * Start auto-scrolling on active tab
 */
async function handleStartScroll(speed, direction, sendResponse) {
  try {
    const result = await sendScrollCommandToActiveTab({
      command: 'startScroll',
      speed,
      direction
    });
    if (result.success) {
      await incrementUsageCounter('scrollStarts');
    }
    sendResponse(result);
  } catch (error) {
    console.error('Error starting scroll:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleToggleScroll(sendResponse) {
  try {
    const result = await sendScrollCommandToActiveTab({ command: 'toggleScroll' });
    sendResponse(result);
  } catch (error) {
    console.error('Error toggling scroll:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handlePauseScroll(sendResponse) {
  try {
    const result = await sendScrollCommandToActiveTab({ command: 'pauseScroll' });
    sendResponse(result);
  } catch (error) {
    console.error('Error pausing scroll:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Stop auto-scrolling on active tab
 */
async function handleStopScroll(sendResponse) {
  try {
    const result = await sendScrollCommandToActiveTab({ command: 'stopScroll' });
    sendResponse(result);
  } catch (error) {
    console.error('Error stopping scroll:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Set scroll speed
 */
async function handleSetSpeed(speed, sendResponse) {
  try {
    const parsedSpeed = parseInt(speed, 10);
    const clampedSpeed = Number.isNaN(parsedSpeed)
      ? DEFAULT_SETTINGS[STORAGE_KEYS.CURRENT_SPEED]
      : Math.max(1, Math.min(100, parsedSpeed));
    await chrome.storage.local.set({
      [STORAGE_KEYS.CURRENT_SPEED]: clampedSpeed,
      [STORAGE_KEYS.READING_MODE]: 'custom'
    });
    const result = await sendScrollCommandToActiveTab({
      command: 'setSpeed',
      speed: clampedSpeed
    });
    sendResponse(result);
  } catch (error) {
    console.error('Error setting speed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSetSpeedPreset(preset, sendResponse) {
  try {
    if (!Object.prototype.hasOwnProperty.call(SPEED_PRESETS, preset)) {
      sendResponse({ success: false, error: 'Unknown speed preset' });
      return;
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.CURRENT_SPEED]: SPEED_PRESETS[preset],
      [STORAGE_KEYS.READING_MODE]: 'custom'
    });
    const result = await sendScrollCommandToActiveTab({
      command: 'setSpeedPreset',
      preset
    });
    sendResponse(result);
  } catch (error) {
    console.error('Error setting speed preset:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSetEndBehavior(endBehavior, sendResponse) {
  try {
    if (!['stop', 'loop', 'reverse'].includes(endBehavior)) {
      sendResponse({ success: false, error: 'Unknown end behavior' });
      return;
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.END_BEHAVIOR]: endBehavior,
      [STORAGE_KEYS.READING_MODE]: 'custom'
    });
    const result = await sendScrollCommandToActiveTab({
      command: 'setEndBehavior',
      endBehavior
    });
    sendResponse(result);
  } catch (error) {
    console.error('Error setting end behavior:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSetReadingMode(mode, sendResponse) {
  try {
    if (!Object.prototype.hasOwnProperty.call(READING_MODE_PRESETS, mode)) {
      sendResponse({ success: false, error: 'Unknown reading mode' });
      return;
    }

    const preset = READING_MODE_PRESETS[mode];
    const settingsUpdate = {
      [STORAGE_KEYS.READING_MODE]: mode
    };

    if (typeof preset.speed === 'number') {
      settingsUpdate[STORAGE_KEYS.CURRENT_SPEED] = preset.speed;
    }
    if (preset.endBehavior) {
      settingsUpdate[STORAGE_KEYS.END_BEHAVIOR] = preset.endBehavior;
    }
    if (typeof preset.focusBandEnabled === 'boolean') {
      settingsUpdate[STORAGE_KEYS.FOCUS_BAND_ENABLED] = preset.focusBandEnabled;
    }
    if (typeof preset.miniControllerEnabled === 'boolean') {
      settingsUpdate[STORAGE_KEYS.MINI_CONTROLLER_ENABLED] = preset.miniControllerEnabled;
      settingsUpdate[STORAGE_KEYS.HUD_ENABLED] = preset.miniControllerEnabled;
    }
    if (typeof preset.autoPauseAtHeadings === 'boolean') {
      settingsUpdate[STORAGE_KEYS.SMART_PAUSING] = preset.autoPauseAtHeadings;
    }
    if (typeof preset.headingPauseSeconds === 'number') {
      settingsUpdate[STORAGE_KEYS.PAUSE_AT_HEADINGS] = preset.headingPauseSeconds;
    }
    if (typeof preset.readingRhythm === 'string') {
      settingsUpdate[STORAGE_KEYS.READING_RHYTHM] = preset.readingRhythm;
    }

    await chrome.storage.local.set(settingsUpdate);
    const result = await sendScrollCommandToActiveTab({
      command: 'setReadingMode',
      mode
    });
    sendResponse(result);
  } catch (error) {
    console.error('Error setting reading mode:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSetFocusBand(enabled, sendResponse) {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.READING_MODE]: 'custom',
      [STORAGE_KEYS.FOCUS_BAND_ENABLED]: Boolean(enabled)
    });
    const result = await sendScrollCommandToActiveTab({
      command: 'setFocusBand',
      enabled: Boolean(enabled)
    });
    if (result.success) {
      await incrementUsageCounter('focusToggles');
    }
    sendResponse(result);
  } catch (error) {
    console.error('Error setting focus band:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSetMiniController(enabled, sendResponse) {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.READING_MODE]: 'custom',
      [STORAGE_KEYS.MINI_CONTROLLER_ENABLED]: Boolean(enabled),
      [STORAGE_KEYS.HUD_ENABLED]: Boolean(enabled)
    });
    const result = await sendScrollCommandToActiveTab({
      command: 'setMiniController',
      enabled: Boolean(enabled)
    });
    sendResponse(result);
  } catch (error) {
    console.error('Error setting HUD:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleChooseScrollArea(sendResponse) {
  try {
    const result = await sendScrollCommandToActiveTab({ command: 'chooseScrollArea' });
    sendResponse(result);
  } catch (error) {
    console.error('Error starting choose scroll area mode:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleJumpToBoundary(boundary, sendResponse) {
  try {
    const result = await sendScrollCommandToActiveTab({
      command: boundary === 'top' ? 'jumpToTop' : 'jumpToBottom'
    });
    sendResponse(result);
  } catch (error) {
    console.error('Error jumping:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleJumpToPageElement(command, sendResponse) {
  try {
    const result = await sendScrollCommandToActiveTab({ command });
    sendResponse(result);
  } catch (error) {
    console.error('Error jumping to page element:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleResumePosition(positionPercent, sendResponse) {
  try {
    const result = await sendScrollCommandToActiveTab({
      command: 'resumePosition',
      positionPercent
    });
    sendResponse(result);
  } catch (error) {
    console.error('Error resuming position:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetAccessibilityHints(sendResponse) {
  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }
    if (isRestrictedUrl(tab.url || '')) {
      sendResponse({ success: false, error: 'This page does not allow extensions to run.' });
      return;
    }
    const settings = await getRuntimeSettings();
    const site = await getSiteSettings(tab);
    const response = await sendMessageToTab(tab.id, {
      command: 'getAccessibilityHints',
      settings: buildContentSettings(settings, site.settings)
    });
    sendResponse({
      success: Boolean(response?.success),
      hints: response?.hints,
      error: response?.error,
      tabId: tab.id
    });
  } catch (error) {
    console.error('Error getting accessibility hints:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetDiagnostics(sendResponse) {
  try {
    const tab = await getActiveTab();
    const settings = await getRuntimeSettings();
    const site = await getSiteSettings(tab);
    let contentDiagnostics = {
      contentScriptActive: false,
      pageScrollable: false,
      scrollContainerDetected: false,
      voiceSupported: false
    };

    if (tab?.id && !isRestrictedUrl(tab.url || '')) {
      try {
        const response = await sendMessageToTab(tab.id, {
          command: 'getDiagnostics',
          settings: buildContentSettings(settings, site.settings)
        });
        if (response?.success) {
          contentDiagnostics = response.diagnostics || contentDiagnostics;
        }
      } catch (error) {
        // Keep inactive diagnostics.
      }
    }

    sendResponse({
      success: true,
      diagnostics: {
        ...contentDiagnostics,
        tabId: tab?.id || null,
        url: tab?.url || '',
        site: site.key,
        siteBlocked: Boolean(site.settings?.blocked),
        currentState: tab?.id ? await getStoredTabState(tab.id) : DEFAULT_TAB_STATE,
        permissionModel: 'On-demand activeTab injection',
        manifestVersion: chrome.runtime.getManifest().version
      }
    });
  } catch (error) {
    console.error('Error getting diagnostics:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleToggleScrollCommand() {
  await sendScrollCommandToActiveTab({ command: 'toggleScroll' });
}

async function handleStopScrollCommand() {
  await sendScrollCommandToActiveTab({ command: 'stopScroll' });
}

async function handleAdjustSpeedCommand(delta) {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  const state = await getStoredTabState(tab.id);
  const nextSpeed = Math.max(1, Math.min(100, (state.currentSpeed || DEFAULT_TAB_STATE.currentSpeed) + delta));
  await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_SPEED]: nextSpeed });
  await sendScrollCommandToActiveTab({
    command: 'setSpeed',
    speed: nextSpeed
  });
}

async function handleToggleVoiceCommand() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  const state = await getStoredTabState(tab.id);
  await new Promise((resolve) => {
    handleToggleVoice(!state.listening, () => resolve());
  });
}

/**
 * Toggle voice commands for a specific tab only.
 */
async function handleToggleVoice(enabled, sendResponse) {
  try {
    const tab = await getActiveTab();
    if (tab?.id) {
      const tabId = tab.id;

      // First disable voice commands on all other tabs.
      if (enabled) {
        await disableVoiceOnAllOtherTabs(tabId);
      }

      const response = await sendMessageToTab(tabId, {
        command: 'toggleVoice',
        enabled: enabled,
        tabSpecific: true // Flag to indicate tab-specific mode
      });

      if (response?.success) {
        // Store voice state per tab instead of globally
        const tabVoiceStates = await chrome.storage.session.get(['tabVoiceStates']) || {};
        const currentTabStates = tabVoiceStates.tabVoiceStates || {};

        if (enabled) {
          currentTabStates[tabId] = {
            enabled: true,
            url: tab.url || '',
            site: getSiteKey(tab.url || ''),
            startedAt: Date.now()
          };
        } else {
          delete currentTabStates[tabId];
        }

        await chrome.storage.session.set({ tabVoiceStates: currentTabStates });
        const tabState = await getStoredTabState(tabId);
        const nextState = {
          ...tabState,
          listening: enabled,
          voiceMessage: enabled ? 'Listening' : 'Off',
          message: enabled ? 'Voice commands are active for this tab.' : 'Voice commands off'
        };
        await storeTabState(tabId, nextState);
        if (enabled) {
          await incrementUsageCounter('voiceSessions');
        }
        sendResponse({ success: true, state: nextState, tabId });
      } else {
        sendResponse({ success: false, error: response?.error || 'Content script error' });
      }
    } else {
      sendResponse({ success: false, error: 'No active tab found' });
    }
  } catch (error) {
    console.error('Error toggling voice:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Disable voice commands on all tabs except the specified one.
 */
async function disableVoiceOnAllOtherTabs(excludeTabId) {
  try {
    const tabVoiceStates = await chrome.storage.session.get(['tabVoiceStates']) || {};
    const currentTabStates = tabVoiceStates.tabVoiceStates || {};

    // Get all tabs that currently have voice enabled
    const enabledTabIds = Object.keys(currentTabStates);
    console.log(`Disabling voice on ${enabledTabIds.length} other tabs, excluding tab ${excludeTabId}`);

    // Process tabs sequentially to avoid conflicts
    for (const tabIdStr of enabledTabIds) {
      const tabId = parseInt(tabIdStr);
      if (tabId !== excludeTabId) {
        try {
          console.log(`Disabling voice commands on tab ${tabId}`);

          // Send disable command without injecting into pages that do not already have the content script.
          await sendMessageToExistingContentScript(tabId, {
            command: 'toggleVoice',
            enabled: false,
            tabSpecific: true,
            forceStop: true // Flag to indicate forced stop
          });

          // Remove from storage
          delete currentTabStates[tabId];
          console.log(`Successfully disabled voice on tab ${tabId}`);

        } catch (error) {
          console.warn(`Could not disable voice on tab ${tabId}:`, error.message);
          // Tab might be closed or not responding, just remove from storage
          delete currentTabStates[tabId];
        }

        // Small delay between tabs to prevent conflicts
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update storage with cleaned state
    await chrome.storage.session.set({ tabVoiceStates: currentTabStates });
    console.log('Voice commands cleanup completed');

  } catch (error) {
    console.error('Error disabling voice on other tabs:', error);
  }
}

/**
 * Show basic accessibility hints on active tab
 */
async function handleAccessibilityCheck(sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      const response = await sendMessageToTab(tabs[0].id, { command: 'checkAccessibility' });

      if (response?.success) {
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: response?.error || 'Content script error' });
      }
    } else {
      sendResponse({ success: false, error: 'No active tab found' });
    }
  } catch (error) {
    console.error('Error checking accessibility:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get current settings
 */
async function handleGetSettings(sendResponse) {
  try {
    const settings = await getRuntimeSettings();
    const tab = await getActiveTab();
    const site = await getSiteSettings(tab);
    const tabState = tab?.id ? await getStoredTabState(tab.id) : normalizeTabState({}, settings);
    const lastPositions = settings[STORAGE_KEYS.LAST_POSITIONS] || {};
    const resumePosition = tab?.url ? lastPositions[tab.url] : null;

    sendResponse({
      success: true,
      settings,
      currentSite: site.key,
      currentSiteSettings: site.settings,
      resumePosition: resumePosition && resumePosition.positionPercent > 5 && resumePosition.positionPercent < 95 ? resumePosition : null,
      tabState,
      tabId: tab?.id
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetTabState(sendResponse) {
  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    try {
      const response = await sendMessageToTab(tab.id, { command: 'getScrollState' });
      if (response?.state) {
        await storeTabState(tab.id, response.state);
        sendResponse({ success: true, state: response.state, tabId: tab.id });
        return;
      }
    } catch (error) {
      // The content script may not be available yet; use cached state.
    }

    sendResponse({ success: true, state: await getStoredTabState(tab.id), tabId: tab.id });
  } catch (error) {
    console.error('Error getting tab state:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Save settings
 */
async function handleSaveSettings(settings, sendResponse) {
  try {
    await chrome.storage.local.set(settings);
    const tab = await getActiveTab();
    if (tab?.id) {
      try {
        const nextSettings = await getRuntimeSettings();
        const site = await getSiteSettings(tab);
        const response = await sendMessageToTab(tab.id, {
          command: 'applyRuntimeSettings',
          settings: buildContentSettings(nextSettings, site.settings)
        });
        if (response?.state) {
          await storeTabState(tab.id, response.state);
        }
      } catch (error) {
        // Content script may not be available on the active tab.
      }
    }
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle basic accessibility hint report from content script
 */
function handleAccessibilityReport(data) {
  try {
    // Store the report for popup to display
    chrome.storage.session.set({
      accessibilityReport: data,
      reportTimestamp: Date.now()
    });

    // Log summary to console
    if (data.error) {
      console.error('Accessibility check failed:', data.error);
    } else {
      console.log(`Accessibility check completed for ${data.url}`);
      console.log(`Found ${data.violations.length} violations`);
      console.log(`Passed ${data.passes.length} checks`);

      if (data.violations.length > 0) {
        console.group('Basic accessibility hints:');
        data.violations.forEach(violation => {
          console.warn(`${violation.id}: ${violation.description} (Impact: ${violation.impact})`);
        });
        console.groupEnd();
      }
    }

    // Create notification for user
    const message = data.error
      ? 'Accessibility check failed'
      : data.violations.length === 0
        ? 'No basic accessibility hints found. This is not a full WCAG audit.'
        : `Found ${data.violations.length} basic accessibility hint${data.violations.length === 1 ? '' : 's'}. This is not a full WCAG audit.`;

    console.log('Accessibility Report:', message);

  } catch (error) {
    console.error('Error handling accessibility report:', error);
  }
}

/**
 * Handle voice command feedback from content script
 */
function handleVoiceCommandFeedback(commandText, success, feedback) {
  try {
    const commandLabel = toDisplayText(commandText, '');
    const feedbackLabel = toDisplayText(feedback, commandLabel || 'Voice command');

    // Store voice command feedback for popup
    chrome.storage.session.set({
      lastVoiceCommand: {
        text: commandLabel,
        success: Boolean(success),
        feedback: feedbackLabel,
        timestamp: Date.now()
      }
    });

    // Send to popup if it's open
    chrome.runtime.sendMessage({
      target: 'popup',
      command: 'updateVoiceStatus',
      data: {
        lastCommand: commandLabel,
        success: Boolean(success),
        feedback: feedbackLabel
      }
    }).catch(() => {
      // Popup might not be open, ignore error
    });

  } catch (error) {
    console.error('Error handling voice command feedback:', error);
  }
}

async function handleSaveSiteSettings(settings, sendResponse) {
  try {
    const tab = await getActiveTab();
    const siteKey = getSiteKey(tab?.url || '');
    if (!siteKey) {
      sendResponse({ success: false, error: 'Per-site settings are only available on regular websites.' });
      return;
    }

    const result = await chrome.storage.local.get([STORAGE_KEYS.PER_SITE_SETTINGS]);
    const allSiteSettings = result[STORAGE_KEYS.PER_SITE_SETTINGS] || {};
    allSiteSettings[siteKey] = {
      ...(allSiteSettings[siteKey] || {}),
      ...(settings || {})
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.PER_SITE_SETTINGS]: allSiteSettings });

    if (tab?.id) {
      const runtimeSettings = await getRuntimeSettings();
      const response = await sendMessageToTab(tab.id, {
        command: 'applyRuntimeSettings',
        settings: buildContentSettings(runtimeSettings, allSiteSettings[siteKey])
      });
      if (response?.state) {
        await storeTabState(tab.id, response.state);
      }
    }

    sendResponse({ success: true, site: siteKey, settings: allSiteSettings[siteKey] });
  } catch (error) {
    console.error('Error saving site settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleResetCurrentSite(sendResponse) {
  try {
    const tab = await getActiveTab();
    const siteKey = getSiteKey(tab?.url || '');
    const result = await chrome.storage.local.get([STORAGE_KEYS.PER_SITE_SETTINGS]);
    const allSiteSettings = result[STORAGE_KEYS.PER_SITE_SETTINGS] || {};
    if (siteKey && allSiteSettings[siteKey]) {
      delete allSiteSettings[siteKey];
      await chrome.storage.local.set({ [STORAGE_KEYS.PER_SITE_SETTINGS]: allSiteSettings });
    }
    sendResponse({ success: true, site: siteKey });
  } catch (error) {
    console.error('Error resetting site settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleClearLocalData(types = [], sendResponse) {
  try {
    const selectedTypes = Array.isArray(types) && types.length ? types : ['settings', 'sites', 'positions', 'aliases', 'counters'];
    const updates = {};

    if (selectedTypes.includes('settings')) {
      Object.assign(updates, DEFAULT_SETTINGS);
    }
    if (selectedTypes.includes('sites')) {
      updates[STORAGE_KEYS.PER_SITE_SETTINGS] = {};
    }
    if (selectedTypes.includes('positions')) {
      updates[STORAGE_KEYS.LAST_POSITIONS] = {};
    }
    if (selectedTypes.includes('aliases')) {
      updates[STORAGE_KEYS.VOICE_ALIASES] = {};
      updates[STORAGE_KEYS.DISABLED_COMMANDS] = {};
    }
    if (selectedTypes.includes('counters')) {
      updates[STORAGE_KEYS.USAGE_COUNTERS] = {};
    }

    await chrome.storage.local.set(updates);
    await chrome.storage.session.clear();
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error clearing local data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleExportSettings(sendResponse) {
  try {
    const settings = await chrome.storage.local.get(null);
    sendResponse({
      success: true,
      settings: {
        exportedAt: new Date().toISOString(),
        extensionVersion: chrome.runtime.getManifest().version,
        settings
      }
    });
  } catch (error) {
    console.error('Error exporting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleImportSettings(settings, sendResponse) {
  try {
    const importedSettings = settings?.settings || settings;
    if (!importedSettings || typeof importedSettings !== 'object') {
      sendResponse({ success: false, error: 'Invalid settings import.' });
      return;
    }
    await chrome.storage.local.set(importedSettings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error importing settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function incrementUsageCounter(key) {
  const result = await chrome.storage.local.get([STORAGE_KEYS.USAGE_COUNTERS]);
  const counters = result[STORAGE_KEYS.USAGE_COUNTERS] || {};
  counters[key] = (Number(counters[key]) || 0) + 1;
  counters.updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ [STORAGE_KEYS.USAGE_COUNTERS]: counters });
}

/**
 * Handle voice status updates from content script
 */
async function handleVoiceFeedback(message, commandType, tabId) {
  try {
    const statusText = toDisplayText(message, 'Voice command');
    const typeText = toDisplayText(commandType, 'info');
    const enabled = !/(disabled|off|denied|blocked|not allowed|not supported|failed)/i.test(statusText);

    await chrome.storage.session.set({
      voiceStatus: statusText,
      voiceStatusType: typeText,
      voiceStatusEnabled: enabled,
      voiceStatusTimestamp: Date.now()
    });

    chrome.runtime.sendMessage({
      target: 'popup',
      command: 'updateVoiceStatus',
      data: {
        status: statusText,
        enabled,
        type: typeText,
        tabId,
        timestamp: Date.now()
      }
    }).catch(() => {
      // Popup might not be open.
    });

    if (tabId) {
      const tabState = await getStoredTabState(tabId);
      await storeTabState(tabId, {
        ...tabState,
        listening: enabled,
        voiceMessage: statusText,
        message: enabled ? tabState.message : statusText
      });
    }
  } catch (error) {
    console.error('Error handling voice feedback:', error);
  }
}

async function handleScrollStateUpdate(state, tabId, transient = false) {
  try {
    if (!tabId || !state) return;
    await storeTabState(tabId, state);
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab?.url && /^https?:/i.test(tab.url) && typeof state.positionPercent === 'number') {
      const now = Date.now();
      const persistKey = `${tabId}:${tab.url}`;
      const lastPersistedAt = positionPersistTimes.get(persistKey) || 0;
      const shouldPersistPosition = !transient || now - lastPersistedAt >= POSITION_PERSIST_INTERVAL_MS;
      const shouldPersistSiteSettings = !transient &&
        (Boolean(state.scrollContainerSelector) || Boolean(state.hudPosition && typeof state.hudPosition === 'object'));

      if (!shouldPersistPosition && !shouldPersistSiteSettings) {
        return;
      }

      const result = await chrome.storage.local.get([
        STORAGE_KEYS.LAST_POSITIONS,
        STORAGE_KEYS.PER_SITE_SETTINGS
      ]);
      const updates = {};

      if (shouldPersistPosition) {
        const lastPositions = result[STORAGE_KEYS.LAST_POSITIONS] || {};
        lastPositions[tab.url] = {
          positionPercent: Math.max(0, Math.min(100, state.positionPercent)),
          target: toDisplayText(state.target, 'page'),
          updatedAt: now
        };
        updates[STORAGE_KEYS.LAST_POSITIONS] = lastPositions;
        positionPersistTimes.set(persistKey, now);
      }

      if (state.scrollContainerSelector && !transient) {
        const siteKey = getSiteKey(tab.url);
        if (siteKey) {
          const perSiteSettings = result[STORAGE_KEYS.PER_SITE_SETTINGS] || {};
          perSiteSettings[siteKey] = {
            ...(perSiteSettings[siteKey] || {}),
            scrollContainerSelector: state.scrollContainerSelector
          };
          updates[STORAGE_KEYS.PER_SITE_SETTINGS] = perSiteSettings;
        }
      }
      if (state.hudPosition && typeof state.hudPosition === 'object' && !transient) {
        const siteKey = getSiteKey(tab.url);
        if (siteKey) {
          const perSiteSettings = updates[STORAGE_KEYS.PER_SITE_SETTINGS] || result[STORAGE_KEYS.PER_SITE_SETTINGS] || {};
          perSiteSettings[siteKey] = {
            ...(perSiteSettings[siteKey] || {}),
            hudPosition: {
              x: Math.max(0, Number(state.hudPosition.x) || 0),
              y: Math.max(0, Number(state.hudPosition.y) || 0)
            }
          };
          updates[STORAGE_KEYS.PER_SITE_SETTINGS] = perSiteSettings;
        }
      }
      if (Object.keys(updates).length > 0) {
        await chrome.storage.local.set(updates);
      }
    }
  } catch (error) {
    console.error('Error handling scroll state update:', error);
  }
}

async function handleMiniControllerClosed(state, tabId) {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.READING_MODE]: 'custom',
      [STORAGE_KEYS.MINI_CONTROLLER_ENABLED]: false,
      [STORAGE_KEYS.HUD_ENABLED]: false
    });

    if (tabId) {
      await storeTabState(tabId, {
        ...(state || await getStoredTabState(tabId)),
        readingMode: 'custom',
        miniControllerEnabled: false,
        hudEnabled: false
      });
    }
  } catch (error) {
    console.error('Error handling HUD close:', error);
  }
}

function handleVoiceStatusUpdate(status, enabled, tabId) {
  try {
    const statusText = toDisplayText(status, enabled ? 'Listening' : 'Off');
    const isEnabled = Boolean(enabled);
    console.log(`Voice status update: ${statusText}, enabled: ${isEnabled}`);

    // Store voice status for popup
    chrome.storage.session.set({
      voiceStatus: statusText,
      voiceStatusEnabled: isEnabled,
      voiceStatusTimestamp: Date.now()
    });

    // Send to popup if it's open
    chrome.runtime.sendMessage({
      target: 'popup',
      command: 'updateVoiceStatus',
      data: {
        status: statusText,
        enabled: isEnabled,
        tabId,
        timestamp: Date.now()
      }
    }).catch(() => {
      // Popup might not be open, ignore error
    });

    if (tabId) {
      getStoredTabState(tabId).then((state) => {
        storeTabState(tabId, {
          ...state,
          listening: isEnabled,
          voiceMessage: statusText,
          message: statusText
        });
      }).catch(() => {});
    }

  } catch (error) {
    console.error('Error handling voice status update:', error);
  }
}

/**
 * Clean up voice states when tabs are closed
 */
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const tabVoiceStates = await chrome.storage.session.get(['tabVoiceStates']) || {};
    const currentTabStates = tabVoiceStates.tabVoiceStates || {};
    const tabScrollStatesResult = await chrome.storage.session.get(['tabScrollStates']) || {};
    const tabScrollStates = tabScrollStatesResult.tabScrollStates || {};

    if (currentTabStates[tabId]) {
      delete currentTabStates[tabId];
      await chrome.storage.session.set({ tabVoiceStates: currentTabStates });
      console.log(`Cleaned up voice state for closed tab ${tabId}`);
    }

    if (tabScrollStates[tabId]) {
      delete tabScrollStates[tabId];
      await chrome.storage.session.set({ tabScrollStates });
    }
  } catch (error) {
    console.error('Error cleaning up tab voice state:', error);
  }
});

/**
 * Clean up voice states when tabs are updated (e.g., navigation)
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  // When a tab navigates to a new page, disable voice commands.
  if (changeInfo.status === 'loading' || changeInfo.url) {
    try {
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      const tabVoiceStates = await chrome.storage.session.get(['tabVoiceStates']) || {};
      const currentTabStates = tabVoiceStates.tabVoiceStates || {};
      const tabScrollStatesResult = await chrome.storage.session.get(['tabScrollStates']) || {};
      const tabScrollStates = tabScrollStatesResult.tabScrollStates || {};

      if (currentTabStates[tabId]) {
        await sendMessageToExistingContentScript(tabId, {
          command: 'toggleVoice',
          enabled: false,
          tabSpecific: true,
          forceStop: true,
          reason: 'navigation'
        });
        delete currentTabStates[tabId];
        await chrome.storage.session.set({ tabVoiceStates: currentTabStates });
        console.log(`Disabled voice commands for tab ${tabId} due to navigation`);
      }

      if (tabScrollStates[tabId]) {
        tabScrollStates[tabId] = normalizeTabState({
          ...tabScrollStates[tabId],
          status: 'stopped',
          isScrolling: false,
          isPaused: false,
          hasActiveSession: false,
          listening: false,
          voiceMessage: 'Off',
          positionPercent: 0,
          lastKnownUrl: tab?.url || changeInfo.url || '',
          message: 'Voice commands turned off after navigation'
        });
        await chrome.storage.session.set({ tabScrollStates });
        notifyPopupScrollState(tabId, tabScrollStates[tabId]);
      }
    } catch (error) {
      console.error('Error handling tab navigation:', error);
    }
  }
});
