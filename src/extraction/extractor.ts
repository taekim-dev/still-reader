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

