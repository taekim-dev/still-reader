import { ReaderMessage, ReaderResponse } from '../messages';

export async function sendMessageWithRetry(
  tabId: number,
  message: ReaderMessage
): Promise<ReaderResponse> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Could not establish connection')) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js'],
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
        return await chrome.tabs.sendMessage(tabId, message);
      } catch (injectError) {
        throw new Error(`Content script failed to load: ${injectError instanceof Error ? injectError.message : String(injectError)}`);
      }
    }
    throw error;
  }
}

