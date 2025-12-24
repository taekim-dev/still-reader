/**
 * Error message constants and user-friendly message mapping.
 * 
 * Technical reason codes are used internally for debugging and logging.
 * User-friendly messages are displayed to users in the UI.
 */

// Technical reason codes (used internally)
export const ERROR_CODES = {
  // Extraction errors
  NO_VIABLE_CANDIDATES: 'No viable candidates found',
  CONFIDENCE_BELOW_THRESHOLD: 'Confidence below threshold',
  EXTRACTED_CONTENT_TOO_SMALL: 'Extracted content too small',
  
  // Reader mode state errors
  ALREADY_ACTIVE: 'already_active',
  NOT_ACTIVE: 'not_active',
  
  // General errors
  UNAVAILABLE: 'unavailable',
  ACTIVATION_FAILED: 'activation_failed',
  UNKNOWN_MESSAGE: 'unknown_message',
  UNKNOWN: 'unknown',
} as const;

// User-friendly messages mapped to error codes
const ERROR_MESSAGE_MAP: Record<string, string> = {
  // Extraction errors
  [ERROR_CODES.NO_VIABLE_CANDIDATES]: 'Unable to find article content on this page',
  [ERROR_CODES.CONFIDENCE_BELOW_THRESHOLD]: 'Unable to extract article content from this page',
  [ERROR_CODES.EXTRACTED_CONTENT_TOO_SMALL]: 'Article content is too short to display',
  
  // Reader mode state messages
  [ERROR_CODES.ALREADY_ACTIVE]: 'Reader mode is already active',
  [ERROR_CODES.NOT_ACTIVE]: 'Reader mode is not active',
  
  // General errors
  [ERROR_CODES.UNAVAILABLE]: 'Reader mode is not available for this page',
  [ERROR_CODES.ACTIVATION_FAILED]: 'Failed to activate reader mode',
  [ERROR_CODES.UNKNOWN_MESSAGE]: 'Unknown command',
  [ERROR_CODES.UNKNOWN]: 'An unknown error occurred',
};

// Success and info messages (not mapped to error codes)
export const USER_MESSAGES = {
  // Success messages
  READER_ACTIVATED: 'Reader activated',
  READER_DEACTIVATED: 'Reader deactivated',
  READER_ALREADY_ACTIVE: 'Reader already active',
  
  // Info messages
  DEACTIVATING: 'Deactivating...',
  ACTIVATING: 'Activating...',
  USE_IN_READER_CONTROLS: 'Use in-reader controls',
  
  // AI summary errors
  FAILED_TO_GET_ARTICLE_TEXT: 'Failed to extract article text',
  COULD_NOT_EXTRACT_ARTICLE_TEXT: 'Could not extract article text',
} as const;

/**
 * Get a user-friendly error message for a technical reason code.
 * Falls back to a generic message if the reason is not recognized.
 * 
 * @param reason - Technical reason code
 * @returns User-friendly message
 */
export function getUserFriendlyMessage(reason: string | undefined | null): string {
  if (!reason) {
    return ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN];
  }
  
  // Check if reason matches any error code
  const message = ERROR_MESSAGE_MAP[reason];
  if (message) {
    return message;
  }
  
  // Fallback: log the technical reason and return generic message
  console.warn('Unknown error reason:', reason);
  return ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN];
}

/**
 * Format an error message for display in the UI.
 * Prefixes with "Failed: " if it's an error.
 * 
 * @param reason - Technical reason code
 * @returns Formatted user-friendly message
 */
export function formatErrorMessage(reason: string | undefined | null): string {
  const message = getUserFriendlyMessage(reason);
  return `Failed: ${message}`;
}

