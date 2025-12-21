/**
 * Popup UI controller. Handles user interactions and communicates with
 * the content script via Chrome messaging.
 */

import { ReaderMessage, ReaderResponse } from './messages';

interface SummarizeResponse {
  ok: boolean;
  summary?: string;
  error?: string;
}

// UI elements
const statusEl = document.getElementById('status') as HTMLElement;
const activateBtn = document.getElementById('activate') as HTMLButtonElement;
const deactivateBtn = document.getElementById('deactivate') as HTMLButtonElement;
const fontDecBtn = document.getElementById('font-dec') as HTMLButtonElement;
const fontIncBtn = document.getElementById('font-inc') as HTMLButtonElement;
const themeToggleBtn = document.getElementById('theme-toggle') as HTMLButtonElement;
const summarizeBtn = document.getElementById('summarize') as HTMLButtonElement;
const summaryContentEl = document.getElementById('summary-content') as HTMLElement;

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
  summarizeBtn.disabled = !active;
}

async function sendMessage(message: ReaderMessage): Promise<ReaderResponse> {
  if (currentTabId === null) {
    throw new Error('No active tab');
  }
  return chrome.tabs.sendMessage(currentTabId, message);
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
    setStatus('Failed to activate', 'error');
    console.error('Activate error:', error);
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
  setStatus('Use in-reader controls', 'info');
});

summarizeBtn.addEventListener('click', async () => {
  try {
    setStatus('Generating summary...', 'info');
    summaryContentEl.style.display = 'block';
    summaryContentEl.textContent = 'Loading...';
    summaryContentEl.className = 'summary-content loading';

    // Get article text from content script
    // For now, we'll need to add a message type to get the text
    // This is a placeholder - in production, we'd get the extracted text
    const text = 'Article text will be retrieved from content script';

    // Send to background worker for summarization
    const response = (await chrome.runtime.sendMessage({
      type: 'summarize',
      text,
    })) as SummarizeResponse;

    if (response.ok && response.summary) {
      summaryContentEl.textContent = response.summary;
      summaryContentEl.className = 'summary-content';
      setStatus('Summary generated', 'success');
    } else {
      summaryContentEl.textContent = `Error: ${response.error ?? 'Unknown error'}`;
      summaryContentEl.className = 'summary-content';
      setStatus('Summary failed', 'error');
    }
  } catch (error) {
    summaryContentEl.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    summaryContentEl.className = 'summary-content';
    setStatus('Summary failed', 'error');
    console.error('Summarize error:', error);
  }
});

// Initialize on load
init();

