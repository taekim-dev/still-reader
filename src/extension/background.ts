import { summarizeText } from '../ai/summarizer';

import { BackgroundMessage, BackgroundResponse, SummarizeMessage, SummarizeResponse } from './messages';
import { getAIConfig } from './storage/aiConfig';
import { getThemePreference } from './storage/theme';

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-reader') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-reader' });
      }
    });
  } else if (command === 'activate-reader') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        try {
          const theme = await getThemePreference();
          chrome.tabs.sendMessage(tabs[0].id, { 
            type: 'activate',
            options: { theme }
          });
        } catch (error) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            type: 'activate'
          });
        }
      }
    });
  } else if (command === 'summarize') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'summarize' });
      }
    });
  }
});

chrome.runtime.onMessage.addListener(
  (message: SummarizeMessage | BackgroundMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: SummarizeResponse | BackgroundResponse) => void) => {
    if (message.type === 'summarize') {
      handleSummarize((message as SummarizeMessage).text)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'unknown',
          });
        });
      return true;
    }
    
    if (message.type === 'openOptionsPage') {
      chrome.runtime.openOptionsPage();
      sendResponse({ ok: true });
      return false;
    }
    
    return false;
  }
);

async function handleSummarize(text: string): Promise<SummarizeResponse> {
  const config = await getAIConfig();
  
  const summarizerConfig = config && config.apiKey
    ? {
        apiKey: config.apiKey,
        provider: config.provider,
        model: config.model,
        maxTokens: config.maxTokens,
        apiBaseUrl: config.apiBaseUrl,
      }
    : null;

  return summarizeText(text, summarizerConfig);
}

