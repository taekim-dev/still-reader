/**
 * Unit tests for AI summarization functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { summarizeText, isAIAvailable, SummarizerConfig } from '../src/ai/summarizer';

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

    it('should return error when text is empty', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };
      
      const result = await summarizeText('', config);
      
      expect(result.ok).toBe(false);
      expect(result.error).toContain('too short');
      expect(result.errorCode).toBe('unknown');
    });

    it('should return error when text is only whitespace', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };
      
      const result = await summarizeText('   \n\t  ', config);
      
      expect(result.ok).toBe(false);
      expect(result.error).toContain('too short');
      expect(result.errorCode).toBe('unknown');
    });

    it('should return error when text is exactly 49 characters', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };
      
      const result = await summarizeText('A'.repeat(49), config);
      
      expect(result.ok).toBe(false);
      expect(result.error).toContain('too short');
      expect(result.errorCode).toBe('unknown');
    });

    it('should accept text that is exactly 50 characters', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };

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
      
      const result = await summarizeText('A'.repeat(50), config);
      
      expect(result.ok).toBe(true);
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

    it('should handle OpenAI API errors gracefully', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-openai-key',
        provider: 'openai',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue('Forbidden'),
      });

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('OpenAI API error');
      expect(result.errorCode).toBe('api_error');
    });
  });

  describe('Anthropic API', () => {
    it('should successfully summarize text with Anthropic', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-anthropic-key',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{
            text: 'This is an Anthropic summary of the article.',
          }],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(true);
      expect(result.summary).toBe('This is an Anthropic summary of the article.');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-anthropic-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      );
    });

    it('should handle Anthropic API errors gracefully', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-anthropic-key',
        provider: 'anthropic',
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
      expect(result.error).toContain('Anthropic API error');
      expect(result.errorCode).toBe('api_error');
    });
  });

  describe('Gemini API', () => {
    it('should successfully summarize text with Gemini', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-gemini-key',
        provider: 'gemini',
        model: 'gemini-pro',
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                text: 'This is a Gemini summary of the article.',
              }],
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
      expect(result.summary).toBe('This is a Gemini summary of the article.');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'),
        expect.any(Object)
      );
    });

    it('should handle Gemini API errors gracefully', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-gemini-key',
        provider: 'gemini',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Bad Request'),
      });

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Gemini API error');
      expect(result.errorCode).toBe('api_error');
    });
  });

  describe('Custom API', () => {
    it('should successfully summarize text with custom API', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-custom-key',
        provider: 'custom',
        apiBaseUrl: 'https://api.example.com',
        model: 'custom-model',
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'This is a custom API summary.',
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
      expect(result.summary).toBe('This is a custom API summary.');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-custom-key',
          }),
        })
      );
    });

    it('should return error when custom provider has no apiBaseUrl', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-custom-key',
        provider: 'custom',
        // apiBaseUrl missing
      };

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Custom provider requires apiBaseUrl');
      // Error is wrapped with "API call failed: " which contains "API", so it's classified as api_error
      expect(result.errorCode).toBe('api_error');
    });

    it('should handle custom API errors gracefully', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-custom-key',
        provider: 'custom',
        apiBaseUrl: 'https://api.example.com',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      });

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Custom API error');
      expect(result.errorCode).toBe('api_error');
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

    it('should handle API authentication errors (401)', async () => {
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

    it('should handle API errors (403)', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue('Forbidden'),
      });

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('api_error');
    });

    it('should handle unknown error types', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };

      mockFetch.mockRejectedValue(new Error('Some unexpected error'));

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      // Error is wrapped with "API call failed: " which contains "API", so it's classified as api_error
      expect(result.errorCode).toBe('api_error');
    });

    it('should handle non-Error thrown values', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };

      mockFetch.mockRejectedValue('String error');

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Unknown error');
      // Error is wrapped with "API call failed: " which contains "API", so it's classified as api_error
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

    it('should use default model when model not specified', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
        // model not specified
      };

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

      await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.model).toBe('llama-3.1-8b-instant'); // Default Groq model
    });

    it('should use default maxTokens when not specified', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
        // maxTokens not specified
      };

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

      await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.max_tokens).toBe(200); // Default maxTokens
    });

    it('should handle null response from API (Groq)', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              // content is null/undefined
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
      expect(result.summary).toBe('No summary generated');
    });

    it('should handle null response from API (Anthropic)', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'anthropic',
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [], // Empty content array
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(true);
      expect(result.summary).toBe('No summary generated');
    });

    it('should handle unsupported provider', async () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'unsupported' as any,
      };

      const result = await summarizeText(
        'This is a long article with enough content to be summarized. It contains multiple sentences and paragraphs.',
        config
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Unsupported provider');
      // Error is wrapped with "API call failed: " which contains "API", so it's classified as api_error
      expect(result.errorCode).toBe('api_error');
    });
  });

  describe('isAIAvailable', () => {
    it('should return true when config has valid API key', () => {
      const config: SummarizerConfig = {
        apiKey: 'test-key',
        provider: 'groq',
      };

      expect(isAIAvailable(config)).toBe(true);
    });

    it('should return false when config is null', () => {
      expect(isAIAvailable(null)).toBe(false);
    });

    it('should return false when API key is empty string', () => {
      const config: SummarizerConfig = {
        apiKey: '',
        provider: 'groq',
      };

      expect(isAIAvailable(config)).toBe(false);
    });

    it('should return false when API key is only whitespace', () => {
      const config: SummarizerConfig = {
        apiKey: '   \n\t  ',
        provider: 'groq',
      };

      expect(isAIAvailable(config)).toBe(false);
    });

    it('should return true when API key has whitespace but is not empty', () => {
      const config: SummarizerConfig = {
        apiKey: '  test-key  ',
        provider: 'groq',
      };

      expect(isAIAvailable(config)).toBe(true);
    });
  });
});

