import { getThemePreference } from '../storage/theme';
import { sendMessageToActiveTab } from '../utils/tabs';

export async function handleToggleReader(): Promise<void> {
  await sendMessageToActiveTab({ type: 'toggle-reader' });
}

export async function handleActivateReader(): Promise<void> {
  try {
    const theme = await getThemePreference();
    await sendMessageToActiveTab({ 
      type: 'activate',
      options: { theme }
    });
  } catch (error) {
    await sendMessageToActiveTab({ 
      type: 'activate'
    });
  }
}

export async function handleSummarizeCommand(): Promise<void> {
  await sendMessageToActiveTab({ type: 'summarize' });
}

