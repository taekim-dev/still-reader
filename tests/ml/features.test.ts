import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';

import { extractElementFeatures } from '../../src/extraction/ml/features';

describe('extractElementFeatures', () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  });

  function createElement(html: string): Element {
    const container = dom.window.document.createElement('div');
    container.innerHTML = html;
    return container.firstElementChild!;
  }

  it('extracts structural features correctly', () => {
    const element = createElement('<div><p>Content</p></div>');
    const features = extractElementFeatures(element);

    expect(features.tagNameEncoded).toBeGreaterThanOrEqual(0);
    expect(features.tagNameEncoded).toBeLessThanOrEqual(1);
    expect(features.depth).toBeGreaterThanOrEqual(0);
    expect(features.depth).toBeLessThanOrEqual(1);
    expect(features.childCount).toBeGreaterThanOrEqual(0);
    expect(features.childCount).toBeLessThanOrEqual(1);
  });

  it('extracts content features correctly', () => {
    const element = createElement('<p>This is a paragraph with <a href="#">a link</a>.</p>');
    const features = extractElementFeatures(element);

    expect(features.textLength).toBeGreaterThanOrEqual(0);
    expect(features.textLength).toBeLessThanOrEqual(1);
    expect(features.paragraphCount).toBeGreaterThanOrEqual(0);
    expect(features.paragraphCount).toBeLessThanOrEqual(1);
    expect(features.linkCount).toBeGreaterThanOrEqual(0);
    expect(features.linkCount).toBeLessThanOrEqual(1);
    expect(features.linkRatio).toBeGreaterThanOrEqual(0);
    expect(features.linkRatio).toBeLessThanOrEqual(1);
  });

  it('identifies semantic features', () => {
    const articleElement = createElement('<article><h1>Title</h1><p>Content</p></article>');
    const features = extractElementFeatures(articleElement);

    expect(features.hasHeading).toBe(1);
    expect(features.hasSemanticTag).toBe(1);
  });

  it('identifies ad patterns', () => {
    const adElement = createElement('<div class="c-adDisplay_container" data-ad="test"></div>');
    const features = extractElementFeatures(adElement);

    expect(features.hasAdPattern).toBe(1);
  });

  it('identifies navigation patterns', () => {
    const navElement = createElement('<nav class="site-header"><a href="#">Link</a></nav>');
    const features = extractElementFeatures(navElement);

    expect(features.hasNavPattern).toBe(1);
  });

  it('identifies footer patterns', () => {
    const footerElement = createElement('<footer class="site-footer">Footer</footer>');
    const features = extractElementFeatures(footerElement);

    expect(features.hasFooterPattern).toBe(1);
  });

  it('identifies related content patterns', () => {
    const relatedElement = createElement('<div class="c-bestlistlinkblock">Related</div>');
    const features = extractElementFeatures(relatedElement);

    expect(features.hasRelatedPattern).toBe(1);
  });

  it('extracts context features', () => {
    const parent = dom.window.document.createElement('div');
    const child1 = dom.window.document.createElement('p');
    const child2 = dom.window.document.createElement('p');
    parent.appendChild(child1);
    parent.appendChild(child2);

    const features1 = extractElementFeatures(child1);
    const features2 = extractElementFeatures(child2);

    expect(features1.isFirstChild).toBe(1);
    expect(features1.isLastChild).toBe(0);
    expect(features2.isFirstChild).toBe(0);
    expect(features2.isLastChild).toBe(1);
    expect(features1.positionInParent).toBeLessThan(features2.positionInParent);
  });

  it('normalizes all features to [0, 1] range', () => {
    const element = createElement('<div><p>Content</p></div>');
    const features = extractElementFeatures(element);

    // Check all numeric features are in [0, 1] range
    const featureValues = Object.values(features) as number[];
    featureValues.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });
  });

  it('distinguishes between content and noise elements', () => {
    const contentElement = createElement('<article><h1>Title</h1><p>Long paragraph with meaningful content.</p></article>');
    const adElement = createElement('<div class="c-adDisplay" data-ad="test"></div>');

    const contentFeatures = extractElementFeatures(contentElement);
    const adFeatures = extractElementFeatures(adElement);

    // Content should have more text and paragraphs
    expect(contentFeatures.textLength).toBeGreaterThan(adFeatures.textLength);
    expect(contentFeatures.paragraphCount).toBeGreaterThan(adFeatures.paragraphCount);
    
    // Ad should have ad pattern
    expect(adFeatures.hasAdPattern).toBe(1);
    expect(contentFeatures.hasAdPattern).toBe(0);
    
    // Content should have semantic tag
    expect(contentFeatures.hasSemanticTag).toBe(1);
    expect(adFeatures.hasSemanticTag).toBe(0);
  });

  it('handles elements with no text content', () => {
    const emptyElement = createElement('<div></div>');
    const features = extractElementFeatures(emptyElement);

    expect(features.textLength).toBe(0);
    expect(features.linkRatio).toBe(0);
  });

  it('handles elements with many links', () => {
    const linkHeavyElement = createElement(`
      <div>
        <a href="#">Link 1</a>
        <a href="#">Link 2</a>
        <a href="#">Link 3</a>
        <p>Some text</p>
      </div>
    `);
    const features = extractElementFeatures(linkHeavyElement);

    expect(features.linkCount).toBeGreaterThan(0);
    expect(features.linkRatio).toBeGreaterThan(0);
  });
});


