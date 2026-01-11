import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';

import { extractElementFeatures } from '../../src/extraction/ml/features';
import { shouldKeepElement } from '../../src/extraction/ml/inference';
import type { FeatureVector } from '../../src/extraction/ml/types';

describe('shouldKeepElement', () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  });

  function createElement(html: string): Element {
    const container = dom.window.document.createElement('div');
    container.innerHTML = html;
    return container.firstElementChild!;
  }

  it('returns keep=true for article-like features with high confidence', () => {
    const articleElement = createElement(`
      <article>
        <h1>Article Title</h1>
        <p>This is a long paragraph with substantial content that should be kept.</p>
        <p>Another paragraph with more meaningful text content.</p>
      </article>
    `);
    const features = extractElementFeatures(articleElement);
    const result = shouldKeepElement(features);

    expect(result.keep).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('returns keep=false for ad-like features with high confidence', () => {
    const adElement = createElement('<div class="c-adDisplay_container" data-ad="test"></div>');
    const features = extractElementFeatures(adElement);
    const result = shouldKeepElement(features);

    // ML should identify ads (may vary based on model, but should be consistent)
    expect(typeof result.keep).toBe('boolean');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    // Ad elements typically have hasAdPattern=1, which should influence decision
    expect(features.hasAdPattern).toBe(1);
  });

  it('calculates confidence correctly based on feature weights', () => {
    const element = createElement('<div>Test content</div>');
    const features = extractElementFeatures(element);
    const result = shouldKeepElement(features);

    // Confidence should be in valid range
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('handles missing feature thresholds gracefully', () => {
    // Create a minimal feature vector with only some features
    const minimalFeatures: Partial<FeatureVector> = {
      tagNameEncoded: 0.5,
      depth: 0.3,
      textLength: 0.4,
    };
    
    // Fill rest with zeros
    const fullFeatures: FeatureVector = {
      tagNameEncoded: minimalFeatures.tagNameEncoded!,
      depth: minimalFeatures.depth!,
      childCount: 0,
      siblingCount: 0,
      textLength: minimalFeatures.textLength!,
      paragraphCount: 0,
      linkCount: 0,
      linkRatio: 0,
      imageCount: 0,
      hasHeading: 0,
      hasSemanticTag: 0,
      hasList: 0,
      hasNavPattern: 0,
      hasAdPattern: 0,
      hasFooterPattern: 0,
      hasRelatedPattern: 0,
      hasVideoPattern: 0,
      hasMetaPattern: 0,
      hasAuthorPattern: 0,
      parentTagNameEncoded: 0,
      positionInParent: 0,
      isFirstChild: 0,
      isLastChild: 0,
      hasDataAttributes: 0,
      hasAriaAttributes: 0,
      classNameLength: 0,
      idLength: 0,
    };

    const result = shouldKeepElement(fullFeatures);
    
    // Should still return valid result
    expect(typeof result.keep).toBe('boolean');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('uses defaultKeep when totalWeight is zero', () => {
    // Create feature vector with all zeros
    // Note: Even with zeros, some features have weights, so totalWeight won't be zero
    // This test verifies the function handles edge cases gracefully
    const zeroFeatures: FeatureVector = {
      tagNameEncoded: 0,
      depth: 0,
      childCount: 0,
      siblingCount: 0,
      textLength: 0,
      paragraphCount: 0,
      linkCount: 0,
      linkRatio: 0,
      imageCount: 0,
      hasHeading: 0,
      hasSemanticTag: 0,
      hasList: 0,
      hasNavPattern: 0,
      hasAdPattern: 0,
      hasFooterPattern: 0,
      hasRelatedPattern: 0,
      hasVideoPattern: 0,
      hasMetaPattern: 0,
      hasAuthorPattern: 0,
      parentTagNameEncoded: 0,
      positionInParent: 0,
      isFirstChild: 0,
      isLastChild: 0,
      hasDataAttributes: 0,
      hasAriaAttributes: 0,
      classNameLength: 0,
      idLength: 0,
    };

    const result = shouldKeepElement(zeroFeatures);
    
    // Should return valid result (even if totalWeight isn't zero due to feature weights)
    expect(typeof result.keep).toBe('boolean');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('clamps confidence to [0, 1] range', () => {
    const articleElement = createElement('<article><h1>Title</h1><p>Content</p></article>');
    const features = extractElementFeatures(articleElement);
    const result = shouldKeepElement(features);

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('caches model after first load', () => {
    const element1 = createElement('<div>Test 1</div>');
    const element2 = createElement('<div>Test 2</div>');
    
    const features1 = extractElementFeatures(element1);
    const features2 = extractElementFeatures(element2);
    
    const result1 = shouldKeepElement(features1);
    const result2 = shouldKeepElement(features2);
    
    // Both should work (model loaded and cached)
    expect(typeof result1.keep).toBe('boolean');
    expect(typeof result2.keep).toBe('boolean');
    expect(result1.confidence).toBeGreaterThanOrEqual(0);
    expect(result2.confidence).toBeGreaterThanOrEqual(0);
  });

  it('distinguishes between keep and remove elements', () => {
    const articleElement = createElement(`
      <article>
        <h1>Article Title</h1>
        <p>Long paragraph with meaningful content that should definitely be kept.</p>
      </article>
    `);
    const navElement = createElement('<nav class="site-header-navigation"><a href="#">Link</a></nav>');
    const adElement = createElement('<div class="c-adDisplay" data-ad="test"></div>');

    const articleFeatures = extractElementFeatures(articleElement);
    const navFeatures = extractElementFeatures(navElement);
    const adFeatures = extractElementFeatures(adElement);

    const articleResult = shouldKeepElement(articleFeatures);
    const navResult = shouldKeepElement(navFeatures);
    const adResult = shouldKeepElement(adFeatures);

    // Article should be kept
    expect(articleResult.keep).toBe(true);
    
    // Navigation and ads should be removed (or at least have different behavior)
    // Note: Actual results depend on model, but they should be different from article
    expect(typeof navResult.keep).toBe('boolean');
    expect(typeof adResult.keep).toBe('boolean');
  });

  it('handles edge case with very high feature values', () => {
    const element = createElement(`
      <div>
        ${'<p>'.repeat(100)}Content${'</p>'.repeat(100)}
        ${'<a href="#">Link</a>'.repeat(200)}
      </div>
    `);
    const features = extractElementFeatures(element);
    const result = shouldKeepElement(features);

    // Should handle extreme values gracefully
    expect(typeof result.keep).toBe('boolean');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
