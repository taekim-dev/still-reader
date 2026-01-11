import { cleanupExtractedContent } from './cleanup';
import { NAVY_RE, SCORING_WEIGHTS, SCORING_THRESHOLDS } from './constants';
import { isVisible, sanitizeClone } from './domUtils';

export interface ExtractOptions {
  threshold?: number;
  baseUrl?: string;
  useMLCleanup?: boolean;
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
    (c) => c.scores.textLength >= MIN_TEXT_LENGTH || c.scores.paragraphCount >= SCORING_THRESHOLDS.MIN_PARAGRAPH_COUNT
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
        cleanupExtractedContent(sanitized, { useMLCleanup: options.useMLCleanup ?? true });
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
  const headingBonus = el.querySelector('h1,h2') ? SCORING_WEIGHTS.HEADING_BONUS : 0;
  const semanticBoost = el.tagName === 'ARTICLE' || el.tagName === 'MAIN' ? SCORING_WEIGHTS.SEMANTIC_BOOST : 0;
  const navPenalty = NAVY_RE.test(el.className) || NAVY_RE.test(el.id) ? SCORING_WEIGHTS.NAV_PENALTY : 0;
  const densityBonus = paragraphCount >= SCORING_WEIGHTS.DENSITY_THRESHOLD 
    ? SCORING_WEIGHTS.DENSITY_BASE_BONUS 
    : paragraphCount * SCORING_WEIGHTS.DENSITY_MULTIPLIER;
  const linkPenalty = linkRatio * SCORING_WEIGHTS.LINK_PENALTY_MULTIPLIER;
  const textScore = textLength / SCORING_WEIGHTS.TEXT_SCORE_DIVISOR;
  const total = textScore + paragraphCount * SCORING_WEIGHTS.PARAGRAPH_MULTIPLIER + densityBonus + headingBonus + semanticBoost - linkPenalty - navPenalty;

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
  return Math.tanh(score / SCORING_WEIGHTS.CONFIDENCE_NORMALIZER);
}

