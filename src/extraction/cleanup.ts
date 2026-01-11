/**
 * Cleanup functions for removing non-article content from extracted elements.
 * Uses pattern matching to identify and remove navigation, ads, related content, etc.
 * Supports optional ML-based cleanup (disabled by default).
 */

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
import { extractElementFeatures } from './ml/features';
import { shouldKeepElement } from './ml/inference';

export interface CleanupOptions {
  /**
   * Whether to use ML-based cleanup (disabled by default).
   * When enabled, uses ML model to classify elements, with pattern matching as fallback.
   */
  useMLCleanup?: boolean;
}

/**
 * Post-extraction cleanup: removes navigation, footer, related content, and other non-article elements.
 * Uses pattern matching to work across different sites.
 * 
 * @param element - The HTML element to clean up
 * @param options - Cleanup options (ML cleanup disabled by default)
 */
export function cleanupExtractedContent(element: HTMLElement, options: CleanupOptions = {}): void {
  const useMLCleanup = options.useMLCleanup ?? false;
  
  if (useMLCleanup) {
    try {
      cleanupWithML(element);
    } catch (error) {
      console.warn('ML cleanup failed, falling back to pattern matching:', error);
      cleanupWithPatternMatching(element);
    }
  } else {
    cleanupWithPatternMatching(element);
  }
}

/**
 * Cleanup using ML model (with pattern matching fallback).
 * ML is used for high-confidence predictions; pattern matching is used otherwise.
 */
function cleanupWithML(element: HTMLElement): void {
  const toRemove: Element[] = [];
  
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const el = walker.currentNode as Element;
    
    if (el === element) {
      continue;
    }
    
    try {
      const features = extractElementFeatures(el);
      const mlResult = shouldKeepElement(features);
      
      if (mlResult.confidence > 0.7) {
        if (!mlResult.keep) {
          toRemove.push(el);
        }
      } else {
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
    } catch (error) {
      console.warn('ML inference failed for element, using pattern matching:', error);
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
  }
  
  toRemove.reverse().forEach((node) => {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  });
}

/**
 * Cleanup using pattern matching (current implementation).
 */
function cleanupWithPatternMatching(element: HTMLElement): void {
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

