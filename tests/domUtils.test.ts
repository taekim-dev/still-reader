/**
 * Tests for DOM utility functions.
 */

import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';

import { isVisible, sanitizeClone } from '../src/extraction/domUtils';

describe('isVisible', () => {
  it('should return true for visible element with text content', () => {
    const dom = new JSDOM('<div>Hello world</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVisible(element)).toBe(true);
  });

  it('should return false for element with no text content', () => {
    const dom = new JSDOM('<div></div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVisible(element)).toBe(false);
  });

  it('should return false for element with display: none', () => {
    const dom = new JSDOM('<div style="display: none">Hello</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVisible(element)).toBe(false);
  });

  it('should return false for element with visibility: hidden', () => {
    const dom = new JSDOM('<div style="visibility: hidden">Hello</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVisible(element)).toBe(false);
  });

  it('should return false for element with hidden attribute', () => {
    const dom = new JSDOM('<div hidden>Hello</div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVisible(element)).toBe(false);
  });

  it('should return true for element with whitespace-only text', () => {
    const dom = new JSDOM('<div>   </div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVisible(element)).toBe(false);
  });

  it('should return true for element with nested text content', () => {
    const dom = new JSDOM('<div><p>Hello</p></div>');
    const element = dom.window.document.querySelector('div')!;
    expect(isVisible(element)).toBe(true);
  });
});

describe('sanitizeClone', () => {
  it('should clone element and preserve content', () => {
    const dom = new JSDOM('<div><p>Hello world</p></div>');
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    const sanitized = sanitizeClone(element, baseUrl);
    expect(sanitized.innerHTML).toContain('Hello world');
    expect(sanitized).not.toBe(element);
  });

  it('should remove script tags', () => {
    const dom = new JSDOM('<div><script>alert("xss")</script><p>Content</p></div>');
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    const sanitized = sanitizeClone(element, baseUrl);
    expect(sanitized.querySelector('script')).toBeNull();
    expect(sanitized.innerHTML).toContain('Content');
  });

  it('should remove style tags', () => {
    const dom = new JSDOM('<div><style>body { color: red; }</style><p>Content</p></div>');
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    const sanitized = sanitizeClone(element, baseUrl);
    expect(sanitized.querySelector('style')).toBeNull();
    expect(sanitized.innerHTML).toContain('Content');
  });

  it('should remove dangerous attributes (onclick, onload, etc.)', () => {
    const dom = new JSDOM('<div><p onclick="alert(1)" onload="evil()">Content</p></div>');
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    const sanitized = sanitizeClone(element, baseUrl);
    const p = sanitized.querySelector('p')!;
    expect(p.hasAttribute('onclick')).toBe(false);
    expect(p.hasAttribute('onload')).toBe(false);
  });

  it('should remove inline style attributes', () => {
    const dom = new JSDOM('<div><p style="color: red;">Content</p></div>');
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    const sanitized = sanitizeClone(element, baseUrl);
    const p = sanitized.querySelector('p')!;
    expect(p.hasAttribute('style')).toBe(false);
  });

  it('should normalize relative URLs to absolute for img src', () => {
    const dom = new JSDOM('<div><img src="/image.jpg"></div>');
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    const sanitized = sanitizeClone(element, baseUrl);
    const img = sanitized.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://example.com/image.jpg');
  });

  it('should normalize relative URLs to absolute for a href', () => {
    const dom = new JSDOM('<div><a href="/page.html">Link</a></div>');
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    const sanitized = sanitizeClone(element, baseUrl);
    const a = sanitized.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('https://example.com/page.html');
  });

  it('should preserve absolute URLs', () => {
    const dom = new JSDOM('<div><img src="https://other.com/image.jpg"></div>');
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    const sanitized = sanitizeClone(element, baseUrl);
    const img = sanitized.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://other.com/image.jpg');
  });

  it('should handle invalid URLs gracefully', () => {
    const dom = new JSDOM('<div><img src="not a url"></div>');
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    // Should not throw
    const sanitized = sanitizeClone(element, baseUrl);
    expect(sanitized).toBeDefined();
  });

  it('should remove multiple dangerous tags', () => {
    const dom = new JSDOM(`
      <div>
        <script>evil()</script>
        <style>body {}</style>
        <iframe src="evil.com"></iframe>
        <form><input type="text"></form>
        <p>Good content</p>
      </div>
    `);
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    const sanitized = sanitizeClone(element, baseUrl);
    expect(sanitized.querySelector('script')).toBeNull();
    expect(sanitized.querySelector('style')).toBeNull();
    expect(sanitized.querySelector('iframe')).toBeNull();
    expect(sanitized.querySelector('form')).toBeNull();
    expect(sanitized.querySelector('p')).not.toBeNull();
    expect(sanitized.textContent).toContain('Good content');
  });

  it('should normalize video src and poster attributes', () => {
    const dom = new JSDOM('<div><video src="/video.mp4" poster="/poster.jpg"></video></div>');
    const element = dom.window.document.querySelector('div')!;
    const baseUrl = 'https://example.com';
    
    const sanitized = sanitizeClone(element, baseUrl);
    const video = sanitized.querySelector('video')!;
    expect(video.getAttribute('src')).toBe('https://example.com/video.mp4');
    expect(video.getAttribute('poster')).toBe('https://example.com/poster.jpg');
  });
});

