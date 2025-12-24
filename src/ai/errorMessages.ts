/**
 * Error message constants and user-friendly message mapping for AI summarization.
 * 
 * Technical error codes are used internally for debugging and logging.
 * User-friendly messages are displayed to users in the UI.
 */

// Technical error codes (used internally)
export const ERROR_CODES = {
  NO_API_KEY: 'no_api_key',
  TEXT_TOO_SHORT: 'text_too_short',
  API_ERROR: 'api_error',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  UNSUPPORTED_PROVIDER: 'unsupported_provider',
  CUSTOM_PROVIDER_MISSING_URL: 'custom_provider_missing_url',
  UNKNOWN: 'unknown',
} as const;

// User-friendly messages mapped to error codes
const ERROR_MESSAGE_MAP: Record<string, string> = {
  [ERROR_CODES.NO_API_KEY]: 'AI summarization is not configured. Please add an API key in settings.',
  [ERROR_CODES.TEXT_TOO_SHORT]: 'Text is too short to summarize.',
  [ERROR_CODES.API_ERROR]: 'Failed to connect to the AI service. Please check your API key and try again.',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your internet connection and try again.',
  [ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again.',
  [ERROR_CODES.UNSUPPORTED_PROVIDER]: 'Unsupported AI provider.',
  [ERROR_CODES.CUSTOM_PROVIDER_MISSING_URL]: 'Custom provider requires an API base URL.',
  [ERROR_CODES.UNKNOWN]: 'An unknown error occurred while generating the summary.',
} as const;

/**
 * Get a user-friendly error message for a technical error code.
 * Falls back to a generic message if the code is not recognized.
 * 
 * @param errorCode - Technical error code
 * @returns User-friendly message
 */
export function getUserFriendlyMessage(errorCode: string | undefined | null): string {
  if (!errorCode) {
    return ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN];
  }

  const message = ERROR_MESSAGE_MAP[errorCode];
  if (message) {
    return message;
  }

  console.warn('Unknown error code:', errorCode);
  return ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN];
}

/**
 * Format an error message for display in the UI.
 * Prefixes with "Failed: " if it's an error.
 * 
 * @param errorCode - Technical error code
 * @returns Formatted user-friendly message
 */
export function formatErrorMessage(errorCode: string | undefined | null): string {
  const message = getUserFriendlyMessage(errorCode);
  return `Failed: ${message}`;
}

// Internal error message prefixes (for API error messages)
export const ERROR_PREFIXES = {
  GROQ_API: 'Groq API error',
  OPENAI_API: 'OpenAI API error',
  ANTHROPIC_API: 'Anthropic API error',
  GEMINI_API: 'Gemini API error',
  CUSTOM_API: 'Custom API error',
  API_CALL_FAILED: 'API call failed',
  SUMMARIZATION_FAILED: 'Summarization failed',
} as const;

