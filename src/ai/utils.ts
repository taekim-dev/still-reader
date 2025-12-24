/**
 * Utility functions for AI summarization service.
 */

import { SummarizerResult } from './summarizer';

// Default models for each provider
const DEFAULT_MODELS: Record<string, string> = {
  groq: 'llama-3.1-8b-instant',
  openai: 'gpt-3.5-turbo',
  anthropic: 'claude-3-haiku-20240307',
  gemini: 'gemini-pro',
};

/**
 * Get default model for a provider.
 */
export function getDefaultModel(provider: string): string {
  return DEFAULT_MODELS[provider] ?? DEFAULT_MODELS.openai;
}

/**
 * Truncate text to maximum length, appending ellipsis if truncated.
 */
export function truncateText(text: string, maxChars: number, ellipsis: string = '...'): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + ellipsis;
}

/**
 * Classify error message into error code category.
 */
export function classifyError(errorMessage: string): SummarizerResult['errorCode'] {
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'network_error';
  }
  if (errorMessage.includes('timeout')) {
    return 'timeout';
  }
  if (errorMessage.includes('API') || errorMessage.includes('401') || errorMessage.includes('403')) {
    return 'api_error';
  }
  return 'unknown';
}

