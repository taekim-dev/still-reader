/**
 * Tests for element matcher functions.
 */

import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';

import {
  isNavigation,
  isFooter,
  isRelatedContent,
  isVideoPlayer,
  isAdContainer,
  isArticleMeta,
  isAuthorCard,
  isScreenReaderTitle,
} from '../src/extraction/elementMatchers';

describe('isNavigation', () => {
  it('should return true for HEADER with site-nav id', () => {
    const dom = new JSDOM('<header id="site-nav">Nav</header>');
    const element = dom.window.document.querySelector('header')!;
    expect(isNavigation(element)).toBe(true);
  });

  it('should return true for HEADER with section="nav"', () => {
    const dom = new JSDOM('<header section="nav">Nav</header>');
    const element = dom.window.document.querySelector('header')!;
    expect(isNavigation(element)).toBe(true);
  });

  it('should return true for NAV with section="top"', () => {
    const dom = new JSDOM('<nav section="top">Nav</nav>');
    const element = dom.window.document.querySelector('nav')!;
    expect(isNavigation(element)).toBe(true);
  });

  it('should return true for element with data-location="HEADER"', () => {
    const dom = new JSDOM('<div data-location="HEADER">Nav</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isNavigation(element)).toBe(true);
  });

  it('should return true for element with section="nav" (non-article/main)', () => {
    const dom = new JSDOM('<div section="nav">Nav</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isNavigation(element)).toBe(true);
  });

  it('should return true for element with navigation class pattern', () => {
    const dom = new JSDOM('<div class="site-header">Nav</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isNavigation(element)).toBe(true);
  });

  it('should return false for regular content element', () => {
    const dom = new JSDOM('<div>Content</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isNavigation(element)).toBe(false);
  });

  it('should return false for ARTICLE with section="nav"', () => {
    const dom = new JSDOM('<article section="nav">Content</article>');
    const element = dom.window.document.querySelector('article')!;
    expect(isNavigation(element)).toBe(false);
  });
});

describe('isFooter', () => {
  it('should return true for FOOTER tag', () => {
    const dom = new JSDOM('<footer>Footer</footer>');
    const element = dom.window.document.querySelector('footer')!;
    expect(isFooter(element)).toBe(true);
  });

  it('should return true for element with data-location="FOOTER"', () => {
    const dom = new JSDOM('<div data-location="FOOTER">Footer</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isFooter(element)).toBe(true);
  });

  it('should return true for element with footer class pattern', () => {
    const dom = new JSDOM('<div class="site-footer">Footer</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isFooter(element)).toBe(true);
  });

  it('should return false for regular content element', () => {
    const dom = new JSDOM('<div>Content</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isFooter(element)).toBe(false);
  });
});

describe('isRelatedContent', () => {
  it('should return true for element with bestlistlinkblock class', () => {
    const dom = new JSDOM('<div class="bestlistlinkblock">Related</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isRelatedContent(element)).toBe(true);
  });

  it('should return true for element with articlelinkblock class', () => {
    const dom = new JSDOM('<div class="articlelinkblock">Related</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isRelatedContent(element)).toBe(true);
  });

  it('should return true for element with "Related" heading and high link density', () => {
    const dom = new JSDOM(`
      <div>
        <h2>Related Articles</h2>
        <a href="#">Link 1</a>
        <a href="#">Link 2</a>
        <a href="#">Link 3</a>
        <a href="#">Link 4</a>
        <a href="#">Link 5</a>
        <a href="#">Link 6</a>
        <a href="#">Link 7</a>
        <p>One paragraph</p>
      </div>
    `);
    const element = dom.window.document.querySelector('div')!;
    expect(isRelatedContent(element)).toBe(true);
  });

  it('should return false for element with low link density', () => {
    const dom = new JSDOM(`
      <div>
        <h2>Related Articles</h2>
        <a href="#">Link 1</a>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
        <p>Paragraph 3</p>
      </div>
    `);
    const element = dom.window.document.querySelector('div')!;
    expect(isRelatedContent(element)).toBe(false);
  });

  it('should return false for regular content element', () => {
    const dom = new JSDOM('<div><p>Content</p></div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isRelatedContent(element)).toBe(false);
  });
});

describe('isVideoPlayer', () => {
  it('should return true for element with data-video-location="MODAL"', () => {
    const dom = new JSDOM('<div data-video-location="MODAL">Video</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVideoPlayer(element)).toBe(true);
  });

  it('should return true for element with data-video-article-placement="Watch and Read"', () => {
    const dom = new JSDOM('<div data-video-article-placement="Watch and Read">Video</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVideoPlayer(element)).toBe(true);
  });

  it('should return true for element with c-avStickyVideo class', () => {
    const dom = new JSDOM('<div class="c-avStickyVideo">Video</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVideoPlayer(element)).toBe(true);
  });

  it('should return true for element with c-CnetAvStickyVideo class', () => {
    const dom = new JSDOM('<div class="c-CnetAvStickyVideo">Video</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVideoPlayer(element)).toBe(true);
  });

  it('should return true for video-js tag', () => {
    const dom = new JSDOM('<video-js>Video</video-js>');
    const element = dom.window.document.querySelector('video-js')!;
    expect(isVideoPlayer(element)).toBe(true);
  });

  it('should return true for element with vjs- class (but not c-avVideo)', () => {
    const dom = new JSDOM('<div class="vjs-player">Video</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVideoPlayer(element)).toBe(true);
  });

  it('should return false for element with vjs- and c-avVideo classes', () => {
    const dom = new JSDOM('<div class="vjs-player c-avVideo">Video</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVideoPlayer(element)).toBe(false);
  });

  it('should return false for regular video element', () => {
    const dom = new JSDOM('<video src="video.mp4"></video>');
    const element = dom.window.document.querySelector('video')!;
    expect(isVideoPlayer(element)).toBe(false);
  });
});

describe('isAdContainer', () => {
  it('should return true for element with data-ad attribute', () => {
    const dom = new JSDOM('<div data-ad="true">Ad</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isAdContainer(element)).toBe(true);
  });

  it('should return true for element with data-ad-callout attribute', () => {
    const dom = new JSDOM('<div data-ad-callout="true">Ad</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isAdContainer(element)).toBe(true);
  });

  it('should return true for element with ad-related class pattern', () => {
    const dom = new JSDOM('<div class="adDisplay">Ad</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isAdContainer(element)).toBe(true);
  });

  it('should return true for element with adContainer class', () => {
    const dom = new JSDOM('<div class="adContainer">Ad</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isAdContainer(element)).toBe(true);
  });

  it('should return false for regular content element', () => {
    const dom = new JSDOM('<div>Content</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isAdContainer(element)).toBe(false);
  });
});

describe('isArticleMeta', () => {
  it('should return true for element with c-articleHeader_metaContainer class', () => {
    const dom = new JSDOM('<div class="c-articleHeader_metaContainer">Meta</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isArticleMeta(element)).toBe(true);
  });

  it('should return true for element with c-articleHeader_meta class', () => {
    const dom = new JSDOM('<div class="c-articleHeader_meta">Meta</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isArticleMeta(element)).toBe(true);
  });

  it('should return true for element with c-topicBreadcrumbs class', () => {
    const dom = new JSDOM('<div class="c-topicBreadcrumbs">Breadcrumbs</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isArticleMeta(element)).toBe(true);
  });

  it('should return false for regular content element', () => {
    const dom = new JSDOM('<div>Content</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isArticleMeta(element)).toBe(false);
  });
});

describe('isAuthorCard', () => {
  it('should return true for element with c-globalAuthorImage class', () => {
    const dom = new JSDOM('<div class="c-globalAuthorImage">Author</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isAuthorCard(element)).toBe(true);
  });

  it('should return true for element with c-globalAuthorCard class', () => {
    const dom = new JSDOM('<div class="c-globalAuthorCard">Author</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isAuthorCard(element)).toBe(true);
  });

  it('should return true for element with section="authorCard"', () => {
    const dom = new JSDOM('<div section="authorCard">Author</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isAuthorCard(element)).toBe(true);
  });

  it('should return true for element with data-cy="globalAuthorImage"', () => {
    const dom = new JSDOM('<div data-cy="globalAuthorImage">Author</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isAuthorCard(element)).toBe(true);
  });

  it('should return false for regular content element', () => {
    const dom = new JSDOM('<div>Content</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isAuthorCard(element)).toBe(false);
  });
});

describe('isScreenReaderTitle', () => {
  it('should return true for element with sr-title class (string className)', () => {
    const dom = new JSDOM('<h1 class="sr-title">Title</h1>');
    const element = dom.window.document.querySelector('h1')!;
    expect(isScreenReaderTitle(element)).toBe(true);
  });

  it('should return true for element with sr-title in classList', () => {
    const dom = new JSDOM('<h1 class="sr-title other-class">Title</h1>');
    const element = dom.window.document.querySelector('h1')!;
    expect(isScreenReaderTitle(element)).toBe(true);
  });

  it('should return false for element without sr-title class', () => {
    const dom = new JSDOM('<h1 class="title">Title</h1>');
    const element = dom.window.document.querySelector('h1')!;
    expect(isScreenReaderTitle(element)).toBe(false);
  });

  it('should return false for element with no class', () => {
    const dom = new JSDOM('<h1>Title</h1>');
    const element = dom.window.document.querySelector('h1')!;
    expect(isScreenReaderTitle(element)).toBe(false);
  });
});

