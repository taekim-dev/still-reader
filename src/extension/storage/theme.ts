const THEME_STORAGE_KEY = 'still-reader-theme';

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

export async function saveThemePreference(theme: 'light' | 'dark'): Promise<void> {
  try {
    await chrome.storage.sync.set({ [THEME_STORAGE_KEY]: theme });
  } catch (error) {
    console.error('Failed to save theme preference:', error);
    throw error;
  }
}

