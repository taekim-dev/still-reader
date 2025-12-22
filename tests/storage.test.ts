/**
 * Tests for storage utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getAIConfig, saveAIConfig, clearAIConfig, AIConfig } from '../src/extension/storage';

// Mock chrome.storage.sync
const mockStorage: Record<string, any> = {};

const mockChromeStorage = {
  sync: {
    get: vi.fn((key: string | string[], callback?: (result: Record<string, any>) => void) => {
      if (typeof key === 'string') {
        const result = { [key]: mockStorage[key] };
        if (callback) {
          callback(result);
          return;
        }
        return Promise.resolve(result);
      } else {
        const result: Record<string, any> = {};
        key.forEach((k) => {
          result[k] = mockStorage[k];
        });
        if (callback) {
          callback(result);
          return;
        }
        return Promise.resolve(result);
      }
    }),
    set: vi.fn((items: Record<string, any>, callback?: () => void) => {
      Object.assign(mockStorage, items);
      if (callback) {
        callback();
        return;
      }
      return Promise.resolve();
    }),
    remove: vi.fn((key: string, callback?: () => void) => {
      delete mockStorage[key];
      if (callback) {
        callback();
        return;
      }
      return Promise.resolve();
    }),
  },
};

// @ts-expect-error - Mocking chrome global
global.chrome = {
  storage: mockChromeStorage,
};

describe('Storage utilities', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('getAIConfig', () => {
    it('should return null when no config is stored', async () => {
      const result = await getAIConfig();
      expect(result).toBeNull();
      expect(mockChromeStorage.sync.get).toHaveBeenCalledWith('still-reader-ai-config');
    });

    it('should return null when config exists but has no API key', async () => {
      mockStorage['still-reader-ai-config'] = {
        provider: 'groq',
        maxTokens: 200,
      };

      const result = await getAIConfig();
      expect(result).toBeNull();
    });

    it('should return config when valid config is stored', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-api-key-123',
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        maxTokens: 200,
      };

      mockStorage['still-reader-ai-config'] = testConfig;

      const result = await getAIConfig();
      expect(result).toEqual(testConfig);
    });

    it('should handle storage errors gracefully', async () => {
      mockChromeStorage.sync.get.mockRejectedValueOnce(new Error('Storage error'));

      const result = await getAIConfig();
      expect(result).toBeNull();
    });
  });

  describe('saveAIConfig', () => {
    it('should save config to storage', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-api-key-123',
        provider: 'groq',
        maxTokens: 200,
      };

      await saveAIConfig(testConfig);

      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({
        'still-reader-ai-config': testConfig,
      });
      expect(mockStorage['still-reader-ai-config']).toEqual(testConfig);
    });

    it('should throw error when storage fails', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-api-key-123',
      };

      mockChromeStorage.sync.set.mockRejectedValueOnce(new Error('Storage error'));

      await expect(saveAIConfig(testConfig)).rejects.toThrow('Storage error');
    });

    it('should save partial config', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-api-key-123',
        // provider and other fields optional
      };

      await saveAIConfig(testConfig);

      expect(mockStorage['still-reader-ai-config']).toEqual(testConfig);
    });
  });

  describe('clearAIConfig', () => {
    it('should remove config from storage', async () => {
      mockStorage['still-reader-ai-config'] = {
        apiKey: 'test-api-key-123',
      };

      await clearAIConfig();

      expect(mockChromeStorage.sync.remove).toHaveBeenCalledWith('still-reader-ai-config');
      expect(mockStorage['still-reader-ai-config']).toBeUndefined();
    });

    it('should throw error when storage fails', async () => {
      mockChromeStorage.sync.remove.mockRejectedValueOnce(new Error('Storage error'));

      await expect(clearAIConfig()).rejects.toThrow('Storage error');
    });
  });

  describe('integration', () => {
    it('should save and retrieve config correctly', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-api-key-123',
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        maxTokens: 200,
      };

      // Save
      await saveAIConfig(testConfig);

      // Retrieve
      const retrieved = await getAIConfig();
      expect(retrieved).toEqual(testConfig);
    });

    it('should update existing config', async () => {
      const initialConfig: AIConfig = {
        apiKey: 'old-key',
        provider: 'groq',
      };

      await saveAIConfig(initialConfig);

      const updatedConfig: AIConfig = {
        apiKey: 'new-key',
        provider: 'openai',
        maxTokens: 300,
      };

      await saveAIConfig(updatedConfig);

      const retrieved = await getAIConfig();
      expect(retrieved).toEqual(updatedConfig);
      expect(retrieved?.apiKey).toBe('new-key');
    });

    it('should clear and return null', async () => {
      const testConfig: AIConfig = {
        apiKey: 'test-api-key-123',
      };

      await saveAIConfig(testConfig);
      await clearAIConfig();

      const retrieved = await getAIConfig();
      expect(retrieved).toBeNull();
    });
  });
});

