import { summarizeText } from '../../ai/summarizer';
import { getAIConfig } from '../storage/aiConfig';
import { SummarizeResponse } from '../messages';

export async function handleSummarizeMessage(text: string): Promise<SummarizeResponse> {
  const config = await getAIConfig();
  
  const summarizerConfig = config && config.apiKey
    ? {
        apiKey: config.apiKey,
        provider: config.provider,
        model: config.model,
        maxTokens: config.maxTokens,
        apiBaseUrl: config.apiBaseUrl,
      }
    : null;

  return summarizeText(text, summarizerConfig);
}

export function handleOpenOptionsPage(): void {
  chrome.runtime.openOptionsPage();
}

