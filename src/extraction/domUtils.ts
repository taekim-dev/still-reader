/**
 * DOM utility functions for element visibility and sanitization.
 */

import { REMOVED_TAGS, URL_ATTRS } from './constants';

/**
 * Check if an element is visible (not hidden by CSS or attributes).
 */
export function isVisible(el: Element): boolean {
  const textLength = el.textContent?.trim().length ?? 0;
  const hiddenByStyle =
    (el as HTMLElement).style?.display === 'none' ||
    (el as HTMLElement).style?.visibility === 'hidden' ||
    el.getAttribute('hidden') !== null;
  return !hiddenByStyle && textLength > 0;
}

/**
 * Clone and sanitize an element: remove dangerous tags/attributes and normalize URLs.
 */
export function sanitizeClone(element: Element, baseUrl: string): HTMLElement {
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

