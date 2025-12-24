import { NAVY_RE } from './constants';
import { isVisible, sanitizeClone } from './domUtils';
import {
  isNavigation,
  isFooter,
  isRelatedContent,
  isVideoPlayer,
  isAdContainer,
  isArticleMeta,
  isAuthorCard,
  isScreenReaderTitle,
} from './elementMatchers';

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

const CANDIDATE_SELECTOR = 'article, main, div, section';
const MIN_TEXT_LENGTH = 150;

export function extractArticle(document: Document, options: ExtractOptions = {}): ExtractResult {
  const threshold = options.threshold ?? 0.35;
  const baseUrl = options.baseUrl ?? document.location?.href ?? 'http://localhost/';

  // Step 1: Find all potential article container elements
  const elements = Array.from(document.querySelectorAll(CANDIDATE_SELECTOR));

  // Step 2: Filter to only visible elements with content
  const visibleElements = elements.filter((el) => isVisible(el));

  // Step 3: Score each candidate element
  const scoredCandidates = visibleElements.map((el) => {
    const scores = scoreElement(el);
    return { el, scores, total: scores.total };
  });

  // Step 4: Filter by minimum requirements (text length or paragraph count)
  const candidates = scoredCandidates.filter(
    (c) => c.scores.textLength >= MIN_TEXT_LENGTH || c.scores.paragraphCount >= 2
  );

  // Step 5: Check if we have any viable candidates
  if (!candidates.length) {
    return { unavailable: true, reason: 'No viable candidates found' };
  }

  // Step 6: Sort by score and pick the best candidate
  candidates.sort((a, b) => b.total - a.total);
  const [top] = candidates;

  // Step 7: Calculate confidence and check against threshold
  const confidence = normalizeConfidence(top.total);
  if (confidence < threshold) {
    return { unavailable: true, reason: 'Confidence below threshold', confidence };
  }

  // Step 8: Sanitize, cleanup, and extract final content
  const sanitized = sanitizeClone(top.el, baseUrl);
  cleanupExtractedContent(sanitized);
  const html = sanitized.innerHTML.trim();
  const text = sanitized.textContent?.trim() ?? '';

  // Final validation: ensure extracted content meets minimum size
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

/**
 * Post-extraction cleanup: removes navigation, footer, related content, and other non-article elements.
 * Uses pattern matching to work across different sites.
 */
function cleanupExtractedContent(element: HTMLElement): void {
  const toRemove: Element[] = [];

  // Step 1: Remove screen-reader-only titles directly
  const srTitleElements = element.querySelectorAll('.sr-title');
  srTitleElements.forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  // Step 2: Walk the DOM tree and collect elements to remove
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const el = walker.currentNode as Element;

    if (el === element) {
      continue;
    }

    // Step 3: Check if element matches any non-content pattern
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

  // Step 4: Remove collected elements (in reverse order to avoid parent removal issues)
  toRemove.reverse().forEach((node) => {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  });
}

