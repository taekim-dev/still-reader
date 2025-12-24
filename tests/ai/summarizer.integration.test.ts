/**
 * Integration tests for AI summarization flow.
 * Tests the complete flow from popup → background → summarizer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { summarizeText } from '../../src/ai/summarizer';
import { getAIConfig, saveAIConfig, AIConfig } from '../../src/extension/storage';
import { SummarizeMessage, SummarizeResponse } from '../../src/extension/messages';

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

// Mock chrome.runtime.sendMessage
const mockSendMessage = vi.fn();

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// @ts-expect-error - Mocking chrome global
global.chrome = {
  storage: mockChromeStorage,
  runtime: {
    sendMessage: mockSendMessage,
  },
};

/**
 * Simulate handleSummarize function from background.ts
 * This is the actual function that runs in the background worker
 */
async function handleSummarize(text: string): Promise<SummarizeResponse> {
  // Get AI config from storage (may be null if not configured)
  const config = await getAIConfig();
  
  // Convert storage format to summarizer config
  const summarizerConfig = config && config.apiKey
    ? {
        apiKey: config.apiKey,
        provider: config.provider,
        model: config.model,
        maxTokens: config.maxTokens,
        apiBaseUrl: config.apiBaseUrl,
      }
    : null;

  // Call the independent AI service
  // This will gracefully handle missing config or API failures
  return summarizeText(text, summarizerConfig);
}

