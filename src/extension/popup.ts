/**
 * Popup UI controller. Handles user interactions and communicates with
 * the content script via Chrome messaging.
 */

import { ReaderMessage, ReaderResponse } from './messages';

// UI elements
const statusEl = document.getElementById('status') as HTMLElement;
const activateBtn = document.getElementById('activate') as HTMLButtonElement;
const deactivateBtn = document.getElementById('deactivate') as HTMLButtonElement;
const fontDecBtn = document.getElementById('font-dec') as HTMLButtonElement;
const fontIncBtn = document.getElementById('font-inc') as HTMLButtonElement;
const themeToggleBtn = document.getElementById('theme-toggle') as HTMLButtonElement;

let currentTabId: number | null = null;

// Initialize: get current tab and check reader status
async function init(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      setStatus('No active tab', 'error');
      return;
    }
    currentTabId = tab.id;

    // Ping content script to check if reader is active
    try {
      await sendMessage({ type: 'ping' });
      // If ping succeeds, reader might be active (we'll update UI based on response)
      updateUI(false); // Start with inactive state, will update after checking
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
    const activateResponse = await sendMessage({ type: 'activate' });
    if (activateResponse.ok) {
      setStatus('Reader activated', 'success');
      updateUI(true);
    } else {
      setStatus(`Failed: ${activateResponse.reason ?? 'unknown'}`, 'error');
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
  setStatus('Use in-reader controls', 'info');
});

// Initialize on load
init();

