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

/**
 * Scoring weights and thresholds for article extraction algorithm.
 */
export const SCORING_WEIGHTS = {
  HEADING_BONUS: 10,
  SEMANTIC_BOOST: 15,
  NAV_PENALTY: 20,
  LINK_PENALTY_MULTIPLIER: 40,
  TEXT_SCORE_DIVISOR: 120,
  PARAGRAPH_MULTIPLIER: 3,
  DENSITY_THRESHOLD: 5,
  DENSITY_BASE_BONUS: 10,
  DENSITY_MULTIPLIER: 1.5,
  CONFIDENCE_NORMALIZER: 80,
} as const;

export const SCORING_THRESHOLDS = {
  MIN_PARAGRAPH_COUNT: 2,
  MIN_RELATED_LINK_COUNT: 5,
  RELATED_LINK_RATIO: 2,
} as const;

