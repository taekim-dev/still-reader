/**
 * Constants for AI summarization service.
 */

export const DEFAULT_PROVIDER = 'groq';
export const DEFAULT_MAX_TOKENS = 200;
export const DEFAULT_TEMPERATURE = 0.7;
export const MIN_TEXT_LENGTH = 50;
export const MAX_TEXT_LENGTH = 8000;
export const ANTHROPIC_VERSION = '2023-06-01';
export const DEFAULT_SUMMARY_FALLBACK = 'No summary generated';
export const TRUNCATION_ELLIPSIS = '...';

export const API_ENDPOINTS = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: (model: string, apiKey: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
} as const;

export const DEFAULT_MODELS: Record<string, string> = {
  groq: 'llama-3.1-8b-instant',
  openai: 'gpt-3.5-turbo',
  anthropic: 'claude-3-haiku-20240307',
  gemini: 'gemini-pro',
} as const;

export const SYSTEM_PROMPTS = {
  groq: 'You are a helpful assistant that summarizes articles concisely. Provide a clear, informative summary in 2-3 sentences.',
  openai: 'You are a helpful assistant that summarizes articles concisely. Provide a clear, informative summary in 2-3 sentences.',
  anthropic: 'Please summarize the following article in 2-3 sentences:',
  gemini: 'Please summarize the following article in 2-3 sentences:',
  custom: 'You are a helpful assistant that summarizes articles concisely.',
} as const;

export const USER_PROMPT_PREFIX = 'Please summarize the following article:\n\n';

