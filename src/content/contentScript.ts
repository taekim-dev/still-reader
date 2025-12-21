import { extractArticle } from '../extraction/extractor';

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
  const title = document.title || 'Reader';

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
  const existing = document.getElementById('still-reader-unavailable');
  if (existing) return;

  const container = document.createElement('div');
  container.id = 'still-reader-unavailable';
  container.style.position = 'fixed';
  container.style.bottom = '16px';
  container.style.right = '16px';
  container.style.padding = '12px 16px';
  container.style.background = '#111';
  container.style.color = '#f5f5f5';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  container.style.fontSize = '14px';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)';
  container.style.zIndex = '2147483647';
  container.textContent = message;

  document.body.appendChild(container);
}

export { isReaderActive };

