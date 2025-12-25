/**
 * Popup UI controller. Handles user interactions and communicates with
 * the content script via Chrome messaging.
 */

import { ERROR_CODES, USER_MESSAGES, formatErrorMessage } from './errorMessages';
import { ReaderMessage, ReaderResponse } from './messages';
import { getThemePreference, saveThemePreference } from './storage';

// UI elements
const statusEl = document.getElementById('status') as HTMLElement;
const activateBtn = document.getElementById('activate') as HTMLButtonElement;
const deactivateBtn = document.getElementById('deactivate') as HTMLButtonElement;
const fontDecBtn = document.getElementById('font-dec') as HTMLButtonElement;
const fontIncBtn = document.getElementById('font-inc') as HTMLButtonElement;
const themeToggleBtn = document.getElementById('theme-toggle') as HTMLButtonElement;
const summarizeBtn = document.getElementById('summarize') as HTMLButtonElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;

let currentTabId: number | null = null;
let currentTheme: 'light' | 'dark' = 'light';

// Initialize: get current tab and check reader status
async function init(): Promise<void> {
  try {
    // Load saved theme preference
    currentTheme = await getThemePreference();
    updateThemeButtonLabel();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      setStatus('No active tab', 'error');
      return;
    }
    currentTabId = tab.id;

    // Ping content script to check if reader is active
    try {
      const pingResponse = await sendMessage({ type: 'ping' });
      // Update UI based on reader status
      const isActive = pingResponse.active ?? false;
      updateUI(isActive);
      if (isActive) {
        setStatus('Reader mode active', 'success');
      }
    } catch {
      // Content script not ready or page not supported
      setStatus('Page not ready', 'error');
      updateUI(false);
    }
  } catch (error) {
    setStatus('Failed to initialize', 'error');
    console.error('Init error:', error);
  }
}

function updateThemeButtonLabel(): void {
  themeToggleBtn.textContent = currentTheme === 'dark' ? '🌙 Dark' : '☀️ Light';
}

