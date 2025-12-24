/**
 * Constants used for article extraction and sanitization.
 */

export const REMOVED_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'iframe',
  'form',
  'input',
  'button',
  'select',
  'option',
  'textarea',
  'svg',
  'canvas',
]);

export const URL_ATTRS: Record<string, string[]> = {
  img: ['src'],
  a: ['href'],
  video: ['src', 'poster'],
  source: ['src'],
};

export const NAVY_RE = /(nav|breadcrumb|menu|footer|header|aside|comment|promo|sidebar|ad)/i;

