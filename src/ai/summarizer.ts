/**
 * Independent AI summarization service.
 * This module is completely optional and will gracefully degrade if:
 * - API key is not configured
 * - API call fails
 * - Service is unavailable
 * 
 * Core reader functionality will continue to work regardless of AI status.
 */

import {
  DEFAULT_PROVIDER,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  MIN_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  ANTHROPIC_VERSION,
  DEFAULT_SUMMARY_FALLBACK,
  TRUNCATION_ELLIPSIS,
} from './constants';

export interface SummarizerConfig {
  apiKey: string;
  provider?: 'openai' | 'anthropic' | 'groq' | 'gemini' | 'custom';
  model?: string;
  maxTokens?: number;
  apiBaseUrl?: string; // For custom providers
}

export interface SummarizerResult {
  ok: boolean;
  summary?: string;
  error?: string;
  errorCode?: 'no_api_key' | 'api_error' | 'network_error' | 'timeout' | 'unknown';
}

/**
 * Summarize text using an LLM API.
 * Returns a graceful error if AI is not configured or unavailable.
 */
export async function summarizeText(
  text: string,
  config: SummarizerConfig | null
): Promise<SummarizerResult> {
  // Graceful degradation: if no config, return friendly error
  if (!config || !config.apiKey) {
    return {
      ok: false,
      error: 'AI summarization is not configured. Please add an API key in settings.',
      errorCode: 'no_api_key',
    };
  }

  // Validate input
  if (!text || text.trim().length < MIN_TEXT_LENGTH) {
    return {
      ok: false,
      error: 'Text is too short to summarize.',
      errorCode: 'unknown',
    };
  }

  try {
    const summary = await callLLMAPI(text, config);
    return {
      ok: true,
      summary,
    };
  } catch (error) {
    // Graceful error handling - don't break the app
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let errorCode: SummarizerResult['errorCode'] = 'unknown';

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorCode = 'network_error';
    } else if (errorMessage.includes('timeout')) {
      errorCode = 'timeout';
    } else if (errorMessage.includes('API') || errorMessage.includes('401') || errorMessage.includes('403')) {
      errorCode = 'api_error';
    }

    return {
      ok: false,
      error: `Summarization failed: ${errorMessage}`,
      errorCode,
    };
  }
}

/**
 * Call the actual LLM API.
 * 
 * IMPORTANT: API keys are NEVER stored in code or environment variables.
 * They are entered by users at runtime and stored in chrome.storage.
 * 
 * Supported providers:
 * - OpenAI: https://platform.openai.com/api-keys (Free tier: $5 credit)
 * - Anthropic: https://console.anthropic.com/ (Free tier: Limited)
 * - Groq: https://console.groq.com/ (Free tier: 14,400 requests/day - RECOMMENDED)
 * - Google Gemini: https://aistudio.google.com/app/apikey (Free tier: 60 requests/min)
 */
async function callLLMAPI(text: string, config: SummarizerConfig): Promise<string> {
  const provider = config.provider ?? DEFAULT_PROVIDER;
  const model = config.model ?? getDefaultModel(provider);
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  const apiKey = config.apiKey;

  // Truncate text to reasonable length (most APIs have token limits)
  const truncatedText = truncateText(text, MAX_TEXT_LENGTH);

  try {
    switch (provider) {
      case 'groq':
        return await callGroqAPI(truncatedText, apiKey, model, maxTokens);
      case 'openai':
        return await callOpenAIAPI(truncatedText, apiKey, model, maxTokens);
      case 'anthropic':
        return await callAnthropicAPI(truncatedText, apiKey, model, maxTokens);
      case 'gemini':
        return await callGeminiAPI(truncatedText, apiKey, model, maxTokens);
      case 'custom':
        if (!config.apiBaseUrl) {
          throw new Error('Custom provider requires apiBaseUrl');
        }
        return await callCustomAPI(truncatedText, apiKey, config.apiBaseUrl, model, maxTokens);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`API call failed: ${errorMessage}`);
  }
}

function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    groq: 'llama-3.1-8b-instant', // Fast and free
    openai: 'gpt-3.5-turbo',
    anthropic: 'claude-3-haiku-20240307',
    gemini: 'gemini-pro',
  };
  return defaults[provider] ?? 'gpt-3.5-turbo';
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + TRUNCATION_ELLIPSIS;
}

// Groq API (RECOMMENDED: Best free tier - 14,400 requests/day)
async function callGroqAPI(text: string, apiKey: string, model: string, maxTokens: number): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes articles concisely. Provide a clear, informative summary in 2-3 sentences.',
        },
        {
          role: 'user',
          content: `Please summarize the following article:\n\n${text}`,
        },
      ],
      max_tokens: maxTokens,
      temperature: DEFAULT_TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? DEFAULT_SUMMARY_FALLBACK;
}

// OpenAI API
async function callOpenAIAPI(text: string, apiKey: string, model: string, maxTokens: number): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes articles concisely. Provide a clear, informative summary in 2-3 sentences.',
        },
        {
          role: 'user',
          content: `Please summarize the following article:\n\n${text}`,
        },
      ],
      max_tokens: maxTokens,
      temperature: DEFAULT_TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? DEFAULT_SUMMARY_FALLBACK;
}

// Anthropic API
async function callAnthropicAPI(text: string, apiKey: string, model: string, maxTokens: number): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: `Please summarize the following article in 2-3 sentences:\n\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0]?.text ?? DEFAULT_SUMMARY_FALLBACK;
}

// Google Gemini API
async function callGeminiAPI(text: string, apiKey: string, model: string, maxTokens: number): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Please summarize the following article in 2-3 sentences:\n\n${text}`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text ?? DEFAULT_SUMMARY_FALLBACK;
}

// Custom API (for self-hosted or other providers)
async function callCustomAPI(
  text: string,
  apiKey: string,
  apiBaseUrl: string,
  model: string,
  maxTokens: number
): Promise<string> {
  // Generic OpenAI-compatible API format
  const response = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes articles concisely.',
        },
        {
          role: 'user',
          content: `Please summarize the following article:\n\n${text}`,
        },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Custom API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? DEFAULT_SUMMARY_FALLBACK;
}

/**
 * Check if AI summarization is available (configured).
 */
export function isAIAvailable(config: SummarizerConfig | null): boolean {
  return !!(config && config.apiKey && config.apiKey.trim().length > 0);
}

