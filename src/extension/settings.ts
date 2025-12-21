/**
 * Settings page controller. Handles AI configuration UI.
 */

import { AIConfig, getAIConfig, saveAIConfig, clearAIConfig } from './storage';

// UI elements
const form = document.getElementById('settings-form') as HTMLFormElement;
const statusEl = document.getElementById('status') as HTMLElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const providerSelect = document.getElementById('provider') as HTMLSelectElement;
const customApiGroup = document.getElementById('custom-api-group') as HTMLElement;

// Show/hide custom API URL field based on provider
providerSelect.addEventListener('change', () => {
  customApiGroup.style.display = providerSelect.value === 'custom' ? 'block' : 'none';
});

// Load existing settings
async function initSettings(): Promise<void> {
  try {
    const config = await getAIConfig();
    if (config) {
      // Populate form with existing config
      const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
      const modelInput = document.getElementById('model') as HTMLInputElement;
      const maxTokensInput = document.getElementById('max-tokens') as HTMLInputElement;
      const apiBaseUrlInput = document.getElementById('api-base-url') as HTMLInputElement;

      if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
      if (modelInput) modelInput.value = config.model || '';
      if (maxTokensInput) maxTokensInput.value = String(config.maxTokens || 200);
      if (apiBaseUrlInput) apiBaseUrlInput.value = config.apiBaseUrl || '';
      if (providerSelect) providerSelect.value = config.provider || 'groq';

      // Show custom API group if needed
      if (providerSelect.value === 'custom') {
        customApiGroup.style.display = 'block';
      }
    }
  } catch (error) {
    showStatus('Failed to load settings', 'error');
    console.error('Settings load error:', error);
  }
}

function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
    statusEl.textContent = '';
  }, 5000);
}

// Save settings - use button click instead of form submit to avoid URL params
saveBtn.addEventListener('click', async () => {
  try {
    const formData = new FormData(form);
    const apiKey = (formData.get('apiKey') as string)?.trim();
    
    if (!apiKey) {
      showStatus('API key is required', 'error');
      return;
    }
    
    const config: AIConfig = {
      apiKey,
      provider: (formData.get('provider') as AIConfig['provider']) || 'groq',
      model: (formData.get('model') as string)?.trim() || undefined,
      maxTokens: parseInt(formData.get('maxTokens') as string) || 200,
      apiBaseUrl: (formData.get('apiBaseUrl') as string)?.trim() || undefined,
    };

    // Validate custom API
    if (config.provider === 'custom' && !config.apiBaseUrl) {
      showStatus('Custom API requires a base URL', 'error');
      return;
    }

    await saveAIConfig(config);
    showStatus('Settings saved successfully!', 'success');
    
    // Don't reload - keep the form values as they are since we just saved them
    // The values are already in the form fields
  } catch (error) {
    showStatus(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    console.error('Save error:', error);
  }
});

// Clear settings
clearBtn.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to clear all AI settings?')) {
    return;
  }

  try {
    await clearAIConfig();
    form.reset();
    customApiGroup.style.display = 'none';
    showStatus('Settings cleared', 'success');
  } catch (error) {
    showStatus('Failed to clear settings', 'error');
    console.error('Clear error:', error);
  }
});

// Initialize on load
initSettings();

