/**
 * Background service worker. Handles AI summarize requests and other
 * background tasks.
 */

interface SummarizeMessage {
  type: 'summarize';
  text: string;
  apiKey?: string;
}

interface SummarizeResponse {
  ok: boolean;
  summary?: string;
  error?: string;
}

// Listen for summarize requests from content script
chrome.runtime.onMessage.addListener(
  (message: SummarizeMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: SummarizeResponse) => void) => {
    if (message.type === 'summarize') {
      handleSummarize(message.text, message.apiKey)
        .then((summary) => {
          sendResponse({ ok: true, summary });
        })
        .catch((error) => {
          sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
        });
      return true; // Keep channel open for async response
    }
    return false;
  }
);

async function handleSummarize(text: string, apiKey?: string): Promise<string> {
  // For now, return a placeholder. In production, this would call an LLM API.
  // The API key should be stored securely (e.g., chrome.storage.sync) and not
  // passed directly in messages.
  if (!apiKey) {
    throw new Error('API key required');
  }

  // Placeholder: In production, make actual API call
  // Example: OpenAI, Anthropic, etc.
  await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate API call

  // For now, return a simple summary placeholder
  const wordCount = text.split(/\s+/).length;
  return `This article contains approximately ${wordCount} words. AI summarization will be implemented in a future update.`;
}

