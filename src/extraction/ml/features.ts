/**
 * Feature extraction for ML-based cleanup.
 * Extracts features from DOM elements for classification.
 */

import type { FeatureVector } from './types';

const TAG_ENCODINGS: Record<string, number> = {
  div: 0,
  p: 1,
  article: 2,
  section: 3,
  main: 4,
  aside: 5,
  nav: 6,
  header: 7,
  footer: 8,
  span: 9,
  a: 10,
  img: 11,
  video: 12,
  iframe: 13,
  script: 14,
  style: 15,
  other: 16,
};

const NAV_PATTERNS = /(nav|breadcrumb|menu|header|siteheader|site-header|siteheadermasthead|siteheadernavigation)/i;
const AD_PATTERNS = /(adDisplay|adContainer|advertisement|ad-slot|ad-unit|adSkyBox|data-ad)/i;
const FOOTER_PATTERNS = /(cat-footer|site-footer|main-footer|page-footer|footer)/i;
const RELATED_PATTERNS = /(bestlistlinkblock|articlelinkblock|related|recommended|you may also|read more|similar)/i;
const VIDEO_PATTERNS = /(video-js|vjs-|c-avStickyVideo|c-CnetAvStickyVideo|video-js)/i;
const META_PATTERNS = /(c-articleHeader_metaContainer|c-articleHeader_meta|c-topicBreadcrumbs|breadcrumb)/i;
const AUTHOR_PATTERNS = /(c-globalAuthorImage|c-globalAuthorCard|authorCard|globalAuthor)/i;

const MAX_DEPTH = 20;
const MAX_CHILD_COUNT = 100;
const MAX_SIBLING_COUNT = 50;
const MAX_TEXT_LENGTH = 10000;
const MAX_PARAGRAPH_COUNT = 50;
const MAX_LINK_COUNT = 100;
const MAX_IMAGE_COUNT = 20;
const MAX_CLASS_NAME_LENGTH = 200;
const MAX_ID_LENGTH = 100;

function normalize(value: number, max: number): number {
  return Math.min(value / max, 1);
}

function encodeTagName(tagName: string): number {
  const normalized = tagName.toLowerCase();
  return TAG_ENCODINGS[normalized] ?? TAG_ENCODINGS.other;
}

function normalizeTagEncoding(encoded: number): number {
  return encoded / (Object.keys(TAG_ENCODINGS).length - 1);
}

function calculateDepth(element: Element): number {
  let depth = 0;
  let current: Element | null = element;
  while (current?.parentElement && current.parentElement !== current.ownerDocument.body) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}

/**
 * Extract features from a DOM element for ML classification.
 * 
 * @param element - The DOM element to extract features from
 * @returns Feature vector for ML model (all values normalized to [0, 1])
 */
