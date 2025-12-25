import { activateReaderMode, deactivateReaderMode, getArticleText, isReaderActive } from '../content/contentScript';
import { changeTheme } from '../content/readerMode';

import { ReaderMessage, ReaderResponse } from './messages';

/**
 * Handle a reader message. This is structured for direct testing; the Chrome
 * runtime wiring will call this from the content script entrypoint.
 * 
 * Note: AI-related messages (getArticleText) are handled here but are
 * independent of core reader functionality.
 */
export function handleReaderMessage(document: Document, message: ReaderMessage): ReaderResponse {
  if (message.type === 'ping') {
    return { ok: true, active: isReaderActive() };
  }

  if (message.type === 'activate') {
    return activateReaderMode(document, {
      threshold: message.options?.threshold,
      theme: message.options?.theme,
      fontScale: message.options?.fontScale,
      showUnavailableNotice: false,
    });
  }

  if (message.type === 'deactivate') {
    return deactivateReaderMode(document);
  }

  if (message.type === 'toggle-reader') {
    // Check if reader is active and toggle
    if (isReaderActive()) {
      return deactivateReaderMode(document);
    } else {
      // Load theme preference for activation
      // Note: This is async but we can't make handleReaderMessage async easily
      // For now, use default theme - user can change via popup
      return activateReaderMode(document, {
        showUnavailableNotice: false,
      });
    }
  }

  if (message.type === 'changeTheme') {
    const result = changeTheme(document, message.theme);
    return {
      ok: result.ok,
      reason: result.reason,
    };
  }

  if (message.type === 'getArticleText') {
    const result = getArticleText(document);
    return {
      ok: result.ok,
      articleText: result.text,
      reason: result.reason,
    };
  }

  if (message.type === 'summarize') {
    // This is handled asynchronously - trigger it but don't wait
    // The actual summary will be displayed via showSummary
    handleSummarizeRequest(document).catch((error) => {
      console.error('Summarize error:', error);
    });
    return { ok: true }; // Return immediately, summary will appear when ready
  }

  return { ok: false, reason: 'unknown_message' };
}

/**
 * Handle summarize request - gets article text and generates summary.
 */
async function handleSummarizeRequest(document: Document): Promise<void> {
  const { showSummary } = await import('../content/readerMode');
  const { getArticleText } = await import('../content/contentScript');

  // Check if reader is active
  if (!isReaderActive()) {
    console.warn('Cannot summarize: reader mode not active');
    return;
  }

  // Step 1: Get article text
  const textResult = getArticleText(document);
  if (!textResult.ok || !textResult.text) {
    console.warn('Failed to get article text:', textResult.reason);
    return;
  }

  // Step 2: Show loading state
  const { SUMMARY_MESSAGES } = await import('../content/constants');
  showSummary(document, SUMMARY_MESSAGES.GENERATING);

  // Step 3: Send to background for summarization
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'summarize',
      text: textResult.text,
    });

    if (response.ok && response.summary) {
      showSummary(document, response.summary);
    } else {
      const errorMsg = response.error ?? 'Unknown error';
      const isNotConfigured = response.errorCode === 'no_api_key';
      
      if (isNotConfigured) {
        // Show error with clickable link to settings
        const linkId = 'sr-settings-link';
        const errorHtml = `${SUMMARY_MESSAGES.NOT_CONFIGURED} <a href="#" id="${linkId}" style="color: #0066cc; text-decoration: underline; cursor: pointer; margin-left: 4px;">${SUMMARY_MESSAGES.CONFIGURE_LINK_TEXT}</a>`;
        showSummary(document, errorHtml, true);
        
        // Add click handler to open options page via background script
        const linkEl = document.getElementById(linkId);
        if (linkEl) {
          linkEl.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
              await chrome.runtime.sendMessage({ type: 'openOptionsPage' });
            } catch (error) {
              console.error('Failed to open options page:', error);
            }
          });
        }
      } else {
        showSummary(document, `Error: ${errorMsg}`);
      }
    }
  } catch (error) {
    showSummary(
      document,
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    console.error('Summarize error:', error);
  }
}

