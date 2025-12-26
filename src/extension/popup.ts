import { ReaderMessage, ReaderResponse } from './messages';
import {
  createActivateHandler,
  createDeactivateHandler,
  createFontDecHandler,
  createFontIncHandler,
  createSettingsHandler,
  createSummarizeHandler,
  createThemeToggleHandler,
  PopupHandlers,
} from './popup/handlers';
import { getThemePreference } from './storage/theme';
import { setStatus as setStatusUtil } from './ui/status';
import { sendMessageWithRetry } from './utils/messaging';

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
  return sendMessageWithRetry(currentTabId, message);
}

const handlers: PopupHandlers = {
  sendMessage,
  setStatus,
  updateUI,
  updateThemeButtonLabel,
  getCurrentTheme: () => currentTheme,
  setCurrentTheme: (theme) => { currentTheme = theme; },
};

activateBtn.addEventListener('click', createActivateHandler(handlers));
deactivateBtn.addEventListener('click', createDeactivateHandler(handlers));
fontDecBtn.addEventListener('click', createFontDecHandler(handlers));
fontIncBtn.addEventListener('click', createFontIncHandler(handlers));
themeToggleBtn.addEventListener('click', createThemeToggleHandler(handlers));
summarizeBtn.addEventListener('click', createSummarizeHandler(handlers));
settingsBtn.addEventListener('click', createSettingsHandler());

init();