describe('AI Summarization Integration Tests', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('Full flow: Popup → Background → Summarizer', () => {
    it('should successfully complete full flow with valid config', async () => {
      // Step 1: Save AI config (simulating user setting up API key)
      const testConfig: AIConfig = {
        apiKey: 'test-groq-key',
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        maxTokens: 200,
      };
      await saveAIConfig(testConfig);

      // Step 2: Mock successful API response
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'This is a comprehensive summary of the article.',
            },
          }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Step 3: Simulate popup sending message to background
      const summarizeMessage: SummarizeMessage = {
        type: 'summarize',
        text: 'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs that provide context and information.',
      };

      // Step 4: Background worker handles the message (simulate handleSummarize)
      const response = await handleSummarize(summarizeMessage.text);

      // Step 5: Verify response
      expect(response.ok).toBe(true);
      expect(response.summary).toBe('This is a comprehensive summary of the article.');
      expect(response.error).toBeUndefined();
      expect(response.errorCode).toBeUndefined();
    });

    it('should handle full flow when AI is not configured', async () => {
      // No config saved - simulate user not setting up API key

      // Simulate popup sending message to background
      const summarizeMessage: SummarizeMessage = {
        type: 'summarize',
        text: 'This is a long article with enough content to be summarized.',
      };

      // Background worker handles the message
      const response = await handleSummarize(summarizeMessage.text);

      // Verify graceful error response
      expect(response.ok).toBe(false);
      expect(response.error).toContain('not configured');
      expect(response.errorCode).toBe('no_api_key');
      expect(response.summary).toBeUndefined();

      // Verify no API call was made
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle full flow when API call fails', async () => {
      // Step 1: Save AI config
      const testConfig: AIConfig = {
        apiKey: 'test-groq-key',
        provider: 'groq',
      };
      await saveAIConfig(testConfig);

      // Step 2: Mock API error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized'),
      });

      // Step 3: Simulate popup sending message
      const summarizeMessage: SummarizeMessage = {
        type: 'summarize',
        text: 'This is a long article with enough content to be summarized.',
      };

      // Step 4: Background worker handles the message
      const response = await handleSummarize(summarizeMessage.text);

      // Step 5: Verify error response
      expect(response.ok).toBe(false);
      expect(response.error).toContain('Summarization failed');
      expect(response.errorCode).toBe('api_error');
      expect(response.summary).toBeUndefined();
    });

    it('should handle full flow when text is too short', async () => {
      // Step 1: Save AI config
      const testConfig: AIConfig = {
        apiKey: 'test-groq-key',
        provider: 'groq',
      };
      await saveAIConfig(testConfig);

      // Step 2: Simulate popup sending short text
      const summarizeMessage: SummarizeMessage = {
        type: 'summarize',
        text: 'Short',
      };

      // Step 3: Background worker handles the message
      const response = await handleSummarize(summarizeMessage.text);

      // Step 4: Verify error response
      expect(response.ok).toBe(false);
      expect(response.error).toContain('too short');
      expect(response.errorCode).toBe('unknown');
      expect(response.summary).toBeUndefined();

      // Verify no API call was made
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Config conversion: Storage → Summarizer', () => {
    it('should correctly convert storage config to summarizer config', async () => {
      const storageConfig: AIConfig = {
        apiKey: 'test-key',
        provider: 'openai',
        model: 'gpt-4',
        maxTokens: 500,
        apiBaseUrl: 'https://custom.api.com',
      };

      await saveAIConfig(storageConfig);

      const config = await getAIConfig();
      expect(config).not.toBeNull();
      expect(config?.apiKey).toBe('test-key');
      expect(config?.provider).toBe('openai');
      expect(config?.model).toBe('gpt-4');
      expect(config?.maxTokens).toBe(500);
      expect(config?.apiBaseUrl).toBe('https://custom.api.com');

      // Verify it works in summarizer flow
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Summary',
            },
          }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

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
        'This is a long article with enough content to be summarized.',
        summarizerConfig
      );

      expect(result.ok).toBe(true);
    });

    it('should handle partial config (only apiKey)', async () => {
      const storageConfig: AIConfig = {
        apiKey: 'test-key',
        // Other fields optional
      };

      await saveAIConfig(storageConfig);

      const config = await getAIConfig();
      expect(config).not.toBeNull();
      expect(config?.apiKey).toBe('test-key');

      // Should use defaults for provider/model
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Summary',
            },
          }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

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
        'This is a long article with enough content to be summarized.',
        summarizerConfig
      );

      expect(result.ok).toBe(true);
      // Should default to Groq
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should handle null config conversion', async () => {
      // No config saved
      const config = await getAIConfig();
      expect(config).toBeNull();

      const summarizerConfig = config && config.apiKey
        ? {
            apiKey: config.apiKey,
            provider: config.provider,
            model: config.model,
            maxTokens: config.maxTokens,
            apiBaseUrl: config.apiBaseUrl,
          }
        : null;

      expect(summarizerConfig).toBeNull();

      const result = await summarizeText(
        'This is a long article with enough content to be summarized.',
        summarizerConfig
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('no_api_key');
    });
  });

  describe('Error propagation through layers', () => {
    it('should propagate network errors correctly', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };
      await saveAIConfig(testConfig);

      // Use error message that contains "network" or "fetch" to be classified as network_error
      mockFetch.mockRejectedValue(new Error('fetch failed'));

      const response = await handleSummarize(
        'This is a long article with enough content to be summarized.'
      );

      expect(response.ok).toBe(false);
      expect(response.error).toContain('Summarization failed');
      expect(response.error).toContain('fetch failed');
      expect(response.errorCode).toBe('network_error');
    });

    it('should propagate timeout errors correctly', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };
      await saveAIConfig(testConfig);

      mockFetch.mockRejectedValue(new Error('Request timeout'));

      const response = await handleSummarize(
        'This is a long article with enough content to be summarized.'
      );

      expect(response.ok).toBe(false);
      expect(response.errorCode).toBe('timeout');
    });

    it('should handle storage errors gracefully', async () => {
      // Mock storage.get to throw an error
      mockChromeStorage.sync.get.mockRejectedValueOnce(new Error('Storage error'));

      // Should still return a valid response (null config)
      const config = await getAIConfig();
      expect(config).toBeNull();

      const response = await handleSummarize(
        'This is a long article with enough content to be summarized.'
      );

      expect(response.ok).toBe(false);
      expect(response.errorCode).toBe('no_api_key');
    });
  });

  describe('Multiple provider support', () => {
    it('should work with Groq provider', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-groq-key',
        provider: 'groq',
      };
      await saveAIConfig(testConfig);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Groq summary',
            },
          }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await handleSummarize(
        'This is a long article with enough content to be summarized.'
      );

      expect(response.ok).toBe(true);
      expect(response.summary).toBe('Groq summary');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should work with OpenAI provider', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-openai-key',
        provider: 'openai',
      };
      await saveAIConfig(testConfig);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'OpenAI summary',
            },
          }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await handleSummarize(
        'This is a long article with enough content to be summarized.'
      );

      expect(response.ok).toBe(true);
      expect(response.summary).toBe('OpenAI summary');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should work with Anthropic provider', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-anthropic-key',
        provider: 'anthropic',
      };
      await saveAIConfig(testConfig);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{
            text: 'Anthropic summary',
          }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await handleSummarize(
        'This is a long article with enough content to be summarized.'
      );

      expect(response.ok).toBe(true);
      expect(response.summary).toBe('Anthropic summary');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.any(Object)
      );
    });

    it('should work with Gemini provider', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-gemini-key',
        provider: 'gemini',
      };
      await saveAIConfig(testConfig);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                text: 'Gemini summary',
              }],
            },
          }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await handleSummarize(
        'This is a long article with enough content to be summarized.'
      );

      expect(response.ok).toBe(true);
      expect(response.summary).toBe('Gemini summary');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.any(Object)
      );
    });

    it('should work with custom provider', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-custom-key',
        provider: 'custom',
        apiBaseUrl: 'https://api.example.com',
      };
      await saveAIConfig(testConfig);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Custom API summary',
            },
          }],
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await handleSummarize(
        'This is a long article with enough content to be summarized.'
      );

      expect(response.ok).toBe(true);
      expect(response.summary).toBe('Custom API summary');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/chat/completions',
        expect.any(Object)
      );
    });
  });
});

