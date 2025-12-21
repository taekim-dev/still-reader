export type ReaderMessage =
  | { type: 'activate'; options?: { threshold?: number; theme?: 'light' | 'dark'; fontScale?: number } }
  | { type: 'deactivate' }
  | { type: 'ping' };

export interface ReaderResponse {
  ok: boolean;
  reason?: string;
  confidence?: number;
  textLength?: number;
}

