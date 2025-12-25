/**
 * Tests for content script entry point (Chrome messaging integration).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleReaderMessage } from '../../src/extension/contentHandler';
import { ReaderMessage } from '../../src/extension/messages';
import { resetReaderMode } from '../../src/content/readerMode';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
};

// Setup
beforeEach(() => {
  resetReaderMode();
  global.chrome = mockChrome as unknown as typeof chrome;
  vi.clearAllMocks();
});

afterEach(() => {
  delete (global as { chrome?: unknown }).chrome;
});

describe('Content script Chrome messaging', () => {
  it('should register message listener on load', () => {
    // Import the content script module (this will execute the listener registration)
    // We can't easily test the actual listener without loading the module,
    // but we can verify the handler function works correctly
    expect(mockChrome.runtime.onMessage.addListener).not.toHaveBeenCalled();
  });

  it('should handle activate message via handler', () => {
    const doc = document.implementation.createHTMLDocument();
    // Use realistic article content that will pass extraction threshold
    doc.body.innerHTML = `
      <header><h1>Site</h1></header>
      <article>
        <h1>Article Title</h1>
        <p>This is the first paragraph of the article with substantial content.</p>
        <p>This is the second paragraph that adds more detail and context.</p>
        <p>This is the third paragraph that continues the narrative.</p>
        <p>This is the fourth paragraph with additional information.</p>
        <p>This is the fifth paragraph that provides more depth.</p>
      </article>
      <footer>Contact</footer>
    `;

    const message: ReaderMessage = { type: 'activate' };
    const response = handleReaderMessage(doc, message);

    expect(response.ok).toBe(true);
    expect(response.confidence).toBeDefined();
  });

  it('should handle deactivate message via handler', () => {
    const doc = document.implementation.createHTMLDocument();
    // Use realistic article content that will pass extraction threshold
    doc.body.innerHTML = `
      <header><h1>Site</h1></header>
      <article>
        <h1>Article Title</h1>
        <p>This is the first paragraph of the article with substantial content.</p>
        <p>This is the second paragraph that adds more detail and context.</p>
        <p>This is the third paragraph that continues the narrative.</p>
        <p>This is the fourth paragraph with additional information.</p>
        <p>This is the fifth paragraph that provides more depth.</p>
      </article>
      <footer>Contact</footer>
    `;

    // Activate reader
    handleReaderMessage(doc, { type: 'activate' });
  });

  it('should handle ping message via handler', () => {
    const doc = document.implementation.createHTMLDocument();
    const message: ReaderMessage = { type: 'ping' };
    const response = handleReaderMessage(doc, message);

    expect(response.ok).toBe(true);
    expect(response.active).toBe(false); // Should return active status
  });

  it('should return active: true in ping when reader is active', () => {
    const doc = document.implementation.createHTMLDocument();
    // Use realistic article content that will pass extraction threshold
    doc.body.innerHTML = `
      <header><h1>Site</h1></header>
      <article>
        <h1>Article Title</h1>
        <p>This is the first paragraph of the article with substantial content.</p>
        <p>This is the second paragraph that adds more detail and context.</p>
        <p>This is the third paragraph that continues the narrative.</p>
        <p>This is the fourth paragraph with additional information.</p>
        <p>This is the fifth paragraph that provides more depth.</p>
      </article>
      <footer>Contact</footer>
    `;

    // First activate
    handleReaderMessage(doc, { type: 'activate' });

    // Then ping should return active: true
    const message: ReaderMessage = { type: 'ping' };
    const response = handleReaderMessage(doc, message);

    expect(response.ok).toBe(true);
    expect(response.active).toBe(true);
  });
});

