/**
 * Theme utility functions for reader mode.
 * Centralizes theme color and CSS variable logic.
 */

import { COLORS, CSS_VARIABLES } from './constants';

export type Theme = 'light' | 'dark';

/**
 * Get theme colors for a given theme.
 */
export function getThemeColors(theme: Theme) {
  return COLORS[theme];
}

/**
 * Get CSS variable name for background color.
 */
export function getBackgroundColorVar(theme: Theme): string {
  return theme === 'dark' ? CSS_VARIABLES.BG_DARK : CSS_VARIABLES.BG_LIGHT;
}

/**
 * Get CSS variable name for foreground (text) color.
 */
export function getForegroundColorVar(theme: Theme): string {
  return theme === 'dark' ? CSS_VARIABLES.FG_DARK : CSS_VARIABLES.FG_LIGHT;
}

/**
 * Get CSS variable reference string for background color.
 */
export function getBackgroundColorVarRef(theme: Theme): string {
  return `var(${getBackgroundColorVar(theme)})`;
}

/**
 * Get CSS variable reference string for foreground color.
 */
export function getForegroundColorVarRef(theme: Theme): string {
  return `var(${getForegroundColorVar(theme)})`;
}

