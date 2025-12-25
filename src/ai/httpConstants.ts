/**
 * HTTP-related constants for AI API calls.
 */

export const HTTP_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  X_API_KEY: 'x-api-key',
  ANTHROPIC_VERSION: 'anthropic-version',
} as const;

export const HTTP_HEADER_VALUES = {
  APPLICATION_JSON: 'application/json',
  BEARER_PREFIX: 'Bearer ',
} as const;

export const API_PATHS = {
  CHAT_COMPLETIONS: '/v1/chat/completions',
} as const;


