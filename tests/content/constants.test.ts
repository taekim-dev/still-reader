/**
 * Unit tests for reader mode constants.
 * Ensures all constants are properly defined and have expected values.
 */

import { describe, it, expect } from 'vitest';

import {
  BUTTON_STYLES,
  COLORS,
  CSS_VARIABLES,
  DEFAULT_TITLE,
  DIMENSIONS,
  ELEMENT_IDS,
  FONT_SCALE,
  NOTICE_STYLES,
  TYPOGRAPHY,
} from '../../src/content/constants';

describe('reader mode constants', () => {
  describe('FONT_SCALE', () => {
    it('should have all required properties', () => {
      expect(FONT_SCALE.MIN).toBe(0.8);
      expect(FONT_SCALE.MAX).toBe(1.6);
      expect(FONT_SCALE.INCREMENT).toBe(0.1);
      expect(FONT_SCALE.DEFAULT).toBe(1.0);
    });

    it('should have valid range', () => {
      expect(FONT_SCALE.MIN).toBeLessThan(FONT_SCALE.MAX);
      expect(FONT_SCALE.DEFAULT).toBeGreaterThanOrEqual(FONT_SCALE.MIN);
      expect(FONT_SCALE.DEFAULT).toBeLessThanOrEqual(FONT_SCALE.MAX);
    });
  });

  describe('COLORS', () => {
    it('should have light theme colors', () => {
      expect(COLORS.light.background).toBe('#f8f8f8');
      expect(COLORS.light.foreground).toBe('#1a1a1a');
      expect(COLORS.light.border).toBe('#ccc');
      expect(COLORS.light.button).toBe('#fff');
      expect(COLORS.light.buttonHover).toBe('#999');
    });

    it('should have dark theme colors', () => {
      expect(COLORS.dark.background).toBe('#111');
      expect(COLORS.dark.foreground).toBe('#f5f5f5');
      expect(COLORS.dark.border).toBe('#333');
      expect(COLORS.dark.button).toBe('#1c1c1c');
      expect(COLORS.dark.buttonHover).toBe('#555');
    });

    it('should have valid hex color format', () => {
      const hexColorRegex = /^#[0-9a-fA-F]{3,6}$/;
      Object.values(COLORS.light).forEach((color) => {
        expect(color).toMatch(hexColorRegex);
      });
      Object.values(COLORS.dark).forEach((color) => {
        expect(color).toMatch(hexColorRegex);
      });
    });
  });

  describe('DIMENSIONS', () => {
    it('should have content width', () => {
      expect(DIMENSIONS.contentWidth).toBe('720px');
    });

    it('should have padding values', () => {
      expect(DIMENSIONS.padding.top).toBe(32);
      expect(DIMENSIONS.padding.sides).toBe(20);
      expect(DIMENSIONS.padding.bottom).toBe(64);
      expect(DIMENSIONS.padding.top).toBeGreaterThan(0);
      expect(DIMENSIONS.padding.sides).toBeGreaterThan(0);
      expect(DIMENSIONS.padding.bottom).toBeGreaterThan(0);
    });

    it('should have controls dimensions', () => {
      expect(DIMENSIONS.controls.gap).toBe(8);
      expect(DIMENSIONS.controls.padding.top).toBe(12);
      expect(DIMENSIONS.controls.padding.bottom).toBe(16);
    });

    it('should have title margin', () => {
      expect(DIMENSIONS.title.marginBottom).toBe(24);
    });
  });

  describe('TYPOGRAPHY', () => {
    it('should have typography settings', () => {
      expect(TYPOGRAPHY.lineHeight).toBe(1.6);
      expect(TYPOGRAPHY.fontFamily).toContain('-apple-system');
      expect(TYPOGRAPHY.baseFontSize).toBe(16);
      expect(TYPOGRAPHY.title.fontSize).toBe('1.8em');
      expect(TYPOGRAPHY.title.lineHeight).toBe(1.2);
    });
  });

  describe('BUTTON_STYLES', () => {
    it('should have button padding', () => {
      expect(BUTTON_STYLES.padding.vertical).toBe(6);
      expect(BUTTON_STYLES.padding.horizontal).toBe(10);
    });

    it('should have border radius', () => {
      expect(BUTTON_STYLES.borderRadius).toBe(6);
    });
  });

  describe('NOTICE_STYLES', () => {
    it('should have notice styles', () => {
      expect(NOTICE_STYLES.position).toBe('fixed');
      expect(NOTICE_STYLES.bottom).toBe(16);
      expect(NOTICE_STYLES.right).toBe(16);
      expect(NOTICE_STYLES.padding.vertical).toBe(12);
      expect(NOTICE_STYLES.padding.horizontal).toBe(16);
      expect(NOTICE_STYLES.background).toBe('#111');
      expect(NOTICE_STYLES.color).toBe('#f5f5f5');
      expect(NOTICE_STYLES.fontSize).toBe(14);
      expect(NOTICE_STYLES.borderRadius).toBe(8);
      expect(NOTICE_STYLES.boxShadow).toBe('0 6px 24px rgba(0,0,0,0.2)');
      expect(NOTICE_STYLES.zIndex).toBe(2147483647);
    });
  });

  describe('CSS_VARIABLES', () => {
    it('should have all CSS variable names', () => {
      expect(CSS_VARIABLES.FONT_SCALE).toBe('--sr-font-scale');
      expect(CSS_VARIABLES.BG_LIGHT).toBe('--sr-bg-light');
      expect(CSS_VARIABLES.FG_LIGHT).toBe('--sr-fg-light');
      expect(CSS_VARIABLES.BG_DARK).toBe('--sr-bg-dark');
      expect(CSS_VARIABLES.FG_DARK).toBe('--sr-fg-dark');
      expect(CSS_VARIABLES.CONTENT_WIDTH).toBe('--sr-content-width');
      expect(CSS_VARIABLES.LINE_HEIGHT).toBe('--sr-line-height');
      expect(CSS_VARIABLES.FONT_FAMILY).toBe('--sr-font-family');
    });

    it('should have valid CSS variable format', () => {
      const cssVarRegex = /^--sr-[a-z-]+$/;
      Object.values(CSS_VARIABLES).forEach((variable) => {
        expect(variable).toMatch(cssVarRegex);
      });
    });
  });

  describe('ELEMENT_IDS', () => {
    it('should have all element IDs', () => {
      expect(ELEMENT_IDS.ROOT).toBe('still-reader-root');
      expect(ELEMENT_IDS.CONTROLS).toBe('still-reader-controls');
      expect(ELEMENT_IDS.FONT_INC).toBe('sr-font-inc');
      expect(ELEMENT_IDS.FONT_DEC).toBe('sr-font-dec');
      expect(ELEMENT_IDS.EXIT).toBe('sr-exit');
      expect(ELEMENT_IDS.UNAVAILABLE).toBe('still-reader-unavailable');
    });
  });

  describe('DEFAULT_TITLE', () => {
    it('should have default title', () => {
      expect(DEFAULT_TITLE).toBe('Reader');
    });
  });
});