export function extractElementFeatures(element: Element): FeatureVector {
  const tagName = element.tagName.toLowerCase();
  const className = (element.className || '').toString();
  const id = element.id || '';
  const textContent = element.textContent?.trim() || '';
  const textLength = textContent.length;
  
  const depth = calculateDepth(element);
  const childCount = element.children.length;
  const siblingCount = element.parentElement 
    ? Array.from(element.parentElement.children).length - 1 
    : 0;
  
  const paragraphCount = element.querySelectorAll('p').length;
  const linkCount = element.querySelectorAll('a').length;
  const linkTextLength = Array.from(element.querySelectorAll('a')).reduce(
    (acc, anchor) => acc + (anchor.textContent?.length ?? 0),
    0
  );
  const linkRatio = textLength > 0 ? linkTextLength / textLength : 0;
  const imageCount = element.querySelectorAll('img').length;
  
  const hasHeading = element.querySelector('h1, h2, h3, h4, h5, h6') !== null ? 1 : 0;
  const hasSemanticTag = ['article', 'main', 'section'].includes(tagName) ? 1 : 0;
  const hasList = element.querySelector('ul, ol') !== null ? 1 : 0;
  
  const hasNavPattern = NAV_PATTERNS.test(className) || NAV_PATTERNS.test(id) || 
    element.getAttribute('section') === 'nav' || 
    element.getAttribute('data-location') === 'HEADER' ? 1 : 0;
  
  const hasAdPattern = AD_PATTERNS.test(className) || 
    element.hasAttribute('data-ad') || 
    element.hasAttribute('data-ad-callout') ? 1 : 0;
  
  const hasFooterPattern = FOOTER_PATTERNS.test(className) || 
    FOOTER_PATTERNS.test(id) || 
    element.getAttribute('data-location') === 'FOOTER' ||
    tagName === 'footer' ? 1 : 0;
  
  const hasRelatedPattern = RELATED_PATTERNS.test(className) || 
    RELATED_PATTERNS.test(textContent.toLowerCase().substring(0, 50)) ? 1 : 0;
  
  const hasVideoPattern = VIDEO_PATTERNS.test(className) || 
    tagName === 'video-js' ||
    element.getAttribute('data-video-location') === 'MODAL' ||
    element.getAttribute('data-video-article-placement') === 'Watch and Read' ? 1 : 0;
  
  const hasMetaPattern = META_PATTERNS.test(className) ? 1 : 0;
  const hasAuthorPattern = AUTHOR_PATTERNS.test(className) || 
    element.getAttribute('section') === 'authorCard' ||
    element.getAttribute('data-cy') === 'globalAuthorImage' ? 1 : 0;
  
  const parent = element.parentElement;
  const parentTagName = parent ? parent.tagName.toLowerCase() : 'root';
  const parentTagEncoded = encodeTagName(parentTagName);
  
  let positionInParent = 0;
  let isFirstChild = 0;
  let isLastChild = 0;
  
  if (parent) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element);
    positionInParent = siblings.length > 1 ? index / (siblings.length - 1) : 0;
    isFirstChild = index === 0 ? 1 : 0;
    isLastChild = index === siblings.length - 1 ? 1 : 0;
  }
  
  // Additional features
  const hasDataAttributes = Array.from(element.attributes).some(attr => 
    attr.name.startsWith('data-')
  ) ? 1 : 0;
  
  const hasAriaAttributes = Array.from(element.attributes).some(attr => 
    attr.name.startsWith('aria-')
  ) ? 1 : 0;
  
  const classNameLength = className.length;
  const idLength = id.length;
  
  return {
    // Structural features (normalized)
    tagNameEncoded: normalizeTagEncoding(encodeTagName(tagName)),
    depth: normalize(depth, MAX_DEPTH),
    childCount: normalize(childCount, MAX_CHILD_COUNT),
    siblingCount: normalize(siblingCount, MAX_SIBLING_COUNT),
    
    // Content features (normalized)
    textLength: normalize(textLength, MAX_TEXT_LENGTH),
    paragraphCount: normalize(paragraphCount, MAX_PARAGRAPH_COUNT),
    linkCount: normalize(linkCount, MAX_LINK_COUNT),
    linkRatio: Math.min(linkRatio, 1), // Already 0-1
    imageCount: normalize(imageCount, MAX_IMAGE_COUNT),
    
    // Semantic features (binary)
    hasHeading,
    hasSemanticTag,
    hasList,
    
    // Pattern features (binary)
    hasNavPattern,
    hasAdPattern,
    hasFooterPattern,
    hasRelatedPattern,
    hasVideoPattern,
    hasMetaPattern,
    hasAuthorPattern,
    
    // Context features (normalized)
    parentTagNameEncoded: normalizeTagEncoding(parentTagEncoded),
    positionInParent,
    isFirstChild,
    isLastChild,
    
    // Additional features (normalized)
    hasDataAttributes,
    hasAriaAttributes,
    classNameLength: normalize(classNameLength, MAX_CLASS_NAME_LENGTH),
    idLength: normalize(idLength, MAX_ID_LENGTH),
  };
}
