import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';

import { handleReaderMessage } from '../src/extension/contentHandler';
import { resetReaderMode } from '../src/content/readerMode';

describe('contentHandler', () => {
  beforeEach(() => {
    resetReaderMode();
  });
  it('activates reader mode via messages', () => {
    const dom = new JSDOM(
      `<html><body><article>
        <h1>Sample Article</h1>
        <p>This is a reasonably long paragraph intended to ensure the extractor meets the minimum length threshold for activation.</p>
        <p>Another paragraph with sufficient content to push the text length and paragraph count over the gate.</p>
        <p>Third paragraph to make the heuristic happy and avoid a false negative.</p>
      </article></body></html>`,
      {
        url: 'https://example.com/article',
      },
    );
    const { document } = dom.window;

    const activate = handleReaderMessage(document, { type: 'activate' });
    expect(activate.ok).toBe(true);
    expect(document.querySelector('#still-reader-root')).not.toBeNull();
  });

  it('returns unavailable on nav-only pages', () => {
    const dom = new JSDOM('<html><body><nav><a>Link</a></nav></body></html>', { url: 'https://example.com' });
    const { document } = dom.window;

    const result = handleReaderMessage(document, { type: 'activate' });
    expect(result.ok).toBe(false);
    expect(document.querySelector('#still-reader-root')).toBeNull();
  });

  describe('ping message returns reader status', () => {
    it('returns active: false when reader is not active', () => {
      const dom = new JSDOM(
        `<html><body><article>
          <h1>Sample Article</h1>
          <p>This is a reasonably long paragraph intended to ensure the extractor meets the minimum length threshold for activation.</p>
          <p>Another paragraph with sufficient content to push the text length and paragraph count over the gate.</p>
          <p>Third paragraph to make the heuristic happy and avoid a false negative.</p>
        </article></body></html>`,
        {
          url: 'https://example.com/article',
        },
      );
      const { document } = dom.window;

      const pingResponse = handleReaderMessage(document, { type: 'ping' });
      expect(pingResponse.ok).toBe(true);
      expect(pingResponse.active).toBe(false);
    });

    it('returns active: true when reader is active', () => {
      const dom = new JSDOM(
        `<html><body><article>
          <h1>Sample Article</h1>
          <p>This is a reasonably long paragraph intended to ensure the extractor meets the minimum length threshold for activation.</p>
          <p>Another paragraph with sufficient content to push the text length and paragraph count over the gate.</p>
          <p>Third paragraph to make the heuristic happy and avoid a false negative.</p>
        </article></body></html>`,
        {
          url: 'https://example.com/article',
        },
      );
      const { document } = dom.window;

      // First activate reader
      const activateResponse = handleReaderMessage(document, { type: 'activate' });
      expect(activateResponse.ok).toBe(true);

      // Then ping should return active: true
      const pingResponse = handleReaderMessage(document, { type: 'ping' });
      expect(pingResponse.ok).toBe(true);
      expect(pingResponse.active).toBe(true);
    });
  });

  describe('activate message handles already_active state', () => {
    it('returns already_active when reader is already active', () => {
      const dom = new JSDOM(
        `<html><body><article>
          <h1>Sample Article</h1>
          <p>This is a reasonably long paragraph intended to ensure the extractor meets the minimum length threshold for activation. It contains enough words and characters to pass the extraction heuristics.</p>
          <p>Another paragraph with sufficient content to push the text length and paragraph count over the gate. This paragraph adds more context and detail to help meet the minimum requirements.</p>
          <p>Third paragraph to make the heuristic happy and avoid a false negative. This continues the narrative and provides additional information that helps the extractor identify this as article content.</p>
          <p>Fourth paragraph that adds even more content to ensure we have enough text. This helps with both word count and paragraph count thresholds.</p>
          <p>Fifth paragraph to further strengthen the case that this is indeed article content worth extracting and displaying in reader mode.</p>
        </article></body></html>`,
        {
          url: 'https://example.com/article',
        },
      );
      const { document } = dom.window;

      // First activation should succeed
      const firstActivate = handleReaderMessage(document, { type: 'activate' });
      expect(firstActivate.ok).toBe(true);

      // Second activation should fail with already_active
      const secondActivate = handleReaderMessage(document, { type: 'activate' });
      expect(secondActivate.ok).toBe(false);
      expect(secondActivate.reason).toBe('already_active');
    });
  });
});

