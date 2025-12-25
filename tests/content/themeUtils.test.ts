/**
 * Unit tests for theme utility functions.
 * Tests theme color and CSS variable logic.
 */

import { describe, it, expect } from 'vitest';

import { COLORS, CSS_VARIABLES } from '../../src/content/constants';
import {
  getBackgroundColorVar,
  getBackgroundColorVarRef,
  getForegroundColorVar,
  getForegroundColorVarRef,
  getThemeColors,
} from '../../src/content/themeUtils';

describe('themeUtils', () => {
  describe('getThemeColors', () => {
    it('should return light theme colors', () => {
      const colors = getThemeColors('light');
      
      expect(colors).toEqual(COLORS.light);
      expect(colors.background).toBe('#f8f8f8');
      expect(colors.foreground).toBe('#1a1a1a');
      expect(colors.border).toBe('#ccc');
      expect(colors.button).toBe('#fff');
      expect(colors.buttonHover).toBe('#999');
    });

    it('should return dark theme colors', () => {
      const colors = getThemeColors('dark');
      
      expect(colors).toEqual(COLORS.dark);
      expect(colors.background).toBe('#111');
      expect(colors.foreground).toBe('#f5f5f5');
      expect(colors.border).toBe('#333');
      expect(colors.button).toBe('#1c1c1c');
      expect(colors.buttonHover).toBe('#555');
    });
  });

  describe('getBackgroundColorVar', () => {
    it('should return light background CSS variable name', () => {
      const varName = getBackgroundColorVar('light');
      expect(varName).toBe(CSS_VARIABLES.BG_LIGHT);
    });

    it('should return dark background CSS variable name', () => {
      const varName = getBackgroundColorVar('dark');
      expect(varName).toBe(CSS_VARIABLES.BG_DARK);
    });
  });

  describe('getForegroundColorVar', () => {
    it('should return light foreground CSS variable name', () => {
      const varName = getForegroundColorVar('light');
      expect(varName).toBe(CSS_VARIABLES.FG_LIGHT);
    });

    it('should return dark foreground CSS variable name', () => {
      const varName = getForegroundColorVar('dark');
      expect(varName).toBe(CSS_VARIABLES.FG_DARK);
    });
  });

  describe('getBackgroundColorVarRef', () => {
    it('should return light background CSS variable reference', () => {
      const varRef = getBackgroundColorVarRef('light');
      expect(varRef).toBe(`var(${CSS_VARIABLES.BG_LIGHT})`);
    });

    it('should return dark background CSS variable reference', () => {
      const varRef = getBackgroundColorVarRef('dark');
      expect(varRef).toBe(`var(${CSS_VARIABLES.BG_DARK})`);
    });
  });

  describe('getForegroundColorVarRef', () => {
    it('should return light foreground CSS variable reference', () => {
      const varRef = getForegroundColorVarRef('light');
      expect(varRef).toBe(`var(${CSS_VARIABLES.FG_LIGHT})`);
    });

    it('should return dark foreground CSS variable reference', () => {
      const varRef = getForegroundColorVarRef('dark');
      expect(varRef).toBe(`var(${CSS_VARIABLES.FG_DARK})`);
    });
  });
});

