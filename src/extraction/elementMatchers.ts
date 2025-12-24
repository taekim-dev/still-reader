/**
 * Element matcher functions to identify non-content elements.
 * These functions use pattern matching to work across different websites.
 */

/**
 * Check if an element is a navigation element.
 */
export function isNavigation(el: Element): boolean {
  const className = el.className || '';
  const id = el.id || '';
  const section = el.getAttribute('section');
  const dataLocation = el.getAttribute('data-location');
  const ariaLabel = el.getAttribute('aria-label');

  if (el.tagName === 'HEADER' && (id === 'site-nav' || section === 'nav')) {
    return true;
  }
  if (el.tagName === 'NAV' && (section === 'top' || ariaLabel === 'site')) {
    return true;
  }
  if (dataLocation === 'HEADER') {
    return true;
  }
  if (section === 'nav' && el.tagName !== 'ARTICLE' && el.tagName !== 'MAIN') {
    return true;
  }

  const navPatterns = /(siteheader|site-header|siteheadermasthead|siteheadernavigation)/i;
  if (navPatterns.test(className) || navPatterns.test(id)) {
    return true;
  }

  return false;
}

/**
 * Check if an element is a footer element.
 */
export function isFooter(el: Element): boolean {
  const className = el.className || '';
  const id = el.id || '';
  const dataLocation = el.getAttribute('data-location');

  if (el.tagName === 'FOOTER') {
    return true;
  }
  if (dataLocation === 'FOOTER') {
    return true;
  }

  const footerPatterns = /(cat-footer|site-footer|main-footer|page-footer)/i;
  if (footerPatterns.test(className) || footerPatterns.test(id)) {
    return true;
  }

  return false;
}

/**
 * Check if an element is related content (links, recommendations, etc.).
 */
export function isRelatedContent(el: Element): boolean {
  const className = el.className || '';
  const text = el.textContent?.toLowerCase() || '';
  const linkCount = el.querySelectorAll('a').length;
  const paragraphCount = el.querySelectorAll('p').length;

  const relatedPatterns = /(bestlistlinkblock|articlelinkblock)/i;
  if (relatedPatterns.test(className)) {
    return true;
  }

  const hasRelatedHeading = /^(guides?|related|recommended|you may also|read more|similar)/i.test(text.trim().substring(0, 50));
  if (hasRelatedHeading && linkCount > 5 && paragraphCount < linkCount && linkCount > paragraphCount * 2) {
    return true;
  }

  return false;
}

/**
 * Check if an element is a video player.
 */
export function isVideoPlayer(el: Element): boolean {
  const className = el.className || '';
  const tag = el.tagName.toLowerCase();
  const videoLocation = el.getAttribute('data-video-location');
  const videoPlacement = el.getAttribute('data-video-article-placement');

  if (videoLocation === 'MODAL' || videoPlacement === 'Watch and Read') {
    return true;
  }
  if (className.includes('c-avStickyVideo') || className.includes('c-CnetAvStickyVideo')) {
    return true;
  }
  if (tag === 'video-js') {
    return true;
  }
  if (className.includes('vjs-') && !className.includes('c-avVideo') && !className.includes('c-avStickyVideo')) {
    return true;
  }

  return false;
}

/**
 * Check if an element is an ad container.
 */
export function isAdContainer(el: Element): boolean {
  const className = el.className || '';
  const dataAd = el.getAttribute('data-ad');
  const dataAdCallout = el.getAttribute('data-ad-callout');

  if (dataAd || dataAdCallout) {
    return true;
  }

  const adPatterns = /(adDisplay|adContainer|advertisement|ad-slot|ad-unit|adSkyBox)/i;
  if (adPatterns.test(className)) {
    return true;
  }

  return false;
}

/**
 * Check if an element is article metadata (breadcrumbs, header meta, etc.).
 */
export function isArticleMeta(el: Element): boolean {
  const className = el.className || '';

  if (className.includes('c-articleHeader_metaContainer') || className.includes('c-articleHeader_meta')) {
    return true;
  }
  if (className.includes('c-topicBreadcrumbs')) {
    return true;
  }

  return false;
}

/**
 * Check if an element is an author card.
 */
export function isAuthorCard(el: Element): boolean {
  const className = el.className || '';
  const section = el.getAttribute('section');
  const dataCy = el.getAttribute('data-cy');

  if (className.includes('c-globalAuthorImage') || className.includes('c-globalAuthorCard')) {
    return true;
  }
  if (section === 'authorCard' || dataCy === 'globalAuthorImage') {
    return true;
  }

  return false;
}

/**
 * Check if an element is a screen-reader-only title.
 */
export function isScreenReaderTitle(el: Element): boolean {
  const className = el.className || '';
  if (typeof className === 'string' && className.includes('sr-title')) {
    return true;
  }
  if (el.classList && el.classList.contains('sr-title')) {
    return true;
  }
  return false;
}

