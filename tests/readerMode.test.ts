import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { activateReader, deactivateReader, isReaderActive } from '../src/content/readerMode';

const basePage = `
  <html>
    <head><title>Site</title></head>
    <body>
      <nav id="nav">Navigation</nav>
      <main>
        <article id="article">
          <h1>Original Title</h1>
          <p>Original body text.</p>
        </article>
      </main>
    </body>
  </html>
`;

describe('readerMode', () => {
  it('activates and renders reader shell, then restores original DOM', () => {
    const dom = new JSDOM(basePage, { url: 'https://example.com' });
    const { document } = dom.window;

    const result = activateReader(document, {
      title: 'Extracted Title',
      html: `<p>Extracted content</p>`,
      theme: 'light',
      fontScale: 1.1,
    });

    expect(result.ok).toBe(true);
    expect(isReaderActive()).toBe(true);

    const readerRoot = document.querySelector('#still-reader-root');
    expect(readerRoot).not.toBeNull();
    expect(readerRoot?.textContent).toContain('Extracted content');

    const deactivated = deactivateReader(document);
    expect(deactivated.ok).toBe(true);
    expect(isReaderActive()).toBe(false);

    expect(document.querySelector('#nav')).not.toBeNull();
    expect(document.querySelector('#article')).not.toBeNull();
    expect(document.querySelector('#still-reader-root')).toBeNull();
  });

  it('prevents double activation and remains in first session', () => {
    const dom = new JSDOM(basePage, { url: 'https://example.com' });
    const { document } = dom.window;

    const first = activateReader(document, { html: '<p>A</p>' });
    const second = activateReader(document, { html: '<p>B</p>' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);

    expect(document.querySelector('#still-reader-root')?.textContent).toContain('A');

    deactivateReader(document);
  });

  it('updates font scale and theme via in-reader controls', () => {
    const dom = new JSDOM(
      `
        <html><head><title>Test</title></head>
        <body><article><p>Body</p></article></body></html>
      `,
      { url: 'https://example.com' },
    );
    const { document } = dom.window;

    activateReader(document, { html: '<p>Body</p>', theme: 'light', fontScale: 1 });

    const inc = document.getElementById('sr-font-inc');
    const dec = document.getElementById('sr-font-dec');
    const toggle = document.getElementById('sr-theme-toggle');

    inc?.dispatchEvent(new dom.window.Event('click'));
    expect(document.documentElement.style.getPropertyValue('--sr-font-scale')).toBe('1.1');

    dec?.dispatchEvent(new dom.window.Event('click'));
    expect(document.documentElement.style.getPropertyValue('--sr-font-scale')).toBe('1');

    toggle?.dispatchEvent(new dom.window.Event('click'));
    expect(document.body.getAttribute('data-theme')).toBe('dark');

    deactivateReader(document);
  });

  it('restores scroll position when deactivated', () => {
    const dom = new JSDOM(basePage, { url: 'https://example.com' });
    const { document } = dom.window;

    const calls: Array<[number, number]> = [];
    // @ts-expect-error jsdom allows overriding scrollTo
    document.defaultView!.scrollTo = (x: number, y: number) => {
      calls.push([x, y]);
    };
    // @ts-expect-error enable call even in jsdom
    document.defaultView!.scrollTo.__ALLOW_SCROLL__ = true;
    // Simulate initial scroll
    const win = document.defaultView as unknown as { scrollX: number; scrollY: number };
    win.scrollX = 12;
    win.scrollY = 34;

    activateReader(document, { html: '<p>Body</p>' });
    deactivateReader(document);

    expect(calls.at(-1)).toEqual([12, 34]);
  });
});

