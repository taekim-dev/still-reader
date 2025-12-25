import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';

import { activateReaderMode, isReaderActive } from '../src/content/contentScript';
import { resetReaderMode } from '../src/content/readerMode';

const fixture = (name: string): string =>
  readFileSync(join(__dirname, 'fixtures', name), { encoding: 'utf-8' });

describe('contentScript harness', () => {
  beforeEach(() => {
    resetReaderMode();
  });

  it('activates reader mode on a real article page', () => {
    const html = fixture('techcrunch-graphite-full.html');
    const dom = new JSDOM(html, {
      url: 'https://techcrunch.com/2025/12/19/cursor-continues-acquisition-spree-with-graphite-deal/',
    });
    const { document } = dom.window;

    const result = activateReaderMode(document);

    expect(result.ok).toBe(true);
    expect(isReaderActive()).toBe(true);

    const readerRoot = document.querySelector('#still-reader-root');
    expect(readerRoot).not.toBeNull();
    expect(readerRoot?.textContent?.toLowerCase()).toContain('cursor continues acquisition spree');
  });

  it('declines activation on a nav-only page and leaves DOM intact', () => {
    const html = fixture('nav-feed.html');
    const dom = new JSDOM(html, { url: 'https://example.com/' });
    const { document } = dom.window;

    const result = activateReaderMode(document);

    expect(result.ok).toBe(false);
    expect(isReaderActive()).toBe(false);
    expect(document.querySelector('nav')).not.toBeNull();
    expect(document.querySelector('#still-reader-root')).toBeNull();
  });
});

