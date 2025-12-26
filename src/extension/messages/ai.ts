export interface SummarizeMessage {
  type: 'summarize';
  text: string;
}

export interface SummarizeResponse {
  ok: boolean;
  summary?: string;
  error?: string;
  errorCode?: 'no_api_key' | 'text_too_short' | 'api_error' | 'network_error' | 'timeout' | 'unknown';
}

