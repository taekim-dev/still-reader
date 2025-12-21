import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { handleReaderMessage } from '../src/extension/contentHandler';

describe('contentHandler', () => {
  it('activates and deactivates via messages', () => {
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

    const deactivate = handleReaderMessage(document, { type: 'deactivate' });
    expect(deactivate.ok).toBe(true);
    expect(document.querySelector('#still-reader-root')).toBeNull();
  });

  it('returns unavailable on nav-only pages', () => {
    const dom = new JSDOM('<html><body><nav><a>Link</a></nav></body></html>', { url: 'https://example.com' });
    const { document } = dom.window;

    const result = handleReaderMessage(document, { type: 'activate' });
    expect(result.ok).toBe(false);
    expect(document.querySelector('#still-reader-root')).toBeNull();
  });
});

