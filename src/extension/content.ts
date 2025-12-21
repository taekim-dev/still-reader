/**
 * Content script entry point. Listens for Chrome runtime messages and delegates
 * to the content handler.
 */

import { handleReaderMessage } from './contentHandler';
import { ReaderMessage, ReaderResponse } from './messages';

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  (message: ReaderMessage, _sender, sendResponse: (response: ReaderResponse) => void) => {
    const response = handleReaderMessage(document, message);
    sendResponse(response);
    return true; // Keep channel open for async response if needed
  }
);

