/**
 * Utility functions for AI summarization service.
 */

import { DEFAULT_MODELS, TRUNCATION_ELLIPSIS } from './constants';
import { SummarizerResult } from './summarizer';

/**
 * Get default model for a provider.
 */
export function getDefaultModel(provider: string): string {
  return DEFAULT_MODELS[provider] ?? DEFAULT_MODELS.openai;
}

/**
 * Truncate text to maximum length, appending ellipsis if truncated.
 */
export function truncateText(text: string, maxChars: number, ellipsis: string = TRUNCATION_ELLIPSIS): string {
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

