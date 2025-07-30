
(() => {
  'use strict';

  // DOM elements
  let optionsForm, saveBtn, resetBtn, successMessage, errorMessage;
  let defaultSpeed, voiceActivationKey;
  let pauseAtHeadings, smartPausing;

  // Default settings
  const DEFAULT_SETTINGS = {
    defaultSpeed: 50,
    voiceActivationKey: 'Ctrl+Shift+S',
    pauseAtHeadings: 2,
    smartPausing: true
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
    voiceActivationKey = document.getElementById('voiceActivationKey');
    pauseAtHeadings = document.getElementById('pauseAtHeadings');
    smartPausing = document.getElementById('smartPausing');

    if (!optionsForm || !saveBtn || !resetBtn) {
      throw new Error('Required DOM elements not found');
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    optionsForm.addEventListener('submit', handleFormSubmit);
    resetBtn.addEventListener('click', handleResetClick);

    // Real-time validation
    defaultSpeed.addEventListener('input', validateSpeed);
    pauseAtHeadings.addEventListener('input', validatePauseDuration);
  }

  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      const response = await sendMessage({ command: 'getSettings' });
      
      if (response?.success) {
        const settings = response.settings;
        populateForm(settings);
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
      voiceActivationKey.value = settings.voiceActivationKey || DEFAULT_SETTINGS.voiceActivationKey;
      
      pauseAtHeadings.value = settings.pauseAtHeadings !== undefined ? 
        settings.pauseAtHeadings : DEFAULT_SETTINGS.pauseAtHeadings;
      smartPausing.checked = settings.smartPausing !== false; // Default to true
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
  function handleResetClick() {
    if (confirm('Are you sure you want to reset all settings to their defaults?')) {
      populateForm(DEFAULT_SETTINGS);
      showSuccessMessage('Settings reset to defaults');
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

  /**
   * Collect form data into settings object
   */
  function collectFormData() {
    return {
      defaultSpeed: parseInt(defaultSpeed.value, 10),
      voiceActivationKey: voiceActivationKey.value,
      pauseAtHeadings: parseFloat(pauseAtHeadings.value),
      smartPausing: smartPausing.checked
    };
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
        chrome.runtime.sendMessage(message, (response) => {
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

})();
