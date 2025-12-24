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
  API_ENDPOINTS,
  SYSTEM_PROMPTS,
  USER_PROMPT_PREFIX,
} from './constants';
import { ERROR_CODES, getUserFriendlyMessage, ERROR_PREFIXES } from './errorMessages';
import { getDefaultModel, truncateText, classifyError } from './utils';

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
  // Step 1: Validate configuration
  if (!config || !config.apiKey) {
    return {
      ok: false,
      error: getUserFriendlyMessage(ERROR_CODES.NO_API_KEY),
      errorCode: ERROR_CODES.NO_API_KEY,
    };
  }

  // Step 2: Validate input text
  if (!text || text.trim().length < MIN_TEXT_LENGTH) {
    return {
      ok: false,
      error: getUserFriendlyMessage(ERROR_CODES.TEXT_TOO_SHORT),
      errorCode: ERROR_CODES.UNKNOWN,
    };
  }

  try {
    const summary = await callLLMAPI(text, config);
    return {
      ok: true,
      summary,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = classifyError(errorMessage);

    return {
      ok: false,
      error: `${ERROR_PREFIXES.SUMMARIZATION_FAILED}: ${errorMessage}`,
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
  const truncatedText = truncateText(text, MAX_TEXT_LENGTH, TRUNCATION_ELLIPSIS);

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
          throw new Error(getUserFriendlyMessage(ERROR_CODES.CUSTOM_PROVIDER_MISSING_URL));
        }
        return await callCustomAPI(truncatedText, apiKey, config.apiBaseUrl, model, maxTokens);
      default:
        throw new Error(getUserFriendlyMessage(ERROR_CODES.UNSUPPORTED_PROVIDER));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`${ERROR_PREFIXES.API_CALL_FAILED}: ${errorMessage}`);
  }
}


/**
 * Call Groq API.
 */
async function callGroqAPI(text: string, apiKey: string, model: string, maxTokens: number): Promise<string> {
  const response = await fetch(API_ENDPOINTS.groq, {
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
          content: SYSTEM_PROMPTS.groq,
        },
        {
          role: 'user',
          content: `${USER_PROMPT_PREFIX}${text}`,
        },
      ],
      max_tokens: maxTokens,
      temperature: DEFAULT_TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${ERROR_PREFIXES.GROQ_API}: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? DEFAULT_SUMMARY_FALLBACK;
}

/**
 * Call OpenAI API.
 */
async function callOpenAIAPI(text: string, apiKey: string, model: string, maxTokens: number): Promise<string> {
  const response = await fetch(API_ENDPOINTS.openai, {
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
          content: SYSTEM_PROMPTS.openai,
        },
        {
          role: 'user',
          content: `${USER_PROMPT_PREFIX}${text}`,
        },
      ],
      max_tokens: maxTokens,
      temperature: DEFAULT_TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${ERROR_PREFIXES.OPENAI_API}: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? DEFAULT_SUMMARY_FALLBACK;
}

/**
 * Call Anthropic API.
 */
async function callAnthropicAPI(text: string, apiKey: string, model: string, maxTokens: number): Promise<string> {
  const response = await fetch(API_ENDPOINTS.anthropic, {
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
          content: `${SYSTEM_PROMPTS.anthropic}\n\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${ERROR_PREFIXES.ANTHROPIC_API}: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0]?.text ?? DEFAULT_SUMMARY_FALLBACK;
}

/**
 * Call Gemini API.
 */
async function callGeminiAPI(text: string, apiKey: string, model: string, maxTokens: number): Promise<string> {
  const response = await fetch(API_ENDPOINTS.gemini(model, apiKey), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${SYSTEM_PROMPTS.gemini}\n\n${text}`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: DEFAULT_TEMPERATURE,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${ERROR_PREFIXES.GEMINI_API}: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text ?? DEFAULT_SUMMARY_FALLBACK;
}

/**
 * Call Custom API (for self-hosted or other providers).
 */
async function callCustomAPI(
  text: string,
  apiKey: string,
  apiBaseUrl: string,
  model: string,
  maxTokens: number
): Promise<string> {
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
          content: SYSTEM_PROMPTS.custom,
        },
        {
          role: 'user',
          content: `${USER_PROMPT_PREFIX}${text}`,
        },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${ERROR_PREFIXES.CUSTOM_API}: ${response.status} - ${error}`);
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

