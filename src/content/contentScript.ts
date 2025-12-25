import { extractArticle } from '../extraction/extractor';

import { DEFAULT_TITLE, ELEMENT_IDS, NOTICE_STYLES } from './constants';
import { activateReader, deactivateReader, isReaderActive, ReaderContent } from './readerMode';

export interface ActivationOptions {
  threshold?: number;
  theme?: ReaderContent['theme'];
  fontScale?: number;
  showUnavailableNotice?: boolean;
}

export interface ActivationResult {
  ok: boolean;
  reason?: string;
  confidence?: number;
  textLength?: number;
}

export function activateReaderMode(document: Document, options: ActivationOptions = {}): ActivationResult {
  const extraction = extractArticle(document, { threshold: options.threshold });

  if ('unavailable' in extraction && extraction.unavailable) {
    if (options.showUnavailableNotice) {
      injectNotice(document, 'Reader mode not available for this page.');
    }
    return { ok: false, reason: extraction.reason ?? 'unavailable', confidence: extraction.confidence };
  }

  const { html, text, confidence } = extraction;
  const title = document.title || DEFAULT_TITLE;

  const result = activateReader(document, {
    html,
    title,
    theme: options.theme,
    fontScale: options.fontScale,
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason ?? 'activation_failed', confidence };
  }

  return {
    ok: true,
    confidence,
    textLength: text.length,
  };
}

export function deactivateReaderMode(document: Document): ActivationResult {
  const result = deactivateReader(document);
  return { ok: result.ok, reason: result.reason };
}

function injectNotice(document: Document, message: string): void {
  const existing = document.getElementById(ELEMENT_IDS.UNAVAILABLE);
  if (existing) return;

  const container = document.createElement('div');
  container.id = ELEMENT_IDS.UNAVAILABLE;
  container.style.position = NOTICE_STYLES.position;
  container.style.bottom = `${NOTICE_STYLES.bottom}px`;
  container.style.right = `${NOTICE_STYLES.right}px`;
  container.style.padding = `${NOTICE_STYLES.padding.vertical}px ${NOTICE_STYLES.padding.horizontal}px`;
  container.style.background = NOTICE_STYLES.background;
  container.style.color = NOTICE_STYLES.color;
  container.style.fontFamily = NOTICE_STYLES.fontFamily;
  container.style.fontSize = `${NOTICE_STYLES.fontSize}px`;
  container.style.borderRadius = `${NOTICE_STYLES.borderRadius}px`;
  container.style.boxShadow = NOTICE_STYLES.boxShadow;
  container.style.zIndex = NOTICE_STYLES.zIndex.toString();
  container.textContent = message;

  document.body.appendChild(container);
}

/**
 * Get article text for AI summarization.
 * This is independent of reader mode activation - it just extracts text.
 */
export function getArticleText(document: Document): { ok: boolean; text?: string; reason?: string } {
  const extraction = extractArticle(document);
  
  if ('unavailable' in extraction && extraction.unavailable) {
    return { ok: false, reason: extraction.reason ?? 'unavailable' };
  }
  
  return { ok: true, text: extraction.text };
}

export { isReaderActive };

