import { activateReaderMode, deactivateReaderMode, getArticleText } from '../content/contentScript';

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
    return { ok: true };
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

  if (message.type === 'getArticleText') {
    const result = getArticleText(document);
    return {
      ok: result.ok,
      articleText: result.text,
      reason: result.reason,
    };
  }

  return { ok: false, reason: 'unknown_message' };
}

