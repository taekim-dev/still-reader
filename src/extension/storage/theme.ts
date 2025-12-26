/**
 * Storage utilities for theme preference.
 * Uses chrome.storage.sync for secure, synced storage across devices.
 */

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

