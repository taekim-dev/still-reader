export interface ExtractOptions {
  threshold?: number;
  baseUrl?: string;
}

export type ExtractResult =
  | {
      unavailable: true;
      reason: string;
      confidence?: number;
    }
  | {
      unavailable?: false;
      html: string;
      text: string;
      confidence: number;
      reason?: string;
    };

interface ScoreComponents {
  textLength: number;
  paragraphCount: number;
  linkRatio: number;
  headingBonus: number;
  semanticBoost: number;
  navPenalty: number;
  densityBonus: number;
  textScore: number;
  linkPenalty: number;
  total: number;
}

const NAVY_RE = /(nav|breadcrumb|menu|footer|header|aside|comment|promo|sidebar|ad)/i;
const REMOVED_TAGS = new Set([
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

const URL_ATTRS: Record<string, string[]> = {
  img: ['src'],
  a: ['href'],
  video: ['src', 'poster'],
  source: ['src'],
};

const CANDIDATE_SELECTOR = 'article, main, div, section';
const MIN_TEXT_LENGTH = 150;

export function extractArticle(document: Document, options: ExtractOptions = {}): ExtractResult {
  const threshold = options.threshold ?? 0.35;
  const baseUrl = options.baseUrl ?? document.location?.href ?? 'http://localhost/';

  const elements = Array.from(document.querySelectorAll(CANDIDATE_SELECTOR));
  const candidates = elements
    .filter((el) => isVisible(el))
    .map((el) => {
      const scores = scoreElement(el);
      return { el, scores, total: scores.total };
    })
    .filter((c) => c.scores.textLength >= MIN_TEXT_LENGTH || c.scores.paragraphCount >= 2);

  if (!candidates.length) {
    return { unavailable: true, reason: 'No viable candidates found' };
  }

  candidates.sort((a, b) => b.total - a.total);
  const [top] = candidates;
  const confidence = normalizeConfidence(top.total);

  if (confidence < threshold) {
    return { unavailable: true, reason: 'Confidence below threshold', confidence };
  }

  const sanitized = sanitizeClone(top.el, baseUrl);
  cleanupExtractedContent(sanitized);
  const html = sanitized.innerHTML.trim();
  const text = sanitized.textContent?.trim() ?? '';

  if (!html || text.length < MIN_TEXT_LENGTH) {
    return { unavailable: true, reason: 'Extracted content too small', confidence };
  }

  return {
    html,
    text,
    confidence: Number(confidence.toFixed(3)),
    reason: 'ok',
  };
}

function isVisible(el: Element): boolean {
  const textLength = el.textContent?.trim().length ?? 0;
  const hiddenByStyle =
    (el as HTMLElement).style?.display === 'none' ||
    (el as HTMLElement).style?.visibility === 'hidden' ||
    el.getAttribute('hidden') !== null;
  return !hiddenByStyle && textLength > 0;
}

function scoreElement(el: Element): ScoreComponents {
  const text = el.textContent?.trim() ?? '';
  const textLength = text.length;
  const paragraphCount = el.querySelectorAll('p').length;
  const linkTextLength = Array.from(el.querySelectorAll('a')).reduce(
    (acc, anchor) => acc + (anchor.textContent?.length ?? 0),
    0,
  );
  const linkRatio = textLength ? linkTextLength / textLength : 0;
  const headingBonus = el.querySelector('h1,h2') ? 10 : 0;
  const semanticBoost = el.tagName === 'ARTICLE' || el.tagName === 'MAIN' ? 15 : 0;
  const navPenalty = NAVY_RE.test(el.className) || NAVY_RE.test(el.id) ? 20 : 0;
  const densityBonus = paragraphCount >= 5 ? 10 : paragraphCount * 1.5;
  const linkPenalty = linkRatio * 40;
  const textScore = textLength / 120;
  const total = textScore + paragraphCount * 3 + densityBonus + headingBonus + semanticBoost - linkPenalty - navPenalty;

  return {
    textLength,
    paragraphCount,
    linkRatio,
    headingBonus,
    semanticBoost,
    navPenalty,
    densityBonus,
    textScore,
    linkPenalty,
    total,
  };
}

function normalizeConfidence(score: number): number {
  return Math.tanh(score / 80);
}

function sanitizeClone(element: Element, baseUrl: string): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;
  const walker = element.ownerDocument.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);
  const toRemove: Element[] = [];

  while (walker.nextNode()) {
    const el = walker.currentNode as Element;
    const tag = el.tagName.toLowerCase();

    if (REMOVED_TAGS.has(tag)) {
      toRemove.push(el);
      continue;
    }

    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on') || attr.name === 'style') {
        el.removeAttribute(attr.name);
      }
    });

    const attrs = URL_ATTRS[tag];
    if (attrs) {
      attrs.forEach((attrName) => {
        if (el.hasAttribute(attrName)) {
          const value = el.getAttribute(attrName);
          if (value) {
            try {
              el.setAttribute(attrName, new URL(value, baseUrl).toString());
            } catch {
              // ignore bad URLs
            }
          }
        }
      });
    }
  }

  toRemove.forEach((node) => node.parentNode?.removeChild(node));
  return clone;
}

/**
 * Post-extraction cleanup: removes navigation, footer, related content, and other non-article elements.
 * Uses pattern matching to work across different sites.
 * Conservative approach: only removes elements that are clearly non-content.
 */
