/**
 * Tests for AI summarization functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { summarizeText, SummarizerConfig } from '../src/ai/summarizer';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('summarizeText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('should return error when no config provided', async () => {
      const result = await summarizeText('Some text to summarize', null);
      
      expect(result.ok).toBe(false);
      expect(result.error).toContain('not configured');
      expect(result.errorCode).toBe('no_api_key');
    });

    it('should return error when config has no API key', async () => {
      const config: SummarizerConfig = {
        apiKey: '',
        provider: 'groq',
      };
      
      const result = await summarizeText('Some text to summarize', config);
      
      expect(result.ok).toBe(false);
      expect(result.error).toContain('not configured');
      expect(result.errorCode).toBe('no_api_key');
    });

    it('should return error when text is too short', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };
      
      const result = await summarizeText('Short', config);
      
      expect(result.ok).toBe(false);
      expect(result.error).toContain('too short');
      expect(result.errorCode).toBe('unknown');
    });
  });

  describe('Groq API', () => {
    it('should successfully summarize text with Groq', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-groq-key',
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        maxTokens: 200,
      };

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

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs that provide context and information.',
        config
      );

      expect(result.ok).toBe(true);
      expect(result.summary).toBe('This is a test summary of the article.');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-groq-key',
          }),
        })
      );
    });

    it('should handle Groq API errors gracefully', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-groq-key',
        provider: 'groq',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized'),
      });

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Groq API error');
      expect(result.errorCode).toBe('api_error');
    });
  });

  describe('OpenAI API', () => {
    it('should successfully summarize text with OpenAI', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-openai-key',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'OpenAI summary here.',
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(true);
      expect(result.summary).toBe('OpenAI summary here.');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };

      mockFetch.mockRejectedValue(new Error('fetch failed'));

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Summarization failed');
      expect(result.errorCode).toBe('network_error');
    });

    it('should handle timeout errors', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };

      mockFetch.mockRejectedValue(new Error('Request timeout'));

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('timeout');
    });

    it('should handle API authentication errors', async () => {
      const config: SummarizerConfig = {
        apiKey: 'invalid-key',
        provider: 'groq',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized'),
      });

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('api_error');
    });
  });

  describe('default behavior', () => {
    it('should default to Groq provider when not specified', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        // provider not specified
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Default summary',
            },
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(true);
      // Should call Groq API
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should truncate very long text', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };

      const longText = 'A'.repeat(10000); // Very long text
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

      const result = await summarizeText(longText, config);

      expect(result.ok).toBe(true);
      // Verify the request body contains truncated text
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.messages[1].content.length).toBeLessThan(10000);
    });
  });
});

