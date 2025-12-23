/**
 * Popup UI controller. Handles user interactions and communicates with
 * the content script via Chrome messaging.
 */

import { ReaderMessage, ReaderResponse, SummarizeMessage, SummarizeResponse } from './messages';
import { getThemePreference, saveThemePreference } from './storage';

// UI elements
const statusEl = document.getElementById('status') as HTMLElement;
const activateBtn = document.getElementById('activate') as HTMLButtonElement;
const deactivateBtn = document.getElementById('deactivate') as HTMLButtonElement;
const fontDecBtn = document.getElementById('font-dec') as HTMLButtonElement;
const fontIncBtn = document.getElementById('font-inc') as HTMLButtonElement;
const themeToggleBtn = document.getElementById('theme-toggle') as HTMLButtonElement;
const summarizeBtn = document.getElementById('summarize') as HTMLButtonElement;
const summaryContentEl = document.getElementById('summary-content') as HTMLElement;
const settingsLink = document.getElementById('settings-link') as HTMLAnchorElement;

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
  summarizeBtn.disabled = !active;
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
    setStatus('Activating...', 'info');
    // Load theme preference before activating
    const theme = await getThemePreference();
    const activateResponse = await sendMessage({ 
      type: 'activate',
      options: { theme }
    });
    if (activateResponse.ok) {
      setStatus('Reader activated', 'success');
      updateUI(true);
    } else {
      // If already active, update UI to reflect correct state
      if (activateResponse.reason === 'already_active') {
        updateUI(true);
        setStatus('Reader already active', 'info');
      } else {
        setStatus(`Failed: ${activateResponse.reason ?? 'unknown'}`, 'error');
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
    setStatus('Deactivating...', 'info');
    const deactivateResponse = await sendMessage({ type: 'deactivate' });
    if (deactivateResponse.ok) {
      setStatus('Reader deactivated', 'success');
      updateUI(false);
      summaryContentEl.style.display = 'none';
    } else {
      setStatus(`Failed: ${deactivateResponse.reason ?? 'unknown'}`, 'error');
    }
  } catch (error) {
    setStatus('Failed to deactivate', 'error');
    console.error('Deactivate error:', error);
  }
});

fontDecBtn.addEventListener('click', async () => {
  // Font size is controlled in-reader, but we can send a message to adjust
  // For now, this is handled by in-reader controls
  setStatus('Use in-reader controls', 'info');
});

fontIncBtn.addEventListener('click', async () => {
  setStatus('Use in-reader controls', 'info');
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
    setStatus('Generating summary...', 'info');
    summaryContentEl.style.display = 'block';
    summaryContentEl.textContent = 'Loading...';
    summaryContentEl.className = 'summary-content loading';

    // Step 1: Get article text from content script (independent of reader mode)
    let text: string;
    try {
      const textResponse = await sendMessage({ type: 'getArticleText' });
      if (!textResponse.ok || !textResponse.articleText) {
        throw new Error(textResponse.reason ?? 'Could not extract article text');
      }
      text = textResponse.articleText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      summaryContentEl.textContent = `Failed to get article text: ${errorMessage}`;
      summaryContentEl.className = 'summary-content';
      setStatus('Failed to extract text', 'error');
      return;
    }

    // Step 2: Send to background worker for summarization (graceful degradation)
    const summarizeMessage: SummarizeMessage = {
      type: 'summarize',
      text,
    };

    const response = (await chrome.runtime.sendMessage(summarizeMessage)) as SummarizeResponse;

    if (response.ok && response.summary) {
      summaryContentEl.textContent = response.summary;
      summaryContentEl.className = 'summary-content';
      setStatus('Summary generated', 'success');
    } else {
      // Graceful error handling - show helpful message
      const errorMsg = response.error ?? 'Unknown error';
      const isNotConfigured = response.errorCode === 'no_api_key';
      
      summaryContentEl.textContent = isNotConfigured
        ? 'AI summarization is not configured. Please add an API key in extension settings.'
        : `Error: ${errorMsg}`;
      summaryContentEl.className = 'summary-content';
      setStatus(isNotConfigured ? 'AI not configured' : 'Summary failed', 'error');
    }
  } catch (error) {
    // Graceful error handling - don't break the app
    summaryContentEl.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    summaryContentEl.className = 'summary-content';
    setStatus('Summary failed', 'error');
    console.error('Summarize error:', error);
  }
});

// Settings link
settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Initialize on load
init();

