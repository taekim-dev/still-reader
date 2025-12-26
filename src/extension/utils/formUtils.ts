import { AIConfig } from '../storage/aiConfig';

export function extractFormData(form: HTMLFormElement): Partial<AIConfig> {
  const formData = new FormData(form);
  return {
    apiKey: (formData.get('apiKey') as string)?.trim(),
    provider: (formData.get('provider') as AIConfig['provider']) || 'groq',
    model: (formData.get('model') as string)?.trim() || undefined,
    maxTokens: parseInt(formData.get('maxTokens') as string) || 200,
    apiBaseUrl: (formData.get('apiBaseUrl') as string)?.trim() || undefined,
  };
}

export function validateConfig(config: Partial<AIConfig>): { valid: boolean; error?: string } {
  if (!config.apiKey) {
    return { valid: false, error: 'API key is required' };
  }

  if (config.provider === 'custom' && !config.apiBaseUrl) {
    return { valid: false, error: 'Custom API requires a base URL' };
  }

  return { valid: true };
}

