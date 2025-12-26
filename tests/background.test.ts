/**
 * Tests for background worker functionality.
 * These tests verify that the background worker can properly call storage functions
 * and handle summarize requests without minification errors.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { summarizeText } from '../src/ai/summarizer';
import { getAIConfig, saveAIConfig, AIConfig } from '../src/extension/storage/aiConfig';
import { getThemePreference } from '../src/extension/storage/theme';

// Mock chrome.storage.sync
const mockStorage: Record<string, any> = {};

const mockChromeStorage = {
  sync: {
    get: vi.fn((key: string | string[], callback?: (result: Record<string, any>) => void) => {
      if (typeof key === 'string') {
        const result = { [key]: mockStorage[key] };
        if (callback) {
          callback(result);
          return;
        }
        return Promise.resolve(result);
      } else {
        const result: Record<string, any> = {};
        key.forEach((k) => {
          result[k] = mockStorage[k];
        });
        if (callback) {
          callback(result);
          return;
        }
        return Promise.resolve(result);
      }
    }),
    set: vi.fn((items: Record<string, any>, callback?: () => void) => {
      Object.assign(mockStorage, items);
      if (callback) {
        callback();
        return;
      }
      return Promise.resolve();
    }),
    remove: vi.fn((key: string, callback?: () => void) => {
      delete mockStorage[key];
      if (callback) {
        callback();
        return;
      }
      return Promise.resolve();
    }),
  },
};

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// @ts-expect-error - Mocking chrome global
global.chrome = {
  storage: mockChromeStorage,
};

describe('Background worker integration', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('getAIConfig integration', () => {
    it('should successfully retrieve AI config from storage', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-api-key-123',
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        maxTokens: 200,
      };

      await saveAIConfig(testConfig);

      // This simulates what handleSummarize does
      const config = await getAIConfig();
      
      expect(config).not.toBeNull();
      expect(config?.apiKey).toBe('test-api-key-123');
      expect(config?.provider).toBe('groq');
    });

    it('should handle null config gracefully in summarize flow', async () => {
      // No config saved - should return null
      const config = await getAIConfig();
      expect(config).toBeNull();

      // This should not throw and should return a graceful error
      const result = await summarizeText('This is a test article with enough content to be summarized properly.', config);
      
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('no_api_key');
      expect(result.error).toContain('not configured');
    });
  });

  describe('handleSummarize flow', () => {
    it('should successfully summarize with valid config', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-groq-key',
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        maxTokens: 200,
      };

      await saveAIConfig(testConfig);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'This is a test summary of the article.',
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      // Simulate the exact flow that handleSummarize uses
      const config = await getAIConfig();
      const summarizerConfig = config && config.apiKey
        ? {
            apiKey: config.apiKey,
            provider: config.provider,
            model: config.model,
            maxTokens: config.maxTokens,
            apiBaseUrl: config.apiBaseUrl,
          }
        : null;

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs that provide context and information.',
        summarizerConfig
      );

      expect(result.ok).toBe(true);
      expect(result.summary).toBe('This is a test summary of the article.');
    });

    it('should handle getAIConfig being called as a function (minification safety)', async () => {
      // This test ensures that getAIConfig can be called as a function
      // and doesn't get confused with constants (like storage keys)
      const testConfig: AIConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };

      await saveAIConfig(testConfig);

      // Call getAIConfig as a function (simulating minified code)
      const getConfigFn = getAIConfig;
      const config = await getConfigFn();

      expect(config).not.toBeNull();
      expect(config?.apiKey).toBe('test-key');
    });
  });

  describe('activate-reader command', () => {
    it('should load theme preference for activation', async () => {
      // Set theme preference
      mockStorage['still-reader-theme'] = 'dark';

      const theme = await getThemePreference();
      expect(theme).toBe('dark');

      // This simulates what the activate-reader command does
      // It loads theme and sends activate message with theme
      const themePreference = await getThemePreference();

      // Verify theme is loaded correctly
      expect(themePreference).toBe('dark');
    });

    it('should default to light theme if no preference is set', async () => {
      // No theme preference set
      const theme = await getThemePreference();
      expect(theme).toBe('light');
    });
  });
});

