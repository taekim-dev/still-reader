import { AIConfig, getAIConfig, saveAIConfig, clearAIConfig } from './storage/aiConfig';
import { getElementById } from './ui/elements';
import { setStatus } from './ui/status';

let form: HTMLFormElement | null = null;
let statusEl: HTMLElement | null = null;
let saveBtn: HTMLButtonElement | null = null;
let clearBtn: HTMLButtonElement | null = null;
let providerSelect: HTMLSelectElement | null = null;
let customApiGroup: HTMLElement | null = null;

function getElements(): void {
  form = getElementById<HTMLFormElement>('settings-form');
  statusEl = getElementById('status');
  saveBtn = getElementById<HTMLButtonElement>('save-btn');
  clearBtn = getElementById<HTMLButtonElement>('clear-btn');
  providerSelect = getElementById<HTMLSelectElement>('provider');
  customApiGroup = getElementById('custom-api-group');

  if (!form || !statusEl || !saveBtn || !clearBtn || !providerSelect || !customApiGroup) {
    console.error('Some elements are missing!');
    return;
  }

  providerSelect?.addEventListener('change', () => {
    if (customApiGroup) {
      customApiGroup.style.display = providerSelect?.value === 'custom' ? 'block' : 'none';
    }
  });
}

async function initSettings(): Promise<void> {
  try {
    const config = await getAIConfig();
    if (config) {
      const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
      const modelInput = document.getElementById('model') as HTMLInputElement;
      const maxTokensInput = document.getElementById('max-tokens') as HTMLInputElement;
      const apiBaseUrlInput = document.getElementById('api-base-url') as HTMLInputElement;

      if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
      if (modelInput) modelInput.value = config.model || '';
      if (maxTokensInput) maxTokensInput.value = String(config.maxTokens || 200);
      if (apiBaseUrlInput) apiBaseUrlInput.value = config.apiBaseUrl || '';
      if (providerSelect) providerSelect.value = config.provider || 'groq';

      if (providerSelect && providerSelect.value === 'custom' && customApiGroup) {
        customApiGroup.style.display = 'block';
      }
    }
  } catch (error) {
    showStatus('Failed to load settings', 'error');
    console.error('Settings load error:', error);
  }
}

function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  setStatus(statusEl, message, type, { autoClear: true, clearAfter: 5000 });
}

function setupSaveHandler(): void {
  if (!saveBtn || !form) {
    console.error('Save button or form not found, cannot setup handler');
    return;
  }

  saveBtn.addEventListener('click', async () => {
    try {
      if (!form) {
        console.error('Form is null');
        return;
      }
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

    if (config.provider === 'custom' && !config.apiBaseUrl) {
      showStatus('Custom API requires a base URL', 'error');
      return;
    }

    await saveAIConfig(config);
    
    const saved = await getAIConfig();
    
    if (saved && saved.apiKey) {
      showStatus('Settings saved successfully!', 'success');
    } else {
      showStatus('Settings saved but could not verify. Please try again.', 'error');
      console.error('Save verification failed - config not found in storage');
    }
  } catch (error) {
    showStatus(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    console.error('Save error:', error);
  }
  });
}

function setupClearHandler(): void {
  if (!clearBtn || !form) {
    console.error('Clear button or form not found, cannot setup handler');
    return;
  }

  clearBtn.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to clear all AI settings?')) {
    return;
  }

  try {
    await clearAIConfig();
    if (form) {
      form.reset();
    }
    if (customApiGroup) {
      customApiGroup.style.display = 'none';
    }
    showStatus('Settings cleared', 'success');
  } catch (error) {
    showStatus('Failed to clear settings', 'error');
    console.error('Clear error:', error);
  }
  });
}

function initialize(): void {
  getElements();
  if (!form || !saveBtn || !clearBtn) {
    console.error('Failed to get elements, retrying...');
    setTimeout(initialize, 100);
    return;
  }

  setupSaveHandler();
  setupClearHandler();
  initSettings();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
  });
} else {
  initialize();
}

