import { activateReaderMode, deactivateReaderMode, getArticleText, isReaderActive } from '../content/contentScript';
import { changeTheme } from '../content/readerMode';

import { handleSummarizeRequest } from './handlers/summarizeHandler';
import { ReaderMessage, ReaderResponse } from './messages';

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
    if (isReaderActive()) {
      return deactivateReaderMode(document);
    } else {
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

