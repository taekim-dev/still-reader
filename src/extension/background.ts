import { handleActivateReader, handleSummarizeCommand, handleToggleReader } from './background/commands';
import { handleOpenOptionsPage, handleSummarizeMessage } from './background/messages';
import { BackgroundMessage, BackgroundResponse, SummarizeMessage, SummarizeResponse } from './messages';

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-reader') {
    await handleToggleReader();
  } else if (command === 'activate-reader') {
    await handleActivateReader();
  } else if (command === 'summarize') {
    await handleSummarizeCommand();
  }
});

chrome.runtime.onMessage.addListener(
  (message: SummarizeMessage | BackgroundMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: SummarizeResponse | BackgroundResponse) => void) => {
    if (message.type === 'summarize') {
      handleSummarizeMessage((message as SummarizeMessage).text)
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
      handleOpenOptionsPage();
      sendResponse({ ok: true });
      return false;
    }
    
    return false;
  }
);

