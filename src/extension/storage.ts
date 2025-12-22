/**
 * Storage utilities for AI configuration.
 * Uses chrome.storage.sync for secure, synced storage across devices.
 */

export interface AIConfig {
  apiKey?: string;
  provider?: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'custom';
  model?: string;
  maxTokens?: number;
  apiBaseUrl?: string; // For custom providers
}

const STORAGE_KEY = 'still-reader-ai-config';

/**
 * Get AI configuration from storage.
 * Returns null if not configured.
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const config = result[STORAGE_KEY] as AIConfig | undefined;
    
    if (!config || !config.apiKey) {
      return null;
    }
    
    return config;
  } catch (error) {
    console.error('Failed to get AI config:', error);
    return null;
  }
}

/**
 * Save AI configuration to storage.
 */
export async function saveAIConfig(config: AIConfig): Promise<void> {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: config });
  } catch (error) {
    console.error('[Storage] Failed to save AI config:', error);
    throw error;
  }
}

/**
 * Clear AI configuration from storage.
 */
export async function clearAIConfig(): Promise<void> {
  try {
    await chrome.storage.sync.remove(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear AI config:', error);
    throw error;
  }
}

// Theme preference storage
const THEME_STORAGE_KEY = 'still-reader-theme';

/**
 * Get saved theme preference.
 * Returns 'light' by default if not set.
 */
export async function getThemePreference(): Promise<'light' | 'dark'> {
  try {
    const result = await chrome.storage.sync.get(THEME_STORAGE_KEY);
    const theme = result[THEME_STORAGE_KEY] as 'light' | 'dark' | undefined;
    return theme ?? 'light';
  } catch (error) {
    console.error('Failed to get theme preference:', error);
    return 'light';
  }
}

/**
 * Save theme preference.
 */
export async function saveThemePreference(theme: 'light' | 'dark'): Promise<void> {
  try {
    await chrome.storage.sync.set({ [THEME_STORAGE_KEY]: theme });
  } catch (error) {
    console.error('Failed to save theme preference:', error);
    throw error;
  }
}

