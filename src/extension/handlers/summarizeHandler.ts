export async function handleSummarizeRequest(document: Document): Promise<void> {
  const { showSummary } = await import('../../content/readerMode');
  const { getArticleText, isReaderActive } = await import('../../content/contentScript');

  if (!isReaderActive()) {
    console.warn('Cannot summarize: reader mode not active');
    return;
  }

  const textResult = getArticleText(document);
  if (!textResult.ok || !textResult.text) {
    console.warn('Failed to get article text:', textResult.reason);
    return;
  }

  const { SUMMARY_MESSAGES } = await import('../../content/constants');
  showSummary(document, SUMMARY_MESSAGES.GENERATING);

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
        const linkId = 'sr-settings-link';
        const errorHtml = `${SUMMARY_MESSAGES.NOT_CONFIGURED} <a href="#" id="${linkId}" style="color: #0066cc; text-decoration: underline; cursor: pointer; margin-left: 4px;">${SUMMARY_MESSAGES.CONFIGURE_LINK_TEXT}</a>`;
        showSummary(document, errorHtml, true);
        
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
