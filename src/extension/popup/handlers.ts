import { ERROR_CODES, USER_MESSAGES, formatErrorMessage } from '../errorMessages';
import { ReaderMessage, ReaderResponse } from '../messages';
import { getThemePreference, saveThemePreference } from '../storage/theme';

export interface PopupHandlers {
  sendMessage: (message: ReaderMessage) => Promise<ReaderResponse>;
  setStatus: (message: string, type?: 'info' | 'success' | 'error') => void;
  updateUI: (active: boolean) => void;
  updateThemeButtonLabel: () => void;
  getCurrentTheme: () => 'light' | 'dark';
  setCurrentTheme: (theme: 'light' | 'dark') => void;
}

export function createActivateHandler(handlers: PopupHandlers) {
  return async () => {
    try {
      handlers.setStatus(USER_MESSAGES.ACTIVATING, 'info');
      const theme = await getThemePreference();
      const activateResponse = await handlers.sendMessage({ 
        type: 'activate',
        options: { theme }
      });
      if (activateResponse.ok) {
        handlers.setStatus(USER_MESSAGES.READER_ACTIVATED, 'success');
        handlers.updateUI(true);
      } else {
        if (activateResponse.reason === ERROR_CODES.ALREADY_ACTIVE) {
          handlers.updateUI(true);
          handlers.setStatus(USER_MESSAGES.READER_ALREADY_ACTIVE, 'info');
        } else {
          console.warn('Activation failed:', activateResponse.reason);
          handlers.setStatus(formatErrorMessage(activateResponse.reason), 'error');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      handlers.setStatus(`Failed: ${errorMessage}`, 'error');
      console.error('Activate error:', error);
      
      if (errorMessage.includes('Could not establish connection') || errorMessage.includes('Receiving end does not exist')) {
        handlers.setStatus('Content script not loaded. Try refreshing the page.', 'error');
      }
    }
  };
}

export function createDeactivateHandler(handlers: PopupHandlers) {
  return async () => {
    try {
      handlers.setStatus(USER_MESSAGES.DEACTIVATING, 'info');
      const deactivateResponse = await handlers.sendMessage({ type: 'deactivate' });
      if (deactivateResponse.ok) {
        handlers.setStatus(USER_MESSAGES.READER_DEACTIVATED, 'success');
        handlers.updateUI(false);
      } else {
        console.warn('Deactivation failed:', deactivateResponse.reason);
        handlers.setStatus(formatErrorMessage(deactivateResponse.reason), 'error');
      }
    } catch (error) {
      handlers.setStatus('Failed to deactivate', 'error');
      console.error('Deactivate error:', error);
    }
  };
}

export function createFontDecHandler(handlers: PopupHandlers) {
  return async () => {
    handlers.setStatus(USER_MESSAGES.USE_IN_READER_CONTROLS, 'info');
  };
}

export function createFontIncHandler(handlers: PopupHandlers) {
  return async () => {
    handlers.setStatus(USER_MESSAGES.USE_IN_READER_CONTROLS, 'info');
  };
}

export function createThemeToggleHandler(handlers: PopupHandlers) {
  return async () => {
    try {
      const newTheme = handlers.getCurrentTheme() === 'dark' ? 'light' : 'dark';
      handlers.setCurrentTheme(newTheme);
      
      await saveThemePreference(newTheme);
      handlers.updateThemeButtonLabel();
      
      try {
        const response = await handlers.sendMessage({ type: 'changeTheme', theme: newTheme });
        if (response.ok) {
          handlers.setStatus(`Theme: ${newTheme === 'dark' ? 'Dark' : 'Light'}`, 'success');
        }
      } catch {
        handlers.setStatus(`Theme set to ${newTheme === 'dark' ? 'Dark' : 'Light'}`, 'success');
      }
    } catch (error) {
      handlers.setStatus('Failed to change theme', 'error');
      console.error('Theme toggle error:', error);
    }
  };
}

export function createSummarizeHandler(handlers: PopupHandlers) {
  return async () => {
    try {
      handlers.setStatus('Preparing summary...', 'info');

      const pingResponse = await handlers.sendMessage({ type: 'ping' });
      const isReaderActive = pingResponse.active ?? false;

      if (!isReaderActive) {
        handlers.setStatus('Activating reader mode...', 'info');
        const theme = await getThemePreference();
        const activateResponse = await handlers.sendMessage({
          type: 'activate',
          options: { theme },
        });

        if (!activateResponse.ok) {
          handlers.setStatus(formatErrorMessage(activateResponse.reason), 'error');
          return;
        }
        handlers.updateUI(true);
      }

      handlers.setStatus('Generating summary...', 'info');
      const summarizeResponse = await handlers.sendMessage({ type: 'summarize' });

      if (summarizeResponse.ok) {
        handlers.setStatus('Summary will appear in reader mode', 'success');
      } else {
        const errorMsg = summarizeResponse.reason ?? 'Unknown error';
        const isNotConfigured = errorMsg === 'no_api_key' || errorMsg.includes('not configured');
        
        if (isNotConfigured) {
          handlers.setStatus('AI not configured. Click "Configure AI Settings" below.', 'error');
        } else {
          handlers.setStatus(`Summary failed: ${formatErrorMessage(errorMsg)}`, 'error');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      handlers.setStatus(`Summary failed: ${errorMessage}`, 'error');
      console.error('Summarize error:', error);
    }
  };
}

export function createSettingsHandler() {
  return () => {
    chrome.runtime.openOptionsPage();
  };
}

