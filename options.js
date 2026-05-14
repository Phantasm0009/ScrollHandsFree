
(() => {
  'use strict';

  // DOM elements
  let optionsForm, saveBtn, resetBtn, successMessage, errorMessage;
  let defaultSpeed;
  let pauseAtHeadings, smartPausing, autoPauseOnUserScroll, endBehavior;
  let voiceLanguage, focusBandEnabled, miniControllerEnabled;
  let defaultDirection, hudEnabled, focusBandHeight, focusDimOpacity, readingRhythm;
  let startAliases, pauseAliases, stopAliases, fasterAliases, slowerAliases;
  let disableStartCommand, disablePauseCommand, disableStopCommand, disableFasterCommand, disableSlowerCommand, aliasConflictWarning;
  let voiceTestPhrase, voiceTestBtn, voiceTestResult;
  let currentSiteLabel, siteBlocked, siteSpeed, siteFocusBandEnabled, siteHudEnabled, importExportBox, diagnosticsBox;
  let usageCountersSummary;
  let saveSiteBtn, resetSiteBtn, exportSettingsBtn, importSettingsBtn, clearPositionsBtn, clearAllBtn, diagnosticsBtn;
  let currentSite = '';

  // Default settings
  const DEFAULT_SETTINGS = {
    defaultSpeed: 50,
    currentSpeed: 50,
    pauseAtHeadings: 2,
    smartPausing: false,
    endBehavior: 'stop',
    autoPauseOnUserScroll: true,
    voiceLanguage: 'auto',
    focusBandEnabled: false,
    miniControllerEnabled: false,
    defaultDirection: 1,
    hudEnabled: false,
    focusBandHeight: 24,
    focusDimOpacity: 0.08,
    readingRhythm: 'smooth',
    voiceAliases: {},
    disabledCommands: {}
  };

  /**
   * Initialize options page when DOM is loaded
   */
  document.addEventListener('DOMContentLoaded', () => {
    try {
      initializeDOMElements();
      setupEventListeners();
      loadSettings();
      console.log('ScrollHands Free options page initialized');
    } catch (error) {
      console.error('Error initializing options page:', error);
      showErrorMessage('Failed to initialize options page');
    }
  });

  /**
   * Get references to DOM elements
   */
  function initializeDOMElements() {
    optionsForm = document.getElementById('optionsForm');
    saveBtn = document.getElementById('saveBtn');
    resetBtn = document.getElementById('resetBtn');
    successMessage = document.getElementById('successMessage');
    errorMessage = document.getElementById('errorMessage');

    // Form inputs
    defaultSpeed = document.getElementById('defaultSpeed');
    pauseAtHeadings = document.getElementById('pauseAtHeadings');
    smartPausing = document.getElementById('smartPausing');
    autoPauseOnUserScroll = document.getElementById('autoPauseOnUserScroll');
    endBehavior = document.getElementById('endBehavior');
    voiceLanguage = document.getElementById('voiceLanguage');
    focusBandEnabled = document.getElementById('focusBandEnabled');
    miniControllerEnabled = document.getElementById('miniControllerEnabled');
    defaultDirection = document.getElementById('defaultDirection');
    hudEnabled = document.getElementById('hudEnabled');
    focusBandHeight = document.getElementById('focusBandHeight');
    focusDimOpacity = document.getElementById('focusDimOpacity');
    readingRhythm = document.getElementById('readingRhythm');
    startAliases = document.getElementById('startAliases');
    pauseAliases = document.getElementById('pauseAliases');
    stopAliases = document.getElementById('stopAliases');
    fasterAliases = document.getElementById('fasterAliases');
    slowerAliases = document.getElementById('slowerAliases');
    disableStartCommand = document.getElementById('disableStartCommand');
    disablePauseCommand = document.getElementById('disablePauseCommand');
    disableStopCommand = document.getElementById('disableStopCommand');
    disableFasterCommand = document.getElementById('disableFasterCommand');
    disableSlowerCommand = document.getElementById('disableSlowerCommand');
    aliasConflictWarning = document.getElementById('aliasConflictWarning');
    voiceTestPhrase = document.getElementById('voiceTestPhrase');
    voiceTestBtn = document.getElementById('voiceTestBtn');
    voiceTestResult = document.getElementById('voiceTestResult');
    currentSiteLabel = document.getElementById('currentSiteLabel');
    siteBlocked = document.getElementById('siteBlocked');
    siteSpeed = document.getElementById('siteSpeed');
    siteFocusBandEnabled = document.getElementById('siteFocusBandEnabled');
    siteHudEnabled = document.getElementById('siteHudEnabled');
    importExportBox = document.getElementById('importExportBox');
    diagnosticsBox = document.getElementById('diagnosticsBox');
    usageCountersSummary = document.getElementById('usageCountersSummary');
    saveSiteBtn = document.getElementById('saveSiteBtn');
    resetSiteBtn = document.getElementById('resetSiteBtn');
    exportSettingsBtn = document.getElementById('exportSettingsBtn');
    importSettingsBtn = document.getElementById('importSettingsBtn');
    clearPositionsBtn = document.getElementById('clearPositionsBtn');
    clearAllBtn = document.getElementById('clearAllBtn');
    diagnosticsBtn = document.getElementById('diagnosticsBtn');

    if (!optionsForm || !saveBtn || !resetBtn || !defaultSpeed || !pauseAtHeadings || !smartPausing || !autoPauseOnUserScroll || !endBehavior || !voiceLanguage || !focusBandEnabled || !defaultDirection || !hudEnabled || !focusBandHeight || !focusDimOpacity || !readingRhythm) {
      throw new Error('Required DOM elements not found');
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    optionsForm.addEventListener('submit', handleFormSubmit);
    resetBtn.addEventListener('click', handleResetClick);
    saveSiteBtn?.addEventListener('click', handleSaveSiteClick);
    resetSiteBtn?.addEventListener('click', handleResetSiteClick);
    exportSettingsBtn?.addEventListener('click', handleExportSettings);
    importSettingsBtn?.addEventListener('click', handleImportSettings);
    clearPositionsBtn?.addEventListener('click', () => handleClearLocalData(['positions']));
    clearAllBtn?.addEventListener('click', () => handleClearLocalData(['settings', 'sites', 'positions', 'aliases', 'counters']));
    diagnosticsBtn?.addEventListener('click', handleDiagnostics);
    voiceTestBtn?.addEventListener('click', handleVoiceCommandTest);
    document.querySelectorAll('[data-section-target]').forEach((button) => {
      button.addEventListener('click', () => showSection(button.dataset.sectionTarget));
    });

    // Real-time validation
    defaultSpeed.addEventListener('input', validateSpeed);
    pauseAtHeadings.addEventListener('input', validatePauseDuration);
    [startAliases, pauseAliases, stopAliases, fasterAliases, slowerAliases].forEach((input) => {
      input?.addEventListener('input', validateAliasConflicts);
    });
  }

  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      if (!hasRuntimeMessaging()) {
        populateForm(DEFAULT_SETTINGS);
        populateSiteSettings('', {}, DEFAULT_SETTINGS);
        return;
      }

      const response = await sendMessage({ command: 'getSettings' });
      
      if (response?.success) {
        const settings = response.settings;
        populateForm(settings);
        currentSite = response.currentSite || '';
        populateSiteSettings(response.currentSite, response.currentSiteSettings || {}, settings);
      } else {
        console.warn('Failed to load settings, using defaults');
        populateForm(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showErrorMessage('Failed to load settings');
      populateForm(DEFAULT_SETTINGS);
    }
  }

  /**
   * Populate form with settings values
   */
  function populateForm(settings) {
    try {
      defaultSpeed.value = settings.defaultSpeed || DEFAULT_SETTINGS.defaultSpeed;
      
      pauseAtHeadings.value = settings.pauseAtHeadings !== undefined ? 
        settings.pauseAtHeadings : DEFAULT_SETTINGS.pauseAtHeadings;
      smartPausing.checked = settings.smartPausing === true;
      autoPauseOnUserScroll.checked = settings.autoPauseOnUserScroll !== false;
      endBehavior.value = settings.endBehavior || DEFAULT_SETTINGS.endBehavior;
      voiceLanguage.value = settings.voiceLanguage || DEFAULT_SETTINGS.voiceLanguage;
      focusBandEnabled.checked = settings.focusBandEnabled === true;
      if (miniControllerEnabled) {
        miniControllerEnabled.checked = settings.miniControllerEnabled === true || settings.hudEnabled === true;
      }
      defaultDirection.value = String(settings.defaultDirection || DEFAULT_SETTINGS.defaultDirection);
      hudEnabled.checked = settings.hudEnabled === true;
      focusBandHeight.value = settings.focusBandHeight || DEFAULT_SETTINGS.focusBandHeight;
      focusDimOpacity.value = settings.focusDimOpacity ?? DEFAULT_SETTINGS.focusDimOpacity;
      readingRhythm.value = settings.readingRhythm || DEFAULT_SETTINGS.readingRhythm;
      const aliases = settings.voiceAliases || {};
      startAliases.value = aliasesToText(aliases.start);
      pauseAliases.value = aliasesToText(aliases.pause);
      stopAliases.value = aliasesToText(aliases.stop);
      fasterAliases.value = aliasesToText(aliases.faster);
      slowerAliases.value = aliasesToText(aliases.slower);
      const disabled = settings.disabledCommands || {};
      disableStartCommand.checked = disabled.start === true;
      disablePauseCommand.checked = disabled.pause === true;
      disableStopCommand.checked = disabled.stop === true;
      disableFasterCommand.checked = disabled.faster === true;
      disableSlowerCommand.checked = disabled.slower === true;
      validateAliasConflicts();
      if (usageCountersSummary) {
        const counters = settings.usageCounters || {};
        usageCountersSummary.textContent = `Local usage counters: ${Number(counters.scrollStarts) || 0} starts, ${Number(counters.voiceSessions) || 0} voice sessions, ${Number(counters.focusToggles) || 0} focus toggles.`;
      }
    } catch (error) {
      console.error('Error populating form:', error);
    }
  }

  /**
   * Handle form submission
   */
  async function handleFormSubmit(event) {
    event.preventDefault();

    try {
      // Validate form
      if (!validateForm()) {
        return;
      }

      // Disable save button during save
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      // Collect form data
      const settings = collectFormData();

      // Save settings
      const response = await sendMessage({ 
        command: 'saveSettings', 
        settings: settings 
      });

      if (response?.success) {
        showSuccessMessage('Settings saved successfully!');
      } else {
        throw new Error(response?.error || 'Failed to save settings');
      }

    } catch (error) {
      console.error('Error saving settings:', error);
      showErrorMessage('Failed to save settings. Please try again.');
    } finally {
      // Re-enable save button
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    }
  }

  /**
   * Handle reset button click
   */
  async function handleResetClick() {
    if (confirm('Are you sure you want to reset all settings to their defaults?')) {
      try {
        populateForm(DEFAULT_SETTINGS);
        const response = await sendMessage({
          command: 'saveSettings',
          settings: DEFAULT_SETTINGS
        });
        if (response?.success) {
          showSuccessMessage('Settings reset to defaults.');
        } else {
          showErrorMessage(response?.error || 'Could not reset settings.');
        }
      } catch (error) {
        showErrorMessage('Could not reset settings.');
      }
    }
  }

  /**
   * Validate the entire form
   */
  function validateForm() {
    let isValid = true;

    // Validate speed
    if (!validateSpeed()) {
      isValid = false;
    }

    // Validate pause duration
    if (!validatePauseDuration()) {
      isValid = false;
    }

    if (!validateFocusSettings()) {
      isValid = false;
    }

    return isValid;
  }

  /**
   * Validate speed input
   */
  function validateSpeed() {
    const speed = parseInt(defaultSpeed.value, 10);
    
    if (isNaN(speed) || speed < 1 || speed > 100) {
      defaultSpeed.setCustomValidity('Speed must be between 1 and 100');
      defaultSpeed.reportValidity();
      return false;
    }
    
    defaultSpeed.setCustomValidity('');
    return true;
  }

  /**
   * Validate pause duration input
   */
  function validatePauseDuration() {
    const duration = parseFloat(pauseAtHeadings.value);
    
    if (isNaN(duration) || duration < 0 || duration > 10) {
      pauseAtHeadings.setCustomValidity('Pause duration must be between 0 and 10 seconds');
      pauseAtHeadings.reportValidity();
      return false;
    }
    
    pauseAtHeadings.setCustomValidity('');
    return true;
  }

  function validateFocusSettings() {
    const height = parseFloat(focusBandHeight.value);
    const opacity = parseFloat(focusDimOpacity.value);
    if (isNaN(height) || height < 12 || height > 60) {
      focusBandHeight.setCustomValidity('Band height must be between 12 and 60');
      focusBandHeight.reportValidity();
      return false;
    }
    if (isNaN(opacity) || opacity < 0 || opacity > 0.35) {
      focusDimOpacity.setCustomValidity('Dim opacity must be between 0 and 0.35');
      focusDimOpacity.reportValidity();
      return false;
    }
    focusBandHeight.setCustomValidity('');
    focusDimOpacity.setCustomValidity('');
    return true;
  }

  /**
   * Collect form data into settings object
   */
  function collectFormData() {
    const speed = parseInt(defaultSpeed.value, 10);
    const hudDefault = hudEnabled.checked || Boolean(miniControllerEnabled?.checked);
    return {
      defaultSpeed: speed,
      currentSpeed: speed,
      pauseAtHeadings: parseFloat(pauseAtHeadings.value),
      smartPausing: smartPausing.checked,
      endBehavior: endBehavior.value,
      autoPauseOnUserScroll: autoPauseOnUserScroll.checked,
      voiceLanguage: voiceLanguage.value,
      defaultDirection: parseInt(defaultDirection.value, 10) === -1 ? -1 : 1,
      hudEnabled: hudDefault,
      focusBandEnabled: focusBandEnabled.checked,
      miniControllerEnabled: hudDefault,
      focusBandHeight: parseFloat(focusBandHeight.value),
      focusDimOpacity: parseFloat(focusDimOpacity.value),
      readingRhythm: readingRhythm.value,
      voiceAliases: {
        start: textToAliases(startAliases.value),
        pause: textToAliases(pauseAliases.value),
        stop: textToAliases(stopAliases.value),
        faster: textToAliases(fasterAliases.value),
        slower: textToAliases(slowerAliases.value)
      },
      disabledCommands: {
        start: disableStartCommand.checked,
        pause: disablePauseCommand.checked,
        stop: disableStopCommand.checked,
        faster: disableFasterCommand.checked,
        slower: disableSlowerCommand.checked
      }
    };
  }

  function validateAliasConflicts() {
    if (!aliasConflictWarning) {
      return true;
    }

    const commandAliases = {
      start: textToAliases(startAliases.value),
      pause: textToAliases(pauseAliases.value),
      stop: textToAliases(stopAliases.value),
      faster: textToAliases(fasterAliases.value),
      slower: textToAliases(slowerAliases.value)
    };
    const seen = new Map();
    const conflicts = [];

    for (const [command, aliases] of Object.entries(commandAliases)) {
      aliases.forEach((alias) => {
        const normalized = alias.toLowerCase();
        if (seen.has(normalized) && seen.get(normalized) !== command) {
          conflicts.push(`"${alias}" is used for ${seen.get(normalized)} and ${command}`);
        } else {
          seen.set(normalized, command);
        }
      });
    }

    aliasConflictWarning.hidden = conflicts.length === 0;
    aliasConflictWarning.textContent = conflicts.length
      ? `Command conflict warning: ${conflicts.slice(0, 3).join('; ')}.`
      : '';
    return conflicts.length === 0;
  }

  function handleVoiceCommandTest() {
    if (!voiceTestResult) {
      return;
    }

    const phrase = String(voiceTestPhrase?.value || '').trim().toLowerCase();
    if (!phrase) {
      voiceTestResult.hidden = false;
      voiceTestResult.textContent = 'Type a phrase first.';
      return;
    }

    const settings = collectFormData();
    const commandPatterns = {
      start: ['start', 'begin', 'go', 'scroll', 'play', 'start scrolling', ...settings.voiceAliases.start],
      pause: ['pause', 'resume', 'hold', 'wait', ...settings.voiceAliases.pause],
      stop: ['stop', 'halt', 'end', 'cancel', ...settings.voiceAliases.stop],
      faster: ['faster', 'speed up', 'quicker', 'max speed', 'turbo', ...settings.voiceAliases.faster],
      slower: ['slower', 'slow down', 'easier', ...settings.voiceAliases.slower]
    };

    const match = Object.entries(commandPatterns).find(([command, patterns]) => {
      if (settings.disabledCommands[command]) {
        return false;
      }
      return patterns.some((pattern) => {
        const normalized = String(pattern || '').trim().toLowerCase();
        return normalized && (phrase === normalized || phrase.includes(normalized));
      });
    });

    voiceTestResult.hidden = false;
    voiceTestResult.textContent = match
      ? `Matched command: ${match[0]}.`
      : 'No ScrollHandsFree command matched. Try "start," "stop," or one of your aliases.';
  }

  function showSection(sectionId) {
    document.querySelectorAll('[data-options-section]').forEach((section) => {
      section.hidden = section.id !== sectionId;
    });
    document.querySelectorAll('[data-section-target]').forEach((button) => {
      button.classList.toggle('active', button.dataset.sectionTarget === sectionId);
    });
  }

  function aliasesToText(value) {
    return Array.isArray(value) ? value.join(', ') : '';
  }

  function textToAliases(value) {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function populateSiteSettings(site, siteSettings, globalSettings = DEFAULT_SETTINGS) {
    if (currentSiteLabel) {
      currentSiteLabel.textContent = site ? `Current site: ${site}` : 'Current site';
    }
    if (siteBlocked) {
      siteBlocked.checked = siteSettings.blocked === true;
    }
    if (siteSpeed) {
      siteSpeed.value = siteSettings.currentSpeed || globalSettings.currentSpeed || globalSettings.defaultSpeed || DEFAULT_SETTINGS.defaultSpeed;
    }
    if (siteFocusBandEnabled) {
      siteFocusBandEnabled.checked = siteSettings.focusBandEnabled === true;
    }
    if (siteHudEnabled) {
      siteHudEnabled.checked = siteSettings.hudEnabled === true || siteSettings.miniControllerEnabled === true;
    }
  }

  async function handleSaveSiteClick() {
    const response = await sendMessage({
      command: 'saveSiteSettings',
      settings: {
        blocked: siteBlocked.checked,
        currentSpeed: parseInt(siteSpeed.value, 10),
        focusBandEnabled: siteFocusBandEnabled.checked,
        hudEnabled: siteHudEnabled.checked,
        miniControllerEnabled: siteHudEnabled.checked
      }
    });
    if (response?.success) {
      showSuccessMessage('Site settings saved.');
      currentSite = response.site || currentSite;
    } else {
      showErrorMessage(response?.error || 'Could not save site settings.');
    }
  }

  async function handleResetSiteClick() {
    const response = await sendMessage({ command: 'resetCurrentSite' });
    if (response?.success) {
      siteBlocked.checked = false;
      siteFocusBandEnabled.checked = false;
      siteHudEnabled.checked = false;
      siteSpeed.value = defaultSpeed.value || DEFAULT_SETTINGS.defaultSpeed;
      showSuccessMessage('Site settings reset.');
    } else {
      showErrorMessage(response?.error || 'Could not reset site settings.');
    }
  }

  async function handleExportSettings() {
    const response = await sendMessage({ command: 'exportSettings' });
    if (response?.success) {
      importExportBox.value = JSON.stringify(response.settings, null, 2);
      showSuccessMessage('Settings exported.');
    } else {
      showErrorMessage(response?.error || 'Could not export settings.');
    }
  }

  async function handleImportSettings() {
    try {
      const parsed = JSON.parse(importExportBox.value);
      const response = await sendMessage({ command: 'importSettings', settings: parsed });
      if (response?.success) {
        showSuccessMessage('Settings imported.');
        loadSettings();
      } else {
        showErrorMessage(response?.error || 'Could not import settings.');
      }
    } catch (error) {
      showErrorMessage('Import JSON is not valid.');
    }
  }

  async function handleClearLocalData(types) {
    if (!confirm('Clear selected local data?')) {
      return;
    }
    const response = await sendMessage({ command: 'clearLocalData', types });
    if (response?.success) {
      showSuccessMessage('Local data cleared.');
      loadSettings();
    } else {
      showErrorMessage(response?.error || 'Could not clear local data.');
    }
  }

  async function handleDiagnostics() {
    const response = await sendMessage({ command: 'getDiagnostics' });
    if (response?.success) {
      const text = JSON.stringify(response.diagnostics, null, 2);
      const outputBox = diagnosticsBox || importExportBox;
      outputBox.value = text;
      try {
        await navigator.clipboard.writeText(text);
        showSuccessMessage('Diagnostic info copied.');
      } catch (error) {
        showSuccessMessage('Diagnostic info generated.');
      }
    } else {
      showErrorMessage(response?.error || 'Could not get diagnostics.');
    }
  }

  /**
   * Show success message
   */
  function showSuccessMessage(message) {
    hideMessages();
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 3000);

    // Announce to screen readers
    announceToScreenReader(message);
  }

  /**
   * Show error message
   */
  function showErrorMessage(message) {
    hideMessages();
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);

    // Announce to screen readers
    announceToScreenReader(message);
  }

  /**
   * Hide all messages
   */
  function hideMessages() {
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
  }

  /**
   * Announce message to screen readers
   */
  function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Send message to background script
   */
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        if (!hasRuntimeMessaging()) {
          resolve(null);
          return;
        }

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

  function hasRuntimeMessaging() {
    return typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function';
  }

})();
