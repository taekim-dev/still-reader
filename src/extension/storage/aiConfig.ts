export interface AIConfig {
  apiKey?: string;
  provider?: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'custom';
  model?: string;
  maxTokens?: number;
  apiBaseUrl?: string;
}

const STORAGE_KEY = 'still-reader-ai-config';

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

export async function saveAIConfig(config: AIConfig): Promise<void> {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: config });
  } catch (error) {
    console.error('[Storage] Failed to save AI config:', error);
    throw error;
  }
}

export async function clearAIConfig(): Promise<void> {
  try {
    await chrome.storage.sync.remove(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear AI config:', error);
    throw error;
  }
}

