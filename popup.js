/**
 * ScrollHands Free - Popup Script
 * Handles user interactions in the extension popup
 */

(() => {
  'use strict';

  // DOM elements
  let startBtn, stopBtn, speedSlider, speedValue, statusDisplay;
  let voiceToggle, accessibilityBtn, optionsLink;
  let scrollUpBtn, scrollDownBtn;

  // State variables
  let isScrolling = false;
  let isVoiceEnabled = false;
  let currentSpeed = 50;
  let scrollDirection = 1; // 1 for down, -1 for up

  /**
   * Initialize popup when DOM is loaded
   */
  document.addEventListener('DOMContentLoaded', () => {
    try {
      initializeDOMElements();
      setupEventListeners();
      loadSettings();
      
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener(handleBackgroundMessage);
      
      console.log('ScrollHands Free popup initialized');
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  });

  /**
   * Get references to DOM elements
   */
  function initializeDOMElements() {
    startBtn = document.getElementById('startBtn');
    stopBtn = document.getElementById('stopBtn');
    scrollUpBtn = document.getElementById('scrollUpBtn');
    scrollDownBtn = document.getElementById('scrollDownBtn');
    speedSlider = document.getElementById('speedSlider');
    speedValue = document.getElementById('speedValue');
    statusDisplay = document.getElementById('statusDisplay');
    voiceToggle = document.getElementById('voiceToggle');
    accessibilityBtn = document.getElementById('accessibilityBtn');
    optionsLink = document.getElementById('optionsLink');

    if (!startBtn || !stopBtn || !speedSlider || !scrollUpBtn || !scrollDownBtn) {
      throw new Error('Required DOM elements not found');
    }
  }

  /**
   * Setup event listeners for UI elements
   */
  function setupEventListeners() {
    // Start/Stop buttons
    startBtn.addEventListener('click', handleStartClick);
    stopBtn.addEventListener('click', handleStopClick);

    // Direction buttons
    scrollUpBtn.addEventListener('click', () => handleDirectionClick(-1));
    scrollDownBtn.addEventListener('click', () => handleDirectionClick(1));

    // Speed slider
    speedSlider.addEventListener('input', handleSpeedChange);

    // Voice control toggle
    voiceToggle.addEventListener('click', handleVoiceToggle);
    voiceToggle.addEventListener('keydown', handleToggleKeydown);

    // Help button
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', handleHelpClick);
    }

    // Accessibility button
    accessibilityBtn.addEventListener('click', handleAccessibilityCheck);

    // Options link
    optionsLink.addEventListener('click', handleOptionsClick);
  }

  /**
   * Load current settings from storage
   */
  async function loadSettings() {
    try {
      const response = await sendMessage({ command: 'getSettings' });
      
      if (response?.success) {
        const settings = response.settings;
        
        // Update UI with current settings
        currentSpeed = settings.currentSpeed || 50;
        speedSlider.value = currentSpeed;
        speedValue.textContent = currentSpeed;
        
        isScrolling = settings.isScrolling || false;
        updateScrollingState(isScrolling);
        
        // Voice control is now tab-specific - always start as disabled
        isVoiceEnabled = false;
        updateToggleState(voiceToggle, false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Handle start button click (default direction)
   */
  async function handleStartClick() {
    try {
      startBtn.disabled = true;
      
      const response = await sendMessage({ 
        command: 'startScroll', 
        speed: currentSpeed,
        direction: scrollDirection
      });
      
      if (response?.success) {
        updateScrollingState(true);
      } else {
        throw new Error(response?.error || 'Failed to start scrolling');
      }
    } catch (error) {
      console.error('Error starting scroll:', error);
      // Show error to user
      statusDisplay.textContent = 'Error starting';
      statusDisplay.className = 'status inactive';
      setTimeout(() => {
        statusDisplay.textContent = 'Ready';
      }, 2000);
    } finally {
      startBtn.disabled = false;
    }
  }

  /**
   * Handle direction button clicks
   */
  async function handleDirectionClick(direction) {
    try {
      scrollDirection = direction;
      
      // Update UI to show which direction is active
      scrollUpBtn.classList.toggle('btn-primary', direction === -1);
      scrollUpBtn.classList.toggle('btn-secondary', direction !== -1);
      scrollDownBtn.classList.toggle('btn-primary', direction === 1);
      scrollDownBtn.classList.toggle('btn-secondary', direction !== 1);
      
      const response = await sendMessage({ 
        command: 'startScroll', 
        speed: currentSpeed,
        direction: direction
      });
      
      if (response?.success) {
        updateScrollingState(true);
        statusDisplay.textContent = direction === 1 ? 'Scrolling Down' : 'Scrolling Up';
        statusDisplay.className = 'status active';
      } else {
        throw new Error(response?.error || 'Failed to start scrolling');
      }
    } catch (error) {
      console.error('Error starting directional scroll:', error);
      statusDisplay.textContent = 'Error starting';
      statusDisplay.className = 'status inactive';
      setTimeout(() => {
        statusDisplay.textContent = 'Ready';
      }, 2000);
    }
  }

  /**
   * Handle stop button click
   */
  async function handleStopClick() {
    try {
      stopBtn.disabled = true;
      
      const response = await sendMessage({ command: 'stopScroll' });
      
      if (response?.success) {
        updateScrollingState(false);
      } else {
        throw new Error(response?.error || 'Failed to stop scrolling');
      }
    } catch (error) {
      console.error('Error stopping scroll:', error);
      // Show error to user
      statusDisplay.textContent = 'Error stopping';
      statusDisplay.className = 'status inactive';
      setTimeout(() => {
        updateScrollingState(false);
      }, 2000);
    } finally {
      stopBtn.disabled = false;
    }
  }

  /**
   * Handle speed slider change
   */
  async function handleSpeedChange(event) {
    try {
      const newSpeed = parseInt(event.target.value, 10);
      currentSpeed = newSpeed;
      speedValue.textContent = newSpeed;
      
      // Update speed in real-time if scrolling
      const response = await sendMessage({ 
        command: 'setSpeed', 
        speed: newSpeed 
      });
      
      if (!response?.success) {
        console.warn('Failed to set speed:', response?.error);
      }
    } catch (error) {
      console.error('Error changing speed:', error);
    }
  }

  /**
   * Handle voice control toggle
   */
  async function handleVoiceToggle() {
    try {
      const newState = !isVoiceEnabled;
      updateToggleState(voiceToggle, newState);
      
      const response = await sendMessage({ 
        command: 'toggleVoice', 
        enabled: newState 
      });
      
      if (response?.success) {
        isVoiceEnabled = newState;
        // Show tab-specific feedback
        if (newState) {
          updateScrollingState(false); // Clear any other status
          statusDisplay.textContent = 'Voice control: This tab only';
          statusDisplay.className = 'status active';
          
          // Clear the message after 3 seconds
          setTimeout(() => {
            if (statusDisplay.textContent === 'Voice control: This tab only') {
              statusDisplay.textContent = 'Ready';
              statusDisplay.className = 'status inactive';
            }
          }, 3000);
        } else {
          statusDisplay.textContent = 'Voice control disabled';
          statusDisplay.className = 'status inactive';
          
          // Clear the message after 2 seconds
          setTimeout(() => {
            if (statusDisplay.textContent === 'Voice control disabled') {
              statusDisplay.textContent = 'Ready';
            }
          }, 2000);
        }
      } else {
        // Revert state on error
        updateToggleState(voiceToggle, isVoiceEnabled);
        throw new Error(response?.error || 'Failed to toggle voice control');
      }
    } catch (error) {
      console.error('Error toggling voice control:', error);
      statusDisplay.textContent = 'Error toggling voice control';
      statusDisplay.className = 'status inactive';
    }
  }

  /**
   * Handle keyboard navigation for toggles
   */
  function handleToggleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.target.click();
    }
  }

  /**
   * Handle accessibility check button
   */
  async function handleAccessibilityCheck() {
    try {
      accessibilityBtn.disabled = true;
      accessibilityBtn.textContent = 'Checking...';
      
      const response = await sendMessage({ command: 'checkAccessibility' });
      
      if (response?.success) {
        // Show success message briefly
        accessibilityBtn.textContent = 'Check Complete!';
        setTimeout(() => {
          accessibilityBtn.textContent = 'Check Page Accessibility';
          accessibilityBtn.disabled = false;
        }, 2000);
      } else {
        throw new Error(response?.error || 'Failed to run accessibility check');
      }
      
    } catch (error) {
      console.error('Error running accessibility check:', error);
      accessibilityBtn.textContent = 'Error - Try Again';
      setTimeout(() => {
        accessibilityBtn.textContent = 'Check Page Accessibility';
        accessibilityBtn.disabled = false;
      }, 2000);
    }
  }

  /**
   * Handle options link click
   */
  function handleOptionsClick(event) {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  }

  /**
   * Handle help button click - show voice commands on page
   */
  function handleHelpClick() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { command: 'showHelp' });
      }
    });
  }

  /**
   * Update UI based on scrolling state
   */
  function updateScrollingState(scrolling) {
    isScrolling = scrolling;
    
    if (scrolling) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusDisplay.textContent = 'Scrolling';
      statusDisplay.className = 'status active';
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusDisplay.textContent = 'Stopped';
      statusDisplay.className = 'status inactive';
    }
  }

  /**
   * Update toggle switch state
   */
  function updateToggleState(toggleElement, enabled) {
    if (enabled) {
      toggleElement.classList.add('active');
      toggleElement.setAttribute('aria-checked', 'true');
    } else {
      toggleElement.classList.remove('active');
      toggleElement.setAttribute('aria-checked', 'false');
    }
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

  /**
   * Handle messages from background script
   */
  function handleBackgroundMessage(message, sender, sendResponse) {
    try {
      if (message.command === 'updateVoiceStatus') {
        updateVoiceStatusDisplay(message);
      }
    } catch (error) {
      console.error('Error handling background message:', error);
    }
  }

  /**
   * Update voice status display with feedback
   */
  function updateVoiceStatusDisplay(data) {
    // Find voice status element or use the status display
    const voiceStatusElement = document.getElementById('voiceStatus') || statusDisplay;
    
    if (data.commandText) {
      // Show voice command feedback
      const feedback = data.success ? '✓' : '✗';
      const color = data.success ? '#28a745' : '#dc3545';
      
      const originalText = voiceStatusElement.textContent;
      voiceStatusElement.innerHTML = `
        <span style="color: ${color}">${feedback}</span> 
        "${data.commandText}" - ${data.feedback}
      `;
      
      // Clear after 3 seconds
      setTimeout(() => {
        voiceStatusElement.textContent = isVoiceEnabled ? 'Voice active' : originalText;
      }, 3000);
    } else if (data.status) {
      // Show voice status update
      voiceStatusElement.textContent = data.status;
    }
  }

})();
