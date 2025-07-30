
// Constants for storage keys
const STORAGE_KEYS = {
  DEFAULT_SPEED: 'defaultSpeed',
  VOICE_ACTIVATION_KEY: 'voiceActivationKey',
  CURRENT_SPEED: 'currentSpeed',
  VOICE_ENABLED: 'voiceEnabled',
  PAUSE_AT_HEADINGS: 'pauseAtHeadings',
  SMART_PAUSING: 'smartPausing'
};

// Default settings
const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.DEFAULT_SPEED]: 50,
  [STORAGE_KEYS.VOICE_ACTIVATION_KEY]: 'Ctrl+Shift+S',
  [STORAGE_KEYS.CURRENT_SPEED]: 50,
  [STORAGE_KEYS.VOICE_ENABLED]: false,
  [STORAGE_KEYS.PAUSE_AT_HEADINGS]: 2,
  [STORAGE_KEYS.SMART_PAUSING]: true
};

/**
 * Initialize extension settings on installation
 */
chrome.runtime.onInstalled.addListener(async () => {
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
    
    console.log('ScrollHands Free extension initialized');
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
});

/**
 * Handle keyboard shortcuts
 */
chrome.commands.onCommand.addListener(async (command) => {
  try {
    if (command === 'toggle-voice-control') {
      // Get current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) return;
      
      const tabId = tabs[0].id;
      
      // Get current voice state
      const result = await chrome.storage.local.get([STORAGE_KEYS.VOICE_ENABLED]);
      const currentState = result[STORAGE_KEYS.VOICE_ENABLED] || false;
      const newState = !currentState;
      
      // Save new state
      await chrome.storage.local.set({ [STORAGE_KEYS.VOICE_ENABLED]: newState });
      
      // Send toggle command to content script
      await chrome.tabs.sendMessage(tabId, {
        command: 'toggleVoice',
        enabled: newState
      });
      
      console.log(`Voice control toggled to: ${newState}`);
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
    switch (request.command) {
      case 'startScroll':
        handleStartScroll(request.speed, request.direction, sendResponse);
        return true; // Keep message channel open for async response
      case 'stopScroll':
        handleStopScroll(sendResponse);
        return true; // Keep message channel open for async response
      case 'setSpeed':
        handleSetSpeed(request.speed, sendResponse);
        return true; // Keep message channel open for async response
      case 'toggleVoice':
        handleToggleVoice(request.enabled, sendResponse);
        return true; // Keep message channel open for async response
      case 'checkAccessibility':
        handleAccessibilityCheck(sendResponse);
        return true; // Keep message channel open for async response
      case 'getSettings':
        handleGetSettings(sendResponse);
        return true; // Keep message channel open for async response
      case 'saveSettings':
        handleSaveSettings(request.settings, sendResponse);
        return true; // Keep message channel open for async response
      case 'accessibilityReport':
        handleAccessibilityReport(request.data);
        break;
      case 'voiceCommand':
        // Voice command processed in content script, update popup status
        handleVoiceCommandFeedback(request.commandText, request.success, request.feedback);
        break;
      case 'voiceStatusUpdate':
        // Voice recognition status changed, update popup
        handleVoiceStatusUpdate(request.status, request.enabled);
        break;
      default:
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
      const pingResponse = await chrome.tabs.sendMessage(tabId, { command: 'ping' });
      if (pingResponse?.success) {
        // Content script is ready, send the actual message
        return await chrome.tabs.sendMessage(tabId, message);
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
    return await chrome.tabs.sendMessage(tabId, message);
    
  } catch (error) {
    console.error('Error in sendMessageToTab:', error);
    throw error;
  }
}

/**
 * Start auto-scrolling on active tab
 */
async function handleStartScroll(speed, direction, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      const response = await sendMessageToTab(tabs[0].id, { 
        command: 'startScroll', 
        speed: speed,
        direction: direction || 1 // Default to down
      });
      
      if (response?.success) {
        await chrome.storage.session.set({ isScrolling: true });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: response?.error || 'Content script error' });
      }
    } else {
      sendResponse({ success: false, error: 'No active tab found' });
    }
  } catch (error) {
    console.error('Error starting scroll:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Stop auto-scrolling on active tab
 */
async function handleStopScroll(sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      const response = await sendMessageToTab(tabs[0].id, { command: 'stopScroll' });
      
      if (response?.success) {
        await chrome.storage.session.set({ isScrolling: false });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: response?.error || 'Content script error' });
      }
    } else {
      sendResponse({ success: false, error: 'No active tab found' });
    }
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
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      const response = await sendMessageToTab(tabs[0].id, { 
        command: 'setSpeed', 
        speed: speed 
      });
      
      if (response?.success) {
        await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_SPEED]: speed });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: response?.error || 'Content script error' });
      }
    } else {
      sendResponse({ success: false, error: 'No active tab found' });
    }
  } catch (error) {
    console.error('Error setting speed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Toggle voice control for specific tab only
 */
async function handleToggleVoice(enabled, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      const tabId = tabs[0].id;
      
      // First disable voice control on all other tabs
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
          currentTabStates[tabId] = true;
        } else {
          delete currentTabStates[tabId];
        }
        
        await chrome.storage.session.set({ tabVoiceStates: currentTabStates });
        sendResponse({ success: true });
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
 * Disable voice control on all tabs except the specified one
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
          console.log(`Disabling voice control on tab ${tabId}`);
          
          // Send disable command to the tab with longer timeout
          await sendMessageToTab(tabId, { 
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
    console.log('Voice control cleanup completed');
    
  } catch (error) {
    console.error('Error disabling voice on other tabs:', error);
  }
}

/**
 * Check accessibility on active tab
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
    const settings = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    const sessionData = await chrome.storage.session.get(['isScrolling']);
    
    sendResponse({
      success: true,
      settings: { ...settings, ...sessionData }
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Save settings
 */
async function handleSaveSettings(settings, sendResponse) {
  try {
    await chrome.storage.local.set(settings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle accessibility report from content script
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
        console.group('Accessibility Violations:');
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
        ? 'No accessibility issues found!'
        : `Found ${data.violations.length} accessibility issue${data.violations.length === 1 ? '' : 's'}`;

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
    // Store voice command feedback for popup
    chrome.storage.session.set({
      lastVoiceCommand: {
        text: commandText,
        success: success,
        feedback: feedback,
        timestamp: Date.now()
      }
    });

    // Send to popup if it's open
    chrome.runtime.sendMessage({
      command: 'updateVoiceStatus',
      data: {
        lastCommand: commandText,
        success: success,
        feedback: feedback
      }
    }).catch(() => {
      // Popup might not be open, ignore error
    });
    
  } catch (error) {
    console.error('Error handling voice command feedback:', error);
  }
}

/**
 * Handle voice status updates from content script
 */
function handleVoiceStatusUpdate(status, enabled) {
  try {
    console.log(`Voice status update: ${status}, enabled: ${enabled}`);
    
    // Store voice status for popup
    chrome.storage.session.set({
      voiceStatus: status,
      voiceStatusEnabled: enabled,
      voiceStatusTimestamp: Date.now()
    });

    // Send to popup if it's open
    chrome.runtime.sendMessage({
      command: 'updateVoiceStatus',
      data: {
        status: status,
        enabled: enabled,
        timestamp: Date.now()
      }
    }).catch(() => {
      // Popup might not be open, ignore error
    });
    
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
    
    if (currentTabStates[tabId]) {
      delete currentTabStates[tabId];
      await chrome.storage.session.set({ tabVoiceStates: currentTabStates });
      console.log(`Cleaned up voice state for closed tab ${tabId}`);
    }
  } catch (error) {
    console.error('Error cleaning up tab voice state:', error);
  }
});

/**
 * Clean up voice states when tabs are updated (e.g., navigation)
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  // When a tab navigates to a new page, disable voice control
  if (changeInfo.status === 'loading' && changeInfo.url) {
    try {
      const tabVoiceStates = await chrome.storage.session.get(['tabVoiceStates']) || {};
      const currentTabStates = tabVoiceStates.tabVoiceStates || {};
      
      if (currentTabStates[tabId]) {
        delete currentTabStates[tabId];
        await chrome.storage.session.set({ tabVoiceStates: currentTabStates });
        console.log(`Disabled voice control for tab ${tabId} due to navigation`);
      }
    } catch (error) {
      console.error('Error handling tab navigation:', error);
    }
  }
});
