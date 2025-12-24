/**
 * Unit tests for HTML builder functions.
 * Tests the functions that generate HTML structure for reader mode.
 */

import { describe, it, expect } from 'vitest';

import { generateStyles, generateHead, generateBody } from '../../src/content/readerMode';
import { CSS_VARIABLES, ELEMENT_IDS } from '../../src/content/constants';

describe('generateStyles', () => {
  it('should generate CSS with light theme', () => {
    const styles = generateStyles('light', 1.0);
    
    expect(styles).toContain(CSS_VARIABLES.FONT_SCALE);
    expect(styles).toContain('1');
    expect(styles).toContain(CSS_VARIABLES.BG_LIGHT);
    expect(styles).toContain(CSS_VARIABLES.FG_LIGHT);
    expect(styles).toContain(ELEMENT_IDS.ROOT);
    expect(styles).toContain(ELEMENT_IDS.CONTROLS);
  });

  it('should generate CSS with dark theme', () => {
    const styles = generateStyles('dark', 1.2);
    
    expect(styles).toContain(CSS_VARIABLES.FONT_SCALE);
    expect(styles).toContain('1.2');
    expect(styles).toContain(CSS_VARIABLES.BG_DARK);
    expect(styles).toContain(CSS_VARIABLES.FG_DARK);
  });

  it('should include font scale in CSS variables', () => {
    const styles1 = generateStyles('light', 0.8);
    const styles2 = generateStyles('light', 1.6);
    
    expect(styles1).toContain(`${CSS_VARIABLES.FONT_SCALE}: 0.8`);
    expect(styles2).toContain(`${CSS_VARIABLES.FONT_SCALE}: 1.6`);
  });

  it('should include all required CSS selectors', () => {
    const styles = generateStyles('light', 1.0);
    
    expect(styles).toContain(':root');
    expect(styles).toContain('body');
    expect(styles).toContain(`#${ELEMENT_IDS.ROOT}`);
    expect(styles).toContain('.sr-title');
    expect(styles).toContain(`#${ELEMENT_IDS.CONTROLS}`);
  });
});

describe('generateHead', () => {
  it('should generate head with title', () => {
    const head = generateHead('Test Article', 'light', 1.0);
    
    expect(head).toContain('<head>');
    expect(head).toContain('<title>Test Article</title>');
    expect(head).toContain('<meta charset="UTF-8" />');
    expect(head).toContain('<style>');
    expect(head).toContain('</head>');
  });

  it('should use default title when title is undefined', () => {
    const head = generateHead(undefined, 'light', 1.0);
    
    expect(head).toContain('<title>Reader</title>');
  });

  it('should escape HTML in title', () => {
    const head = generateHead('<script>alert("xss")</script>', 'light', 1.0);
    
    expect(head).toContain('&lt;script&gt;');
    expect(head).not.toContain('<script>');
  });

  it('should include styles in head', () => {
    const head = generateHead('Test', 'dark', 1.2);
    
    expect(head).toContain('<style>');
    expect(head).toContain(CSS_VARIABLES.FONT_SCALE);
    expect(head).toContain('1.2');
  });
});

describe('generateBody', () => {
  it('should generate body with content', () => {
    const body = generateBody('Test Title', '<p>Content</p>', 'light');
    
    expect(body).toContain('<body data-theme="light">');
    expect(body).toContain(`<div id="${ELEMENT_IDS.ROOT}">`);
    expect(body).toContain(`<div id="${ELEMENT_IDS.CONTROLS}">`);
    expect(body).toContain('<h1 class="sr-title">Test Title</h1>');
    expect(body).toContain('<article class="sr-article">');
    expect(body).toContain('<p>Content</p>');
    expect(body).toContain('</body>');
  });

  it('should include all control buttons', () => {
    const body = generateBody('Test', '<p>Content</p>', 'light');
    
    expect(body).toContain(`id="${ELEMENT_IDS.FONT_DEC}"`);
    expect(body).toContain(`id="${ELEMENT_IDS.FONT_INC}"`);
    expect(body).toContain(`id="${ELEMENT_IDS.EXIT}"`);
    expect(body).toContain('A-');
    expect(body).toContain('A+');
    expect(body).toContain('Exit');
  });

  it('should omit title when title is undefined', () => {
    const body = generateBody(undefined, '<p>Content</p>', 'light');
    
    expect(body).not.toContain('<h1 class="sr-title">');
    expect(body).toContain('<p>Content</p>');
  });

  it('should escape HTML in title', () => {
    const body = generateBody('<script>alert("xss")</script>', '<p>Content</p>', 'light');
    
    expect(body).toContain('&lt;script&gt;');
    expect(body).not.toContain('<script>');
  });

  it('should use correct theme attribute', () => {
    const bodyLight = generateBody('Test', '<p>Content</p>', 'light');
    const bodyDark = generateBody('Test', '<p>Content</p>', 'dark');
    
    expect(bodyLight).toContain('data-theme="light"');
    expect(bodyDark).toContain('data-theme="dark"');
  });

  it('should include article content', () => {
    const html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
    const body = generateBody('Test', html, 'light');
    
    expect(body).toContain(html);
    expect(body).toContain('<article class="sr-article">');
  });
});

