/**
 * Unit tests for state management functions.
 * Tests the functions that apply reader state to the DOM.
 */

import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  applyThemeToBody,
  applyThemeToButtons,
  applyThemeToControls,
  updateFontScale,
} from '../../src/content/readerMode';
import { CSS_VARIABLES, ELEMENT_IDS } from '../../src/content/constants';
import { getBackgroundColorVarRef, getForegroundColorVarRef, getThemeColors } from '../../src/content/themeUtils';

const basePage = `
  <html>
    <head><title>Test</title></head>
    <body>
      <div id="${ELEMENT_IDS.ROOT}">
        <div id="${ELEMENT_IDS.CONTROLS}">
          <button id="sr-font-dec">A-</button>
          <button id="sr-font-inc">A+</button>
          <button id="sr-exit">Exit</button>
        </div>
      </div>
    </body>
  </html>
`;

describe('stateManager', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM(basePage, { url: 'https://example.com' });
    document = dom.window.document;
  });

  describe('updateFontScale', () => {
    it('should set font scale CSS variable', () => {
      updateFontScale(document, 1.2);
      
      const value = document.documentElement.style.getPropertyValue(CSS_VARIABLES.FONT_SCALE);
      expect(value).toBe('1.2');
    });

    it('should update font scale to different values', () => {
      updateFontScale(document, 0.8);
      expect(document.documentElement.style.getPropertyValue(CSS_VARIABLES.FONT_SCALE)).toBe('0.8');
      
      updateFontScale(document, 1.6);
      expect(document.documentElement.style.getPropertyValue(CSS_VARIABLES.FONT_SCALE)).toBe('1.6');
    });

    it('should handle decimal font scales', () => {
      updateFontScale(document, 1.15);
      expect(document.documentElement.style.getPropertyValue(CSS_VARIABLES.FONT_SCALE)).toBe('1.15');
    });
  });

  describe('applyThemeToBody', () => {
    it('should apply light theme to body', () => {
      applyThemeToBody(document, 'light');
      
      expect(document.body.getAttribute('data-theme')).toBe('light');
      expect(document.body.style.background).toBe(getBackgroundColorVarRef('light'));
      expect(document.body.style.color).toBe(getForegroundColorVarRef('light'));
    });

    it('should apply dark theme to body', () => {
      applyThemeToBody(document, 'dark');
      
      expect(document.body.getAttribute('data-theme')).toBe('dark');
      expect(document.body.style.background).toBe(getBackgroundColorVarRef('dark'));
      expect(document.body.style.color).toBe(getForegroundColorVarRef('dark'));
    });

    it('should update theme when called multiple times', () => {
      applyThemeToBody(document, 'light');
      expect(document.body.getAttribute('data-theme')).toBe('light');
      
      applyThemeToBody(document, 'dark');
      expect(document.body.getAttribute('data-theme')).toBe('dark');
      expect(document.body.style.background).toBe(getBackgroundColorVarRef('dark'));
    });
  });

  describe('applyThemeToControls', () => {
    it('should apply light theme background to controls', () => {
      applyThemeToControls(document, 'light');
      
      const controls = document.getElementById(ELEMENT_IDS.CONTROLS);
      expect(controls).not.toBeNull();
      expect((controls as HTMLElement).style.background).toBe(getBackgroundColorVarRef('light'));
    });

    it('should apply dark theme background to controls', () => {
      applyThemeToControls(document, 'dark');
      
      const controls = document.getElementById(ELEMENT_IDS.CONTROLS);
      expect(controls).not.toBeNull();
      expect((controls as HTMLElement).style.background).toBe(getBackgroundColorVarRef('dark'));
    });

    it('should handle missing controls gracefully', () => {
      const controls = document.getElementById(ELEMENT_IDS.CONTROLS);
      controls?.remove();
      
      // Should not throw
      expect(() => applyThemeToControls(document, 'light')).not.toThrow();
    });
  });

  describe('applyThemeToButtons', () => {
    it('should apply light theme to buttons', () => {
      applyThemeToButtons(document, 'light');
      
      const buttons = document.querySelectorAll(`#${ELEMENT_IDS.CONTROLS} button`);
      expect(buttons.length).toBe(3);
      
      const themeColors = getThemeColors('light');
      buttons.forEach((btn) => {
        const button = btn as HTMLElement;
        // JSDOM converts hex colors to rgb, so accept both formats
        const borderColor = button.style.borderColor;
        expect(borderColor === themeColors.border || borderColor === 'rgb(204, 204, 204)').toBe(true);
        const bgColor = button.style.background;
        expect(bgColor === themeColors.button || bgColor === 'rgb(255, 255, 255)').toBe(true);
      });
    });

    it('should apply dark theme to buttons', () => {
      applyThemeToButtons(document, 'dark');
      
      const buttons = document.querySelectorAll(`#${ELEMENT_IDS.CONTROLS} button`);
      expect(buttons.length).toBe(3);
      
      const themeColors = getThemeColors('dark');
      buttons.forEach((btn) => {
        const button = btn as HTMLElement;
        // JSDOM converts hex colors to rgb, so accept both formats
        const borderColor = button.style.borderColor;
        expect(borderColor === themeColors.border || borderColor === 'rgb(51, 51, 51)').toBe(true);
        const bgColor = button.style.background;
        expect(bgColor === themeColors.button || bgColor === 'rgb(28, 28, 28)').toBe(true);
      });
    });

    it('should update all buttons when theme changes', () => {
      applyThemeToButtons(document, 'light');
      const buttons = document.querySelectorAll(`#${ELEMENT_IDS.CONTROLS} button`);
      const firstButton = buttons[0] as HTMLElement;
      const lightBorder = firstButton.style.borderColor;
      
      applyThemeToButtons(document, 'dark');
      const darkBorder = firstButton.style.borderColor;
      
      expect(lightBorder).not.toBe(darkBorder);
    });

    it('should handle missing buttons gracefully', () => {
      const controls = document.getElementById(ELEMENT_IDS.CONTROLS);
      controls?.remove();
      
      // Should not throw
      expect(() => applyThemeToButtons(document, 'light')).not.toThrow();
    });
  });
});

