import { ERROR_CODES, USER_MESSAGES, formatErrorMessage } from './errorMessages';
import { ReaderMessage, ReaderResponse } from './messages';
import { getThemePreference, saveThemePreference } from './storage/theme';
import { setStatus as setStatusUtil } from './ui/status';

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

async function init(): Promise<void> {
  try {
    currentTheme = await getThemePreference();
    updateThemeButtonLabel();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      setStatus('No active tab', 'error');
      return;
    }
    currentTabId = tab.id;

    try {
      const pingResponse = await sendMessage({ type: 'ping' });
      const isActive = pingResponse.active ?? false;
      updateUI(isActive);
      if (isActive) {
        setStatus('Reader mode active', 'success');
      }
    } catch {
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
  setStatusUtil(statusEl, message, type);
}

function updateUI(active: boolean): void {
  activateBtn.disabled = active;
  deactivateBtn.disabled = !active;
  fontDecBtn.disabled = !active;
  fontIncBtn.disabled = !active;
  themeToggleBtn.disabled = !active;
}

async function sendMessage(message: ReaderMessage): Promise<ReaderResponse> {
  if (currentTabId === null) {
    throw new Error('No active tab');
  }
  try {
    return await chrome.tabs.sendMessage(currentTabId, message);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Could not establish connection')) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: currentTabId },
          files: ['content.js'],
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        return await chrome.tabs.sendMessage(currentTabId, message);
      } catch (injectError) {
        throw new Error(`Content script failed to load: ${injectError instanceof Error ? injectError.message : String(injectError)}`);
      }
    }
    throw error;
  }
}

activateBtn.addEventListener('click', async () => {
  try {
    setStatus(USER_MESSAGES.ACTIVATING, 'info');
    const theme = await getThemePreference();
    const activateResponse = await sendMessage({ 
      type: 'activate',
      options: { theme }
    });
    if (activateResponse.ok) {
      setStatus(USER_MESSAGES.READER_ACTIVATED, 'success');
      updateUI(true);
    } else {
      if (activateResponse.reason === ERROR_CODES.ALREADY_ACTIVE) {
        updateUI(true);
        setStatus(USER_MESSAGES.READER_ALREADY_ACTIVE, 'info');
      } else {
        console.warn('Activation failed:', activateResponse.reason);
        setStatus(formatErrorMessage(activateResponse.reason), 'error');
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setStatus(`Failed: ${errorMessage}`, 'error');
    console.error('Activate error:', error);
    
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
      console.warn('Deactivation failed:', deactivateResponse.reason);
      setStatus(formatErrorMessage(deactivateResponse.reason), 'error');
    }
  } catch (error) {
    setStatus('Failed to deactivate', 'error');
    console.error('Deactivate error:', error);
  }
});

fontDecBtn.addEventListener('click', async () => {
  setStatus(USER_MESSAGES.USE_IN_READER_CONTROLS, 'info');
});

fontIncBtn.addEventListener('click', async () => {
  setStatus(USER_MESSAGES.USE_IN_READER_CONTROLS, 'info');
});

themeToggleBtn.addEventListener('click', async () => {
  try {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    await saveThemePreference(currentTheme);
    updateThemeButtonLabel();
    
    try {
      const response = await sendMessage({ type: 'changeTheme', theme: currentTheme });
      if (response.ok) {
        setStatus(`Theme: ${currentTheme === 'dark' ? 'Dark' : 'Light'}`, 'success');
      }
    } catch {
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

    setStatus('Generating summary...', 'info');
    const summarizeResponse = await sendMessage({ type: 'summarize' });

    if (summarizeResponse.ok) {
      setStatus('Summary will appear in reader mode', 'success');
    } else {
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

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init();

