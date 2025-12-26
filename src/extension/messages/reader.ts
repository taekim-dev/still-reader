export type ReaderMessage =
  | { type: 'activate'; options?: { threshold?: number; theme?: 'light' | 'dark'; fontScale?: number } }
  | { type: 'deactivate' }
  | { type: 'toggle-reader' }
  | { type: 'changeTheme'; theme: 'light' | 'dark' }
  | { type: 'ping' }
  | { type: 'getArticleText' }
  | { type: 'summarize' };

export interface ReaderResponse {
  ok: boolean;
  reason?: string;
  confidence?: number;
  textLength?: number;
  articleText?: string;
  active?: boolean;
}