function cleanupExtractedContent(element: HTMLElement): void {
  const toRemove: Element[] = [];

  // Pattern matching for class names and attributes
  const isNavigation = (el: Element): boolean => {
    const className = el.className || '';
    const id = el.id || '';
    const section = el.getAttribute('section');
    const dataLocation = el.getAttribute('data-location');
    const ariaLabel = el.getAttribute('aria-label');

    // Semantic selectors - be specific
    if (el.tagName === 'HEADER' && (id === 'site-nav' || section === 'nav')) {
      return true;
    }
    if (el.tagName === 'NAV' && (section === 'top' || ariaLabel === 'site')) {
      return true;
    }

    // Attribute-based patterns
    if (dataLocation === 'HEADER') {
      return true;
    }
    if (section === 'nav' && el.tagName !== 'ARTICLE' && el.tagName !== 'MAIN') {
      return true;
    }

    // Class-based pattern matching (be specific to avoid false positives)
    const navPatterns = /(siteheader|site-header|siteheadermasthead|siteheadernavigation)/i;
    if (navPatterns.test(className) || navPatterns.test(id)) {
      return true;
    }

    return false;
  };

  const isFooter = (el: Element): boolean => {
    const className = el.className || '';
    const id = el.id || '';
    const dataLocation = el.getAttribute('data-location');

    // Semantic selector
    if (el.tagName === 'FOOTER') {
      return true;
    }

    // Attribute-based
    if (dataLocation === 'FOOTER') {
      return true;
    }

    // Class-based pattern matching (be specific)
    const footerPatterns = /(cat-footer|site-footer|main-footer|page-footer)/i;
    if (footerPatterns.test(className) || footerPatterns.test(id)) {
      return true;
    }

    return false;
  };

  const isRelatedContent = (el: Element): boolean => {
    const className = el.className || '';
    const text = el.textContent?.toLowerCase() || '';
    const linkCount = el.querySelectorAll('a').length;
    const paragraphCount = el.querySelectorAll('p').length;

    // Pattern matching for related content class names (specific patterns)
    const relatedPatterns = /(bestlistlinkblock|articlelinkblock)/i;
    if (relatedPatterns.test(className)) {
      return true;
    }

    // Heuristic: sections with headings like "Guides", "Related" and high link density
    // Only if it's a smaller section (not the main article)
    const hasRelatedHeading = /^(guides?|related|recommended|you may also|read more|similar)/i.test(text.trim().substring(0, 50));
    if (hasRelatedHeading && linkCount > 5 && paragraphCount < linkCount && linkCount > paragraphCount * 2) {
      return true;
    }

    return false;
  };

  const isVideoPlayer = (el: Element): boolean => {
    const className = el.className || '';
    const tag = el.tagName.toLowerCase();
    const videoLocation = el.getAttribute('data-video-location');
    const videoPlacement = el.getAttribute('data-video-article-placement');

    // Remove sticky video sections (modal videos, watch and read sections)
    if (videoLocation === 'MODAL' || videoPlacement === 'Watch and Read') {
      return true;
    }
    if (className.includes('c-avStickyVideo') || className.includes('c-CnetAvStickyVideo')) {
      return true;
    }

    // Remove detailed video player elements but keep containers
    if (tag === 'video-js') {
      return true;
    }
    // Remove video.js internal elements (but not the container divs)
    if (className.includes('vjs-') && !className.includes('c-avVideo') && !className.includes('c-avStickyVideo')) {
      return true;
    }

    return false;
  };

  const isAdContainer = (el: Element): boolean => {
    const className = el.className || '';
    const dataAd = el.getAttribute('data-ad');
    const dataAdCallout = el.getAttribute('data-ad-callout');

    // All ad containers
    if (dataAd || dataAdCallout) {
      return true;
    }

    // Pattern matching for ad-related classes
    const adPatterns = /(adDisplay|adContainer|advertisement|ad-slot|ad-unit|adSkyBox)/i;
    if (adPatterns.test(className)) {
      return true;
    }

    return false;
  };

  const isArticleMeta = (el: Element): boolean => {
    const className = el.className || '';

    // Remove article header meta containers (breadcrumbs, navigation)
    if (className.includes('c-articleHeader_metaContainer') || className.includes('c-articleHeader_meta')) {
      return true;
    }
    // Remove breadcrumb navigation
    if (className.includes('c-topicBreadcrumbs')) {
      return true;
    }

    return false;
  };

  const isAuthorCard = (el: Element): boolean => {
    const className = el.className || '';
    const section = el.getAttribute('section');
    const dataCy = el.getAttribute('data-cy');

    // Remove author image cards
    if (className.includes('c-globalAuthorImage') || className.includes('c-globalAuthorCard')) {
      return true;
    }
    if (section === 'authorCard' || dataCy === 'globalAuthorImage') {
      return true;
    }

    return false;
  };

  const isScreenReaderTitle = (el: Element): boolean => {
    // Remove screen-reader-only titles (typically redundant if title is in main content)
    // These can be any element with sr-title class
    const className = el.className || '';
    if (typeof className === 'string' && className.includes('sr-title')) {
      return true;
    }
    // Also check classList if available
    if (el.classList && el.classList.contains('sr-title')) {
      return true;
    }

    return false;
  };

  // First, directly remove all sr-title elements using querySelector
  const srTitleElements = element.querySelectorAll('.sr-title');
  srTitleElements.forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  // Walk the tree and collect elements to remove
  // Use a more targeted approach: query for specific patterns first
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const el = walker.currentNode as Element;

    // Skip the root element itself
    if (el === element) {
      continue;
    }

    // Check each category
    if (
      isNavigation(el) ||
      isFooter(el) ||
      isRelatedContent(el) ||
      isVideoPlayer(el) ||
      isAdContainer(el) ||
      isArticleMeta(el) ||
      isAuthorCard(el) ||
      isScreenReaderTitle(el)
    ) {
      toRemove.push(el);
    }
  }

  // Remove collected elements (in reverse order to avoid issues with parent removal)
  toRemove.reverse().forEach((node) => {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  });
}

