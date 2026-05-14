/**
 * ScrollHandsFree - Popup Script
 * Controls the active tab like a compact reading remote.
 */

(() => {
  'use strict';

  const SPEED_PRESETS = {
    slow: 20,
    reading: 45,
    fast: 75,
    skim: 100
  };

  const READING_MODE_PRESETS = {
    custom: { speed: null, endBehavior: null },
    article: { speed: 45, endBehavior: 'stop' },
    recipe: { speed: 25, endBehavior: 'stop' },
    documentation: { speed: 38, endBehavior: 'stop' },
    study: { speed: 30, endBehavior: 'stop' },
    fastSkim: { speed: 85, endBehavior: 'stop' },
    teleprompter: { speed: 32, endBehavior: 'stop' }
  };

  const DEFAULT_STATE = {
    status: 'stopped',
    isScrolling: false,
    isPaused: false,
    hasActiveSession: false,
    currentSpeed: 50,
    direction: 1,
    endBehavior: 'stop',
    readingMode: 'custom',
    focusBandEnabled: false,
    miniControllerEnabled: false,
    hudEnabled: false,
    focusBandHeight: 24,
    focusDimOpacity: 0.08,
    autoPauseAtHeadings: false,
    autoPauseOnUserScroll: true,
    readingRhythm: 'smooth',
    target: 'page',
    positionPercent: 0,
    timeRemainingSeconds: 0,
    currentHeading: '',
    listening: false,
    message: 'Ready on this page',
    voiceMessage: 'Off',
    voiceSetupSeen: false,
    onboardingSeen: false,
    whatsNewSeenVersion: '',
    resumePosition: null
  };

  const CURRENT_VERSION = typeof chrome !== 'undefined' && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest().version
    : 'dev';

  let state = { ...DEFAULT_STATE };
  let activeTabId = null;

  const els = {};

  document.addEventListener('DOMContentLoaded', () => {
    try {
      initializeDOMElements();
      setupEventListeners();
      loadSettings();
      chrome.runtime.onMessage.addListener(handleBackgroundMessage);
    } catch (error) {
      console.error('Error initializing popup:', error);
      showStatus('Popup error', 'error');
    }
  });

  function initializeDOMElements() {
    const ids = [
      'statusDisplay',
      'pageStatus',
      'targetStatus',
      'progressPercent',
      'timeRemaining',
      'progressFill',
      'startBtn',
      'stopBtn',
      'scrollUpBtn',
      'scrollDownBtn',
      'speedSlider',
      'speedValue',
      'endBehaviorSelect',
      'readingModeSelect',
      'voiceToggle',
      'voiceStatusText',
      'commandsBtn',
      'commandsPanel',
      'focusBandToggle',
      'miniControllerToggle',
      'privacyBtn',
      'privacyPanel',
      'optionsLink',
      'issueLink',
      'onboardingPanel',
      'dismissOnboardingBtn',
      'whatsNewPanel',
      'dismissWhatsNewBtn',
      'resumePanel',
      'resumeText',
      'resumeBtn',
      'dismissResumeBtn',
      'chooseAreaBtn',
      'jumpHeadingBtn',
      'backParagraphBtn',
      'jumpTopBtn',
      'jumpBottomBtn',
      'hintsBtn',
      'hintsPanel',
      'hintsSummary',
      'hintsList',
      'helpLink',
      'voiceSetupDialog',
      'voiceSetupCancelBtn',
      'voiceSetupContinueBtn'
    ];

    ids.forEach((id) => {
      els[id] = document.getElementById(id);
    });

    els.presetButtons = Array.from(document.querySelectorAll('.preset-btn'));

    const required = [
      'statusDisplay',
      'startBtn',
      'stopBtn',
      'scrollUpBtn',
      'scrollDownBtn',
      'speedSlider',
      'speedValue',
      'endBehaviorSelect',
      'readingModeSelect',
      'voiceToggle',
      'focusBandToggle',
      'miniControllerToggle'
    ];

    const missing = required.filter((id) => !els[id]);
    if (missing.length) {
      throw new Error(`Missing popup elements: ${missing.join(', ')}`);
    }
  }

  function setupEventListeners() {
    els.startBtn.addEventListener('click', handleMainControlClick);
    els.stopBtn.addEventListener('click', handleStopClick);
    els.scrollUpBtn.addEventListener('click', () => handleDirectionClick(-1));
    els.scrollDownBtn.addEventListener('click', () => handleDirectionClick(1));
    els.speedSlider.addEventListener('input', handleSpeedChange);
    els.endBehaviorSelect.addEventListener('change', handleEndBehaviorChange);
    els.readingModeSelect.addEventListener('change', handleReadingModeChange);

    els.presetButtons.forEach((button) => {
      button.addEventListener('click', () => handlePresetClick(button.dataset.preset));
    });

    els.voiceToggle.addEventListener('click', handleVoiceToggle);
    els.voiceToggle.addEventListener('keydown', handleToggleKeydown);
    els.focusBandToggle.addEventListener('click', handleFocusBandToggle);
    els.focusBandToggle.addEventListener('keydown', handleToggleKeydown);
    els.miniControllerToggle.addEventListener('click', handleMiniControllerToggle);
    els.miniControllerToggle.addEventListener('keydown', handleToggleKeydown);

    if (els.commandsBtn) {
      els.commandsBtn.addEventListener('click', () => {
        els.commandsPanel.hidden = !els.commandsPanel.hidden;
      });
    }

    if (els.privacyBtn) {
      els.privacyBtn.addEventListener('click', () => {
        els.privacyPanel.hidden = !els.privacyPanel.hidden;
      });
    }

    if (els.optionsLink) {
      els.optionsLink.addEventListener('click', () => chrome.runtime.openOptionsPage());
    }

    if (els.issueLink) {
      els.issueLink.addEventListener('click', (event) => {
        event.preventDefault();
        chrome.tabs.create({ url: els.issueLink.href });
      });
    }

    if (els.helpLink) {
      els.helpLink.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
      });
    }

    if (els.dismissOnboardingBtn) {
      els.dismissOnboardingBtn.addEventListener('click', dismissOnboarding);
    }

    if (els.dismissWhatsNewBtn) {
      els.dismissWhatsNewBtn.addEventListener('click', dismissWhatsNew);
    }

    if (els.voiceSetupCancelBtn) {
      els.voiceSetupCancelBtn.addEventListener('click', hideVoiceSetup);
    }

    if (els.voiceSetupContinueBtn) {
      els.voiceSetupContinueBtn.addEventListener('click', enableVoiceAfterSetup);
    }

    els.resumeBtn?.addEventListener('click', handleResumeClick);
    els.dismissResumeBtn?.addEventListener('click', () => {
      if (els.resumePanel) els.resumePanel.hidden = true;
    });
    els.chooseAreaBtn?.addEventListener('click', () => runCommand({ command: 'chooseScrollArea' }, 'Could not start area selection'));
    els.jumpHeadingBtn?.addEventListener('click', () => runCommand({ command: 'jumpToNextHeading' }, 'Could not jump to next heading'));
    els.backParagraphBtn?.addEventListener('click', () => runCommand({ command: 'jumpBackParagraph' }, 'Could not jump back'));
    els.jumpTopBtn?.addEventListener('click', () => runCommand({ command: 'jumpToTop' }, 'Could not jump to top'));
    els.jumpBottomBtn?.addEventListener('click', () => runCommand({ command: 'jumpToBottom' }, 'Could not jump to bottom'));
    els.hintsBtn?.addEventListener('click', handleHintsClick);
  }

  async function loadSettings() {
    try {
      const response = await sendMessage({ command: 'getSettings' });
      if (!response?.success) {
        throw new Error(response?.error || 'Unable to read settings');
      }

      activeTabId = response.tabId || null;
      const settings = response.settings || {};
      state = sanitizeState({
        ...DEFAULT_STATE,
        currentSpeed: settings.currentSpeed || settings.defaultSpeed || DEFAULT_STATE.currentSpeed,
        endBehavior: settings.endBehavior || DEFAULT_STATE.endBehavior,
        readingMode: settings.readingMode || DEFAULT_STATE.readingMode,
        focusBandEnabled: settings.focusBandEnabled === true,
        miniControllerEnabled: settings.miniControllerEnabled === true,
        hudEnabled: settings.hudEnabled === true,
        focusBandHeight: Number(settings.focusBandHeight) || DEFAULT_STATE.focusBandHeight,
        focusDimOpacity: Number(settings.focusDimOpacity) || DEFAULT_STATE.focusDimOpacity,
        autoPauseAtHeadings: settings.smartPausing === true,
        autoPauseOnUserScroll: settings.autoPauseOnUserScroll !== false,
        voiceSetupSeen: settings.voiceSetupSeen === true,
        onboardingSeen: settings.onboardingSeen === true,
        whatsNewSeenVersion: settings.whatsNewSeenVersion || '',
        ...(response.tabState || {})
      });
      state.resumePosition = response.resumePosition || null;

      if (!state.onboardingSeen && els.onboardingPanel) {
        els.onboardingPanel.hidden = false;
      }

      if (state.whatsNewSeenVersion !== CURRENT_VERSION && els.whatsNewPanel) {
        els.whatsNewPanel.hidden = false;
      }

      updateResumePanel();

      updateUI();
    } catch (error) {
      console.error('Error loading settings:', error);
      showStatus('Unsupported page', 'error');
      updatePageStatus('This page does not allow extensions to run.', 'Open a regular webpage');
    }
  }

  async function handleMainControlClick() {
    if (state.status === 'scrolling' || state.isScrolling) {
      await runCommand({ command: 'pauseScroll' }, 'Error pausing');
      return;
    }

    await runCommand({
      command: 'startScroll',
      speed: state.currentSpeed,
      direction: state.direction,
      endBehavior: state.endBehavior
    }, "Couldn't start scrolling on this page.");
  }

  async function handleStopClick() {
    await runCommand({ command: 'stopScroll' }, 'Error stopping');
  }

  async function handleDirectionClick(direction) {
    state.direction = direction;
    updateUI();

    await runCommand({
      command: 'startScroll',
      speed: state.currentSpeed,
      direction,
      endBehavior: state.endBehavior
    }, "Couldn't start scrolling on this page.");
  }

  async function handleSpeedChange(event) {
    const newSpeed = clampSpeed(event.target.value);
    state.currentSpeed = newSpeed;
    state.readingMode = 'custom';
    updateUI();
    await runCommand({ command: 'setSpeed', speed: newSpeed }, 'Error setting speed', false);
  }

  async function handlePresetClick(preset) {
    if (!Object.prototype.hasOwnProperty.call(SPEED_PRESETS, preset)) {
      return;
    }

    state.currentSpeed = SPEED_PRESETS[preset];
    state.readingMode = 'custom';
    updateUI();
    await runCommand({ command: 'setSpeedPreset', preset }, 'Error setting speed', false);
  }

  async function handleEndBehaviorChange(event) {
    state.endBehavior = event.target.value;
    state.readingMode = 'custom';
    updateUI();
    await runCommand({
      command: 'setEndBehavior',
      endBehavior: state.endBehavior
    }, 'Error setting end behavior', false);
  }

  async function handleReadingModeChange(event) {
    const mode = event.target.value;
    if (!Object.prototype.hasOwnProperty.call(READING_MODE_PRESETS, mode)) {
      return;
    }

    state.readingMode = mode;
    const preset = READING_MODE_PRESETS[mode];
    if (typeof preset.speed === 'number') {
      state.currentSpeed = preset.speed;
    }
    if (preset.endBehavior) {
      state.endBehavior = preset.endBehavior;
    }
    updateUI();
    await runCommand({ command: 'setReadingMode', mode }, 'Error setting reading mode', false);
  }

  async function handleFocusBandToggle() {
    state.focusBandEnabled = !state.focusBandEnabled;
    state.readingMode = 'custom';
    updateUI();
    await runCommand({
      command: 'setFocusBand',
      enabled: state.focusBandEnabled
    }, 'Error toggling focus band');
  }

  async function handleMiniControllerToggle() {
    const enabled = !(state.miniControllerEnabled || state.hudEnabled);
    state.miniControllerEnabled = enabled;
    state.hudEnabled = enabled;
    state.readingMode = 'custom';
    updateUI();
    await runCommand({
      command: 'setMiniController',
      enabled
    }, 'Error toggling HUD');
  }

  async function handleVoiceToggle() {
    const nextListening = !state.listening;

    if (nextListening && !state.voiceSetupSeen) {
      showVoiceSetup();
      return;
    }

    await setVoiceListening(nextListening);
  }

  async function setVoiceListening(enabled) {
    state.listening = enabled;
    state.voiceMessage = enabled ? 'Listening' : 'Off';
    state.message = enabled ? 'Voice commands are active for this tab.' : 'Voice commands off';
    updateUI();

    await runCommand({
      command: 'toggleVoice',
      enabled
    }, 'Error toggling voice');
  }

  async function handleResumeClick() {
    if (!state.resumePosition) {
      return;
    }
    await runCommand({
      command: 'resumePosition',
      positionPercent: state.resumePosition.positionPercent
    }, 'Could not resume position');
    if (els.resumePanel) {
      els.resumePanel.hidden = true;
    }
  }

  async function handleHintsClick() {
    if (els.hintsPanel) {
      els.hintsPanel.hidden = false;
    }
    if (els.hintsSummary) {
      els.hintsSummary.textContent = 'Scanning basic accessibility hints...';
    }
    if (els.hintsList) {
      els.hintsList.textContent = '';
    }

    const response = await runCommand({ command: 'getAccessibilityHints' }, 'Could not show accessibility hints', false);
    const hints = response?.hints || {};
    const violations = Array.isArray(hints.violations) ? hints.violations : [];
    if (els.hintsSummary) {
      els.hintsSummary.textContent = hints.summary || 'No basic issues found. This is not a full WCAG audit.';
    }
    if (els.hintsList) {
      els.hintsList.textContent = '';
      violations.slice(0, 6).forEach((violation) => {
        const item = document.createElement('span');
        item.className = 'command-chip';
        item.textContent = textFromValue(violation.description, violation.id || 'Hint');
        els.hintsList.appendChild(item);
      });
    }
  }

  function handleToggleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.target.click();
    }
  }

  function showVoiceSetup() {
    if (els.voiceSetupDialog) {
      els.voiceSetupDialog.hidden = false;
      els.voiceSetupContinueBtn?.focus();
    }
  }

  function hideVoiceSetup() {
    if (els.voiceSetupDialog) {
      els.voiceSetupDialog.hidden = true;
    }
    updateUI();
  }

  async function enableVoiceAfterSetup() {
    try {
      await sendMessage({
        command: 'saveSettings',
        settings: { voiceSetupSeen: true }
      });
      state.voiceSetupSeen = true;
      hideVoiceSetup();
      await setVoiceListening(true);
    } catch (error) {
      console.error('Error saving voice setup acknowledgement:', error);
      hideVoiceSetup();
      showStatus('Voice setup failed', 'error');
    }
  }

  async function dismissOnboarding() {
    state.onboardingSeen = true;
    if (els.onboardingPanel) {
      els.onboardingPanel.hidden = true;
    }

    try {
      await sendMessage({
        command: 'saveSettings',
        settings: { onboardingSeen: true }
      });
    } catch (error) {
      console.warn('Could not save onboarding state:', error);
    }
  }

  async function dismissWhatsNew() {
    state.whatsNewSeenVersion = CURRENT_VERSION;
    if (els.whatsNewPanel) {
      els.whatsNewPanel.hidden = true;
    }

    try {
      await sendMessage({
        command: 'saveSettings',
        settings: { whatsNewSeenVersion: CURRENT_VERSION }
      });
    } catch (error) {
      console.warn('Could not save what is new state:', error);
    }
  }

  async function runCommand(message, errorText, showErrors = true) {
    try {
      const response = await sendMessage(message);
      if (response?.success) {
        activeTabId = response.tabId || activeTabId;
        if (response.state) {
          state = sanitizeState({ ...state, ...response.state });
        }
        updateUI();
        return response;
      }

      throw new Error(textFromValue(response?.error, 'Command failed'));
    } catch (error) {
      console.error(errorText, error);
      if (showErrors) {
        showStatus(errorText, 'error');
        updatePageStatus('Cannot run on this page', 'Chrome restricted this tab');
      }
      return null;
    }
  }

  function updateUI() {
    state = sanitizeState(state);

    els.speedSlider.value = state.currentSpeed;
    els.speedValue.textContent = `${state.currentSpeed} px/sec`;
    els.endBehaviorSelect.value = state.endBehavior || 'stop';
    els.readingModeSelect.value = state.readingMode || 'custom';

    const isScrolling = state.status === 'scrolling' || state.isScrolling;
    const isPaused = state.status === 'paused' || state.isPaused;
    const isEnded = state.status === 'ended';
    const hasSession = state.hasActiveSession || isScrolling || isPaused || isEnded;

    els.startBtn.textContent = isScrolling ? 'Pause' : (isPaused || hasSession ? 'Resume' : 'Start scrolling');
    els.startBtn.disabled = false;
    els.stopBtn.disabled = !hasSession && state.message !== 'Stopped';

    setButtonActive(els.scrollUpBtn, state.direction === -1);
    setButtonActive(els.scrollDownBtn, state.direction !== -1);

    els.presetButtons.forEach((button) => {
      const presetSpeed = SPEED_PRESETS[button.dataset.preset];
      button.classList.toggle('active', presetSpeed === state.currentSpeed);
    });

    updateToggleState(els.voiceToggle, Boolean(state.listening));
    updateToggleState(els.focusBandToggle, Boolean(state.focusBandEnabled));
    updateToggleState(els.miniControllerToggle, Boolean(state.miniControllerEnabled || state.hudEnabled));
    updateStatusDisplay();
    updateVoiceStatusDisplay();
    updatePageStatusFromState();
    updateProgressDisplay();
    updateResumePanel();
  }

  function updateStatusDisplay() {
    const label = getStatusLabel();
    const tone = getStatusTone(label);
    showStatus(label, tone);
  }

  function getStatusLabel() {
    const message = textFromValue(state.message, 'Ready');

    if (state.status === 'scrolling' || state.isScrolling) {
      return 'Scrolling';
    }

    if (state.status === 'paused' || state.isPaused) {
      return 'Paused';
    }

    if (state.status === 'ended') {
      return message || 'Reached end';
    }

    if (state.listening) {
      return 'Listening';
    }

    if (message === 'Stopped') {
      return 'Stopped';
    }

    return 'Ready on this page';
  }

  function getStatusTone(label) {
    const text = textFromValue(label, '').toLowerCase();
    if (/(error|cannot|unable|blocked|denied|no scrollable)/.test(text)) {
      return 'error';
    }
    if (state.status === 'scrolling' || state.isScrolling) {
      return 'scrolling';
    }
    if (state.listening) {
      return 'listening';
    }
    if (state.status === 'paused' || state.isPaused || state.status === 'ended') {
      return 'paused';
    }
    return 'ready';
  }

  function updatePageStatusFromState() {
    const message = textFromValue(state.message, '');
    const lowerMessage = message.toLowerCase();
    const target = state.target && state.target !== 'page'
      ? textFromValue(state.target, 'Scroll area')
      : 'Page';

    if (lowerMessage.includes('no scrollable area')) {
      updatePageStatus('No scrollable content detected.', target);
      return;
    }

    if (lowerMessage.includes('already short')) {
      updatePageStatus('This page is already short.', 'Auto-scroll may not be useful');
      return;
    }

    if (/(error|cannot|unable|blocked|denied)/.test(lowerMessage)) {
      updatePageStatus('Cannot run on this page', message);
      return;
    }

    if (state.status === 'ended') {
      updatePageStatus(message || 'Reached end', `${state.positionPercent}%`);
      return;
    }

    if (state.status === 'scrolling' || state.status === 'paused') {
      const timeLabel = state.timeRemainingSeconds ? ` · ${formatDuration(state.timeRemainingSeconds)} left` : '';
      updatePageStatus('Works on this tab', `${target} · ${state.positionPercent}%${timeLabel}`);
      return;
    }

    updatePageStatus('Works on this tab', target);
  }

  function updateProgressDisplay() {
    const percent = Math.max(0, Math.min(100, Math.round(Number(state.positionPercent) || 0)));
    const hasReadableTime = Number(state.timeRemainingSeconds) > 0 && (state.status === 'scrolling' || state.status === 'paused');

    if (els.progressPercent) {
      els.progressPercent.textContent = `${percent}%`;
    }

    if (els.timeRemaining) {
      if (state.status === 'paused') {
        els.timeRemaining.textContent = hasReadableTime
          ? `Paused · ${formatDuration(state.timeRemainingSeconds)} left`
          : 'Paused';
      } else if (state.status === 'ended') {
        els.timeRemaining.textContent = 'Reached end';
      } else {
        els.timeRemaining.textContent = hasReadableTime
          ? `${formatDuration(state.timeRemainingSeconds)} left`
          : 'Time left --';
      }
    }

    if (els.progressFill) {
      els.progressFill.style.width = `${percent}%`;
    }
  }

  function updateResumePanel() {
    if (!els.resumePanel || !state.resumePosition) {
      return;
    }

    const percent = Math.round(Number(state.resumePosition.positionPercent) || 0);
    if (percent <= 5 || percent >= 95 || state.hasActiveSession) {
      els.resumePanel.hidden = true;
      return;
    }

    els.resumePanel.hidden = false;
    if (els.resumeText) {
      const heading = textFromValue(state.resumePosition.heading, '');
      els.resumeText.textContent = heading
        ? `Resume from ${percent}% near "${heading}"? Stored locally.`
        : `Resume from ${percent}%? Stored locally.`;
    }
  }

  function updatePageStatus(label, detail) {
    if (els.pageStatus) {
      els.pageStatus.querySelector('strong').textContent = textFromValue(label, 'Works on this tab');
    }
    if (els.targetStatus) {
      els.targetStatus.textContent = textFromValue(detail, 'Page');
    }
  }

  function updateVoiceStatusDisplay() {
    if (!els.voiceStatusText) {
      return;
    }

    const voiceMessage = textFromValue(state.voiceMessage, '');
    if (!state.listening) {
      els.voiceStatusText.textContent = voiceMessage && voiceMessage !== 'Listening' ? voiceMessage : 'Off';
      return;
    }

    const lower = voiceMessage.toLowerCase();
    if (lower.includes('not recognized')) {
      els.voiceStatusText.textContent = "I didn't catch a command";
    } else if (lower.includes('denied') || lower.includes('blocked') || lower.includes('not allowed')) {
      els.voiceStatusText.textContent = 'Microphone permission denied';
    } else if (voiceMessage && voiceMessage !== 'Voice commands are active for this tab.') {
      els.voiceStatusText.textContent = voiceMessage;
    } else {
      els.voiceStatusText.textContent = 'Listening';
    }
  }

  function showStatus(message, tone = 'ready') {
    els.statusDisplay.textContent = textFromValue(message, 'Ready');
    els.statusDisplay.className = `status-pill ${tone}`;
  }

  function updateToggleState(toggleElement, enabled) {
    if (!toggleElement) {
      return;
    }
    toggleElement.classList.toggle('active', enabled);
    toggleElement.setAttribute('aria-checked', enabled ? 'true' : 'false');
  }

  function setButtonActive(button, active) {
    if (!button) {
      return;
    }
    button.classList.toggle('active', active);
  }

  function sanitizeState(rawState = {}) {
    const next = { ...DEFAULT_STATE, ...rawState };
    next.status = textFromValue(next.status, DEFAULT_STATE.status);
    next.currentSpeed = clampSpeed(next.currentSpeed);
    next.direction = next.direction === -1 ? -1 : 1;
    next.endBehavior = ['stop', 'loop', 'reverse'].includes(next.endBehavior) ? next.endBehavior : 'stop';
    next.readingMode = Object.prototype.hasOwnProperty.call(READING_MODE_PRESETS, next.readingMode) ? next.readingMode : 'custom';
    next.target = textFromValue(next.target, 'page');
    next.message = textFromValue(next.message, 'Ready on this page');
    next.voiceMessage = textFromValue(next.voiceMessage || next.message, next.listening ? 'Listening' : 'Off');
    next.positionPercent = Math.max(0, Math.min(100, Number(next.positionPercent) || 0));
    next.timeRemainingSeconds = Math.max(0, Number(next.timeRemainingSeconds) || 0);
    next.currentHeading = textFromValue(next.currentHeading, '');
    return next;
  }

  function formatDuration(seconds) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    if (safeSeconds < 60) return `${safeSeconds}s`;
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }

  function textFromValue(value, fallback = '') {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value && typeof value === 'object') {
      const preferred = value.message ?? value.status ?? value.feedback ?? value.text ?? value.error ?? value.command;
      if (preferred !== undefined) {
        return textFromValue(preferred, fallback);
      }
    }
    return fallback;
  }

  function clampSpeed(speed) {
    const parsed = parseInt(speed, 10);
    if (Number.isNaN(parsed)) {
      return DEFAULT_STATE.currentSpeed;
    }
    return Math.max(1, Math.min(100, parsed));
  }

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ ...message, target: 'background' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function handleBackgroundMessage(message) {
    try {
      if (!message?.command || (message.target && message.target !== 'popup')) {
        return;
      }

      if (message.command === 'updateScrollState') {
        if (!activeTabId || !message.tabId || message.tabId === activeTabId) {
          state = sanitizeState({ ...state, ...(message.state || {}) });
          activeTabId = message.tabId || activeTabId;
          updateUI();
        }
      }

      if (message.command === 'updateVoiceStatus') {
        const data = message.data || {};
        if (!activeTabId || !data.tabId || data.tabId === activeTabId) {
          const nextListening = typeof data.enabled === 'boolean' ? data.enabled : state.listening;
          const voiceMessage = data.status || data.feedback || data.lastCommand || state.voiceMessage;
          state = sanitizeState({
            ...state,
            listening: nextListening,
            voiceMessage,
            message: data.status && nextListening ? data.status : state.message
          });
          updateUI();
        }
      }
    } catch (error) {
      console.error('Error handling background message:', error);
    }
  }
})();
