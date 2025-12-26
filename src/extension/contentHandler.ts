import { activateReaderMode, deactivateReaderMode, getArticleText, isReaderActive } from '../content/contentScript';
import { changeTheme } from '../content/readerMode';

import { handleSummarizeRequest } from './handlers/summarizeHandler';
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
    handleSummarizeRequest(document).catch((error) => {
      console.error('Summarize error:', error);
    });
    return { ok: true };
  }

  return { ok: false, reason: 'unknown_message' };
}

