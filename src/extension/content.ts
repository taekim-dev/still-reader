import { handleReaderMessage } from './contentHandler';
import { ReaderMessage, ReaderResponse } from './messages';

export function restoreScrollPosition(): void {
  try {
    const scrollDataStr = sessionStorage.getItem('still-reader-scroll-restore');
    if (!scrollDataStr) return;

    const scrollData = JSON.parse(scrollDataStr);
    
    if (scrollData.url !== window.location.href) {
      sessionStorage.removeItem('still-reader-scroll-restore');
      return;
    }

    const restoreScroll = () => {
      window.scrollTo(scrollData.x, scrollData.y);
      sessionStorage.removeItem('still-reader-scroll-restore');
    };

    if (document.readyState === 'complete') {
      restoreScroll();
    } else {
      window.addEventListener('load', restoreScroll, { once: true });
    }
  } catch (error) {
    console.warn('Failed to restore scroll position:', error);
    sessionStorage.removeItem('still-reader-scroll-restore');
  }
}

restoreScrollPosition();

chrome.runtime.onMessage.addListener(
  (message: ReaderMessage, _sender, sendResponse: (response: ReaderResponse) => void) => {
    const response = handleReaderMessage(document, message);
    sendResponse(response);
    return true;
  }
);

document.addEventListener('sr-summarize', () => {
  handleReaderMessage(document, { type: 'summarize' });
});

