import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { extractArticle } from '../src/extraction/extractor';

const fixture = (name: string): string =>
  readFileSync(join(__dirname, 'fixtures', name), { encoding: 'utf-8' });

describe('extractArticle integration - real pages', () => {
  it('extracts TechCrunch article content with sufficient confidence', () => {
    const html = fixture('techcrunch-graphite-full.html');
    const dom = new JSDOM(html, {
      url: 'https://techcrunch.com/2025/12/19/cursor-continues-acquisition-spree-with-graphite-deal/',
    });

    const result = extractArticle(dom.window.document);
    expect(result.unavailable).toBeFalsy();
    if (result.unavailable) return;

    expect(result.confidence).toBeGreaterThan(0.35);
    expect(result.text).toContain('Cursor continues acquisition spree with Graphite deal');
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('<iframe');
  });

  it('extracts CNET article content with sufficient confidence', () => {
    const html = fixture('cnet-galaxy-chip-full.html');
    const dom = new JSDOM(html, {
      url: 'https://www.cnet.com/tech/mobile/why-samsungs-latest-chip-breakthrough-matters-for-upcoming-galaxy-phones/',
    });

    const result = extractArticle(dom.window.document);
    expect(result.unavailable).toBeFalsy();
    if (result.unavailable) return;

    expect(result.confidence).toBeGreaterThan(0.35);
    expect(result.text.toLowerCase()).toContain('samsung');
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('<iframe');
  });

  it('CNET: validates cleanup removes navigation, footer, and related content', () => {
    const html = fixture('cnet-galaxy-chip-full.html');
    const dom = new JSDOM(html, {
      url: 'https://www.cnet.com/tech/mobile/why-samsungs-latest-chip-breakthrough-matters-for-upcoming-galaxy-phones/',
    });

    const result = extractArticle(dom.window.document);
    expect(result.unavailable).toBeFalsy();
    if (result.unavailable) return;

    const extractedHtml = result.html.toLowerCase();

    // Should NOT contain navigation elements
    expect(extractedHtml).not.toContain('c-siteheader');
    expect(extractedHtml).not.toContain('site-nav');
    expect(extractedHtml).not.toContain('c-siteheadermasthead');

    // Should NOT contain footer
    expect(extractedHtml).not.toContain('cat-footer');
    expect(extractedHtml).not.toContain('<footer');

    // Should NOT contain related content blocks
    expect(extractedHtml).not.toContain('c-bestlistlinkblock');
    expect(extractedHtml).not.toContain('mobile guides');

    // Should NOT contain detailed video player
    expect(extractedHtml).not.toContain('video-js');
    expect(extractedHtml).not.toContain('vjs-');

    // Should NOT contain ad containers
    expect(extractedHtml).not.toContain('data-ad-callout');
    expect(extractedHtml).not.toContain('c-addisplay');

    // Should NOT contain video sticky sections
    expect(extractedHtml).not.toContain('c-avstickyvideo');
    expect(extractedHtml).not.toContain('data-video-location="modal"');
    expect(extractedHtml).not.toContain('data-video-article-placement="watch and read"');

    // Should NOT contain article header meta (breadcrumbs)
    expect(extractedHtml).not.toContain('c-articleheader_metacontainer');
    expect(extractedHtml).not.toContain('c-topicbreadcrumbs');

    // Should NOT contain author image cards
    expect(extractedHtml).not.toContain('c-globalauthorimage');
    expect(extractedHtml).not.toContain('c-globalauthorcard');
    expect(extractedHtml).not.toContain('data-cy="globalauthorimage"');

    // Should NOT contain screen-reader-only titles
    expect(extractedHtml).not.toContain('sr-title');
    expect(extractedHtml).not.toContain('<h1 class="sr-title"');

    // Should still contain article content
    expect(extractedHtml).toContain('samsung');
    expect(extractedHtml).toContain('exynos 2600');
    expect(extractedHtml).toContain('chip');
  });

  it('CNET: compares extracted HTML structure with expected output', () => {
    const html = fixture('cnet-galaxy-chip-full.html');
    const expectedHtml = fixture('cnet-galaxy-chip-full-expected.html');
    const dom = new JSDOM(html, {
      url: 'https://www.cnet.com/tech/mobile/why-samsungs-latest-chip-breakthrough-matters-for-upcoming-galaxy-phones/',
    });

    const result = extractArticle(dom.window.document);
    expect(result.unavailable).toBeFalsy();
    if (result.unavailable) return;

    // Parse both HTMLs to compare structure
    const extractedDom = new JSDOM(result.html);
    const expectedDom = new JSDOM(expectedHtml);

    const extractedDoc = extractedDom.window.document;
    const expectedDoc = expectedDom.window.document;

    // Check that navigation is removed
    const extractedNav = extractedDoc.querySelector('header[id="site-nav"], .c-siteHeader, nav[section="top"]');
    const expectedNav = expectedDoc.querySelector('header[id="site-nav"], .c-siteHeader, nav[section="top"]');
    expect(extractedNav).toBeNull();
    expect(expectedNav).toBeNull();

    // Check that footer is removed
    const extractedFooter = extractedDoc.querySelector('footer, .cat-footer');
    const expectedFooter = expectedDoc.querySelector('footer, .cat-footer');
    expect(extractedFooter).toBeNull();
    expect(expectedFooter).toBeNull();

    // Check that related content blocks are removed
    const extractedRelated = extractedDoc.querySelector('.c-bestListLinkBlock, .c-articleLinkBlock');
    const expectedRelated = expectedDoc.querySelector('.c-bestListLinkBlock');
    expect(extractedRelated).toBeNull();
    expect(expectedRelated).toBeNull();

    // Check that video player details are removed (container may remain but not detailed player)
    const extractedVideoJs = extractedDoc.querySelector('video-js, .video-js');
    expect(extractedVideoJs).toBeNull();

    // Check that ad containers are removed
    const extractedAds = extractedDoc.querySelectorAll('[data-ad-callout], .c-adDisplay');
    expect(extractedAds.length).toBe(0);

    // Verify main article content is present
    expect(result.text.toLowerCase()).toContain('samsung');
    expect(result.text.toLowerCase()).toContain('exynos');
  });
});

