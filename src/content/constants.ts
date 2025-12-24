/**
 * Constants for reader mode styling, dimensions, and configuration.
 * Centralizes all hardcoded values for easier maintenance and consistency.
 */

export const FONT_SCALE = {
  MIN: 0.8,
  MAX: 1.6,
  INCREMENT: 0.1,
  DEFAULT: 1.0,
} as const;

export const COLORS = {
  light: {
    background: '#f8f8f8',
    foreground: '#1a1a1a',
    border: '#ccc',
    button: '#fff',
    buttonHover: '#999',
  },
  dark: {
    background: '#111',
    foreground: '#f5f5f5',
    border: '#333',
    button: '#1c1c1c',
    buttonHover: '#555',
  },
} as const;

export const DIMENSIONS = {
  contentWidth: '720px',
  padding: {
    top: 32,
    sides: 20,
    bottom: 64,
  },
  controls: {
    gap: 8,
    padding: {
      top: 12,
      bottom: 16,
    },
  },
  title: {
    marginBottom: 24,
  },
} as const;

export const TYPOGRAPHY = {
  lineHeight: 1.6,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  baseFontSize: 16,
  title: {
    fontSize: '1.8em',
    lineHeight: 1.2,
  },
} as const;

export const BUTTON_STYLES = {
  padding: {
    vertical: 6,
    horizontal: 10,
  },
  borderRadius: 6,
} as const;

export const NOTICE_STYLES = {
  position: 'fixed',
  bottom: 16,
  right: 16,
  padding: {
    vertical: 12,
    horizontal: 16,
  },
  background: '#111',
  color: '#f5f5f5',
  fontSize: 14,
  borderRadius: 8,
  boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
  zIndex: 2147483647,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const;

export const CSS_VARIABLES = {
  FONT_SCALE: '--sr-font-scale',
  BG_LIGHT: '--sr-bg-light',
  FG_LIGHT: '--sr-fg-light',
  BG_DARK: '--sr-bg-dark',
  FG_DARK: '--sr-fg-dark',
  CONTENT_WIDTH: '--sr-content-width',
  LINE_HEIGHT: '--sr-line-height',
  FONT_FAMILY: '--sr-font-family',
} as const;

export const ELEMENT_IDS = {
  ROOT: 'still-reader-root',
  CONTROLS: 'still-reader-controls',
  FONT_INC: 'sr-font-inc',
  FONT_DEC: 'sr-font-dec',
  EXIT: 'sr-exit',
  UNAVAILABLE: 'still-reader-unavailable',
} as const;

export const DEFAULT_TITLE = 'Reader';

