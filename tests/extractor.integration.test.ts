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
});

