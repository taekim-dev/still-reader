/**
 * Cleanup functions for removing non-article content from extracted elements.
 * Uses pattern matching to identify and remove navigation, ads, related content, etc.
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

/**
 * Post-extraction cleanup: removes navigation, footer, related content, and other non-article elements.
 * Uses pattern matching to work across different sites.
 */
export function cleanupExtractedContent(element: HTMLElement): void {
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