function setStatus(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function updateUI(active: boolean): void {
  activateBtn.disabled = active;
  deactivateBtn.disabled = !active;
  fontDecBtn.disabled = !active;
  fontIncBtn.disabled = !active;
  themeToggleBtn.disabled = !active;
  // Summarize button is always enabled - it will auto-activate reader if needed
}

async function sendMessage(message: ReaderMessage): Promise<ReaderResponse> {
  if (currentTabId === null) {
    throw new Error('No active tab');
  }
  try {
    return await chrome.tabs.sendMessage(currentTabId, message);
  } catch (error) {
    // If content script isn't loaded, try to inject it
    if (error instanceof Error && error.message.includes('Could not establish connection')) {
      // Try to inject the content script programmatically
      try {
        await chrome.scripting.executeScript({
          target: { tabId: currentTabId },
          files: ['content.js'],
        });
        // Wait a bit for the script to load, then retry
        await new Promise((resolve) => setTimeout(resolve, 100));
        return await chrome.tabs.sendMessage(currentTabId, message);
      } catch (injectError) {
        throw new Error(`Content script failed to load: ${injectError instanceof Error ? injectError.message : String(injectError)}`);
      }
    }
    throw error;
  }
}

// Event handlers
activateBtn.addEventListener('click', async () => {
  try {
    setStatus(USER_MESSAGES.ACTIVATING, 'info');
    // Load theme preference before activating
    const theme = await getThemePreference();
    const activateResponse = await sendMessage({ 
      type: 'activate',
      options: { theme }
    });
    if (activateResponse.ok) {
      setStatus(USER_MESSAGES.READER_ACTIVATED, 'success');
      updateUI(true);
    } else {
      // If already active, update UI to reflect correct state
      if (activateResponse.reason === ERROR_CODES.ALREADY_ACTIVE) {
        updateUI(true);
        setStatus(USER_MESSAGES.READER_ALREADY_ACTIVE, 'info');
      } else {
        // Log technical reason for debugging
        console.warn('Activation failed:', activateResponse.reason);
        setStatus(formatErrorMessage(activateResponse.reason), 'error');
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setStatus(`Failed: ${errorMessage}`, 'error');
    console.error('Activate error:', error);
    
    // If it's a "Could not establish connection" error, the content script might not be loaded
    if (errorMessage.includes('Could not establish connection') || errorMessage.includes('Receiving end does not exist')) {
      setStatus('Content script not loaded. Try refreshing the page.', 'error');
    }
  }
});

deactivateBtn.addEventListener('click', async () => {
  try {
    setStatus(USER_MESSAGES.DEACTIVATING, 'info');
    const deactivateResponse = await sendMessage({ type: 'deactivate' });
    if (deactivateResponse.ok) {
      setStatus(USER_MESSAGES.READER_DEACTIVATED, 'success');
      updateUI(false);
    } else {
      // Log technical reason for debugging
      console.warn('Deactivation failed:', deactivateResponse.reason);
      setStatus(formatErrorMessage(deactivateResponse.reason), 'error');
    }
  } catch (error) {
    setStatus('Failed to deactivate', 'error');
    console.error('Deactivate error:', error);
  }
});

fontDecBtn.addEventListener('click', async () => {
  // Font size is controlled in-reader, but we can send a message to adjust
  // For now, this is handled by in-reader controls
  setStatus(USER_MESSAGES.USE_IN_READER_CONTROLS, 'info');
});

fontIncBtn.addEventListener('click', async () => {
  setStatus(USER_MESSAGES.USE_IN_READER_CONTROLS, 'info');
});

themeToggleBtn.addEventListener('click', async () => {
  try {
    // Toggle theme
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Save preference
    await saveThemePreference(currentTheme);
    updateThemeButtonLabel();
    
    // If reader is active, update theme immediately
    try {
      const response = await sendMessage({ type: 'changeTheme', theme: currentTheme });
      if (response.ok) {
        setStatus(`Theme: ${currentTheme === 'dark' ? 'Dark' : 'Light'}`, 'success');
      }
    } catch {
      // Reader not active, that's okay - preference is saved for next activation
      setStatus(`Theme set to ${currentTheme === 'dark' ? 'Dark' : 'Light'}`, 'success');
    }
  } catch (error) {
    setStatus('Failed to change theme', 'error');
    console.error('Theme toggle error:', error);
  }
});

summarizeBtn.addEventListener('click', async () => {
  try {
    setStatus('Preparing summary...', 'info');

    // Step 1: Check if reader is active, if not, activate it first
    const pingResponse = await sendMessage({ type: 'ping' });
    const isReaderActive = pingResponse.active ?? false;

    if (!isReaderActive) {
      setStatus('Activating reader mode...', 'info');
      const theme = await getThemePreference();
      const activateResponse = await sendMessage({
        type: 'activate',
        options: { theme },
      });

      if (!activateResponse.ok) {
        setStatus(formatErrorMessage(activateResponse.reason), 'error');
        return;
      }
      updateUI(true);
    }

    // Step 2: Send summarize message to content script (will show in reader mode)
    setStatus('Generating summary...', 'info');
    const summarizeResponse = await sendMessage({ type: 'summarize' });

    if (summarizeResponse.ok) {
      setStatus('Summary will appear in reader mode', 'success');
    } else {
      // Handle errors - show message with link to settings if not configured
      const errorMsg = summarizeResponse.reason ?? 'Unknown error';
      const isNotConfigured = errorMsg === 'no_api_key' || errorMsg.includes('not configured');
      
      if (isNotConfigured) {
        setStatus('AI not configured. Click "Configure AI Settings" below.', 'error');
      } else {
        setStatus(`Summary failed: ${formatErrorMessage(errorMsg)}`, 'error');
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setStatus(`Summary failed: ${errorMessage}`, 'error');
    console.error('Summarize error:', error);
  }
});

// Settings button
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Initialize on load
init();

