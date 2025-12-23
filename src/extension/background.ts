/**
 * Background service worker. Handles AI summarize requests.
 * 
 * This is completely independent of core reader functionality.
 * If AI is not configured or fails, it gracefully degrades without
 * affecting the reader mode.
 */

import { summarizeText } from '../ai/summarizer';

import { SummarizeMessage, SummarizeResponse } from './messages';
import { getAIConfig, getThemePreference } from './storage';

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-reader') {
    // Get the active tab and send a message to toggle reader mode
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-reader' });
      }
    });
  } else if (command === 'activate-reader') {
    // Quick activate-only shortcut - loads theme preference and activates
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        try {
          // Load theme preference
          const theme = await getThemePreference();
          // Send activate message with theme
          chrome.tabs.sendMessage(tabs[0].id, { 
            type: 'activate',
            options: { theme }
          });
        } catch (error) {
          // If theme loading fails, activate with default theme
          chrome.tabs.sendMessage(tabs[0].id, { 
            type: 'activate'
          });
        }
      }
    });
  }
});

// Listen for summarize requests from popup
chrome.runtime.onMessage.addListener(
  (message: SummarizeMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: SummarizeResponse) => void) => {
    if (message.type === 'summarize') {
      handleSummarize(message.text)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          // Graceful error handling - don't break the app
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'unknown',
          });
        });
      return true; // Keep channel open for async response
    }
    return false;
  }
);

/**
 * Handle summarize request with graceful degradation.
 */
async function handleSummarize(text: string): Promise<SummarizeResponse> {
  // Get AI config from storage (may be null if not configured)
  const config = await getAIConfig();
  
  // Convert storage format to summarizer config
  const summarizerConfig = config && config.apiKey
    ? {
        apiKey: config.apiKey,
        provider: config.provider,
        model: config.model,
        maxTokens: config.maxTokens,
        apiBaseUrl: config.apiBaseUrl, // Pass custom API base URL
      }
    : null;

  // Call the independent AI service
  // This will gracefully handle missing config or API failures
  return summarizeText(text, summarizerConfig);
}

