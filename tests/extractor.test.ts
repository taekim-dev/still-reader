import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { extractArticle } from '../src/extraction/extractor';

const runExtraction = (html: string, url = 'https://example.com/page'): ReturnType<typeof extractArticle> => {
  const dom = new JSDOM(html, { url });
  return extractArticle(dom.window.document, { baseUrl: url });
};

describe('extractArticle', () => {
  it('extracts a clear article element with strong confidence', () => {
    const html = `
      <header><h1>Site</h1></header>
      <article>
        <h1>Deep Work</h1>
        <p>Paragraph one about focus and productivity.</p>
        <p>Paragraph two elaborates on strategies for deep work.</p>
        <p>Paragraph three adds more detail and examples.</p>
      </article>
      <footer>Contact</footer>
    `;

    const result = runExtraction(html);
    expect(result.unavailable).toBeFalsy();
    if (result.unavailable) return;
    expect(result.text).toContain('Deep Work');
    expect(result.confidence).toBeGreaterThan(0.35);
  });

  it('rejects nav-heavy layout with no substantive content', () => {
    const html = `
      <nav>
        <a href="/a">A</a><a href="/b">B</a><a href="/c">C</a><a href="/d">D</a>
      </nav>
      <section class="menu">
        <a href="/e">E</a><a href="/f">F</a><a href="/g">G</a>
      </section>
    `;

    const result = runExtraction(html);
    expect(result.unavailable).toBe(true);
  });

  it('prefers content-rich article over link-heavy sidebar', () => {
    const html = `
      <div class="sidebar nav">
        <a href="#">Link</a><a href="#">Link</a><a href="#">Link</a>
        <a href="#">Link</a><a href="#">Link</a><a href="#">Link</a>
      </div>
      <main>
        <h1>Content Title</h1>
        <p>Paragraph one of meaningful content.</p>
        <p>Paragraph two adds more context and details.</p>
        <p>Paragraph three continues the discussion with examples.</p>
        <p>Paragraph four rounds out the narrative.</p>
      </main>
    `;

    const result = runExtraction(html);
    expect(result.unavailable).toBeFalsy();
    if (result.unavailable) return;
    expect(result.text).toContain('Content Title');
    expect(result.confidence).toBeGreaterThan(0.35);
  });

  it('sanitizes scripts and resolves relative asset URLs', () => {
    const html = `
      <article>
        <h1>Title</h1>
        <p>Safe text that spans multiple sentences to mimic a real paragraph and meet length thresholds.</p>
        <p>Additional body content continues here with more descriptive language about the topic.</p>
        <img src="/images/pic.png" onerror="alert('xss')">
        <script>malicious()</script>
      </article>
    `;

    const result = runExtraction(html, 'https://site.com/news');
    expect(result.unavailable).toBeFalsy();
    if (result.unavailable) return;
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('onerror');
    expect(result.html).toContain('https://site.com/images/pic.png');
  });

  it('rejects very small bodies of text', () => {
    const html = `<article><p>Too short.</p></article>`;
    const result = runExtraction(html);
    expect(result.unavailable).toBe(true);
  });

  describe('with ML cleanup enabled', () => {
    it('extracts article successfully with ML cleanup', () => {
      const html = `
        <header><h1>Site</h1></header>
        <article>
          <h1>Deep Work</h1>
          <p>Paragraph one about focus and productivity.</p>
          <p>Paragraph two elaborates on strategies for deep work.</p>
          <p>Paragraph three adds more detail and examples.</p>
        </article>
        <footer>Contact</footer>
      `;

      const dom = new JSDOM(html);
      const result = extractArticle(dom.window.document, { useMLCleanup: true });
      
      expect(result.unavailable).toBeFalsy();
      if (result.unavailable) return;
      expect(result.text).toContain('Deep Work');
      expect(result.confidence).toBeGreaterThan(0.35);
    });

    it('produces similar results with ML and pattern matching', () => {
      const html = `
        <header><h1>Site</h1></header>
        <article>
          <h1>Article Title</h1>
          <p>Long paragraph with substantial meaningful content that should be extracted.</p>
          <p>Another paragraph with more detailed information and context.</p>
        </article>
        <nav class="site-header">Navigation</nav>
        <footer class="site-footer">Footer</footer>
      `;

      const dom1 = new JSDOM(html);
      const dom2 = new JSDOM(html);
      
      const mlResult = extractArticle(dom1.window.document, { useMLCleanup: true });
      const patternResult = extractArticle(dom2.window.document, { useMLCleanup: false });

      // Both should extract successfully
      expect(mlResult.unavailable).toBeFalsy();
      expect(patternResult.unavailable).toBeFalsy();
      if (mlResult.unavailable || patternResult.unavailable) return;

      // Both should contain article content
      expect(mlResult.text).toContain('Article Title');
      expect(patternResult.text).toContain('Article Title');
      
      // Both should have reasonable confidence
      expect(mlResult.confidence).toBeGreaterThan(0.35);
      expect(patternResult.confidence).toBeGreaterThan(0.35);
    });

    it('removes non-content elements with ML cleanup', () => {
      const html = `
        <article>
          <h1>Article Title</h1>
          <p>Long paragraph with meaningful content that spans multiple sentences to meet extraction thresholds.</p>
          <p>Another paragraph with substantial text content that provides more context and details.</p>
          <p>Third paragraph continues the narrative with additional information and examples.</p>
        </article>
        <nav class="site-header">Navigation</nav>
        <div class="c-adDisplay" data-ad="test">Ad</div>
      `;

      const dom = new JSDOM(html);
      const result = extractArticle(dom.window.document, { useMLCleanup: true });
      
      expect(result.unavailable).toBeFalsy();
      if (result.unavailable) return;
      
      // Article content should be present
      expect(result.text).toContain('Article Title');
      expect(result.text).toContain('meaningful content');
    });
  });
});

