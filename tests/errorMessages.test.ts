import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  ERROR_CODES,
  USER_MESSAGES,
  getUserFriendlyMessage,
  formatErrorMessage,
} from '../src/extension/errorMessages';

describe('errorMessages', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('ERROR_CODES', () => {
    it('should have all expected error codes', () => {
      expect(ERROR_CODES.NO_VIABLE_CANDIDATES).toBe('No viable candidates found');
      expect(ERROR_CODES.CONFIDENCE_BELOW_THRESHOLD).toBe('Confidence below threshold');
      expect(ERROR_CODES.EXTRACTED_CONTENT_TOO_SMALL).toBe('Extracted content too small');
      expect(ERROR_CODES.ALREADY_ACTIVE).toBe('already_active');
      expect(ERROR_CODES.NOT_ACTIVE).toBe('not_active');
      expect(ERROR_CODES.UNAVAILABLE).toBe('unavailable');
      expect(ERROR_CODES.ACTIVATION_FAILED).toBe('activation_failed');
      expect(ERROR_CODES.UNKNOWN_MESSAGE).toBe('unknown_message');
      expect(ERROR_CODES.UNKNOWN).toBe('unknown');
    });
  });

  describe('USER_MESSAGES', () => {
    it('should have all expected user messages', () => {
      expect(USER_MESSAGES.READER_ACTIVATED).toBe('Reader activated');
      expect(USER_MESSAGES.READER_DEACTIVATED).toBe('Reader deactivated');
      expect(USER_MESSAGES.READER_ALREADY_ACTIVE).toBe('Reader already active');
      expect(USER_MESSAGES.DEACTIVATING).toBe('Deactivating...');
      expect(USER_MESSAGES.ACTIVATING).toBe('Activating...');
      expect(USER_MESSAGES.USE_IN_READER_CONTROLS).toBe('Use in-reader controls');
      expect(USER_MESSAGES.FAILED_TO_GET_ARTICLE_TEXT).toBe('Failed to extract article text');
      expect(USER_MESSAGES.COULD_NOT_EXTRACT_ARTICLE_TEXT).toBe('Could not extract article text');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for extraction errors', () => {
      expect(getUserFriendlyMessage(ERROR_CODES.NO_VIABLE_CANDIDATES)).toBe(
        'Unable to find article content on this page'
      );
      expect(getUserFriendlyMessage(ERROR_CODES.CONFIDENCE_BELOW_THRESHOLD)).toBe(
        'Unable to extract article content from this page'
      );
      expect(getUserFriendlyMessage(ERROR_CODES.EXTRACTED_CONTENT_TOO_SMALL)).toBe(
        'Article content is too short to display'
      );
    });

    it('should return user-friendly message for reader mode state errors', () => {
      expect(getUserFriendlyMessage(ERROR_CODES.ALREADY_ACTIVE)).toBe(
        'Reader mode is already active'
      );
      expect(getUserFriendlyMessage(ERROR_CODES.NOT_ACTIVE)).toBe(
        'Reader mode is not active'
      );
    });

    it('should return user-friendly message for general errors', () => {
      expect(getUserFriendlyMessage(ERROR_CODES.UNAVAILABLE)).toBe(
        'Reader mode is not available for this page'
      );
      expect(getUserFriendlyMessage(ERROR_CODES.ACTIVATION_FAILED)).toBe(
        'Failed to activate reader mode'
      );
      expect(getUserFriendlyMessage(ERROR_CODES.UNKNOWN_MESSAGE)).toBe('Unknown command');
      expect(getUserFriendlyMessage(ERROR_CODES.UNKNOWN)).toBe('An unknown error occurred');
    });

    it('should return default message for undefined', () => {
      expect(getUserFriendlyMessage(undefined)).toBe('An unknown error occurred');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default message for null', () => {
      expect(getUserFriendlyMessage(null)).toBe('An unknown error occurred');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default message for empty string', () => {
      expect(getUserFriendlyMessage('')).toBe('An unknown error occurred');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default message and log warning for unknown error codes', () => {
      const unknownCode = 'some_unknown_error';
      const result = getUserFriendlyMessage(unknownCode);
      
      expect(result).toBe('An unknown error occurred');
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown error reason:', unknownCode);
    });

    it('should handle string literals that match error codes', () => {
      expect(getUserFriendlyMessage('No viable candidates found')).toBe(
        'Unable to find article content on this page'
      );
      expect(getUserFriendlyMessage('already_active')).toBe('Reader mode is already active');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with "Failed: " prefix', () => {
      expect(formatErrorMessage(ERROR_CODES.NO_VIABLE_CANDIDATES)).toBe(
        'Failed: Unable to find article content on this page'
      );
      expect(formatErrorMessage(ERROR_CODES.ALREADY_ACTIVE)).toBe(
        'Failed: Reader mode is already active'
      );
      expect(formatErrorMessage(ERROR_CODES.UNAVAILABLE)).toBe(
        'Failed: Reader mode is not available for this page'
      );
    });

    it('should handle undefined', () => {
      expect(formatErrorMessage(undefined)).toBe('Failed: An unknown error occurred');
    });

    it('should handle null', () => {
      expect(formatErrorMessage(null)).toBe('Failed: An unknown error occurred');
    });

    it('should handle unknown error codes', () => {
      const result = formatErrorMessage('unknown_code');
      expect(result).toBe('Failed: An unknown error occurred');
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
    });

    it('should use getUserFriendlyMessage internally', () => {
      // Verify that formatErrorMessage calls getUserFriendlyMessage
      // by checking the output format
      const testCases = [
        ERROR_CODES.CONFIDENCE_BELOW_THRESHOLD,
        ERROR_CODES.ACTIVATION_FAILED,
        ERROR_CODES.UNKNOWN,
      ];

      testCases.forEach((code) => {
        const formatted = formatErrorMessage(code);
        const friendly = getUserFriendlyMessage(code);
        expect(formatted).toBe(`Failed: ${friendly}`);
      });
    });
  });
});

