export type ReaderMessage =
  | { type: 'activate'; options?: { threshold?: number; theme?: 'light' | 'dark'; fontScale?: number } }
  | { type: 'deactivate' }
  | { type: 'toggle-reader' }
  | { type: 'changeTheme'; theme: 'light' | 'dark' }
  | { type: 'ping' }
  | { type: 'getArticleText' };

export interface ReaderResponse {
  ok: boolean;
  reason?: string;
  confidence?: number;
  textLength?: number;
  articleText?: string; // For getArticleText response
}

// AI-specific messages (independent of core reader functionality)
export interface SummarizeMessage {
  type: 'summarize';
  text: string;
}

export interface SummarizeResponse {
  ok: boolean;
  summary?: string;
  error?: string;
  errorCode?: 'no_api_key' | 'api_error' | 'network_error' | 'timeout' | 'unknown';
}

