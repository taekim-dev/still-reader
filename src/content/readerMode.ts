import {
  BUTTON_STYLES,
  COLORS,
  CSS_VARIABLES,
  DEFAULT_TITLE,
  DIMENSIONS,
  ELEMENT_IDS,
  FONT_SCALE,
  SUMMARY_MESSAGES,
  TYPOGRAPHY,
} from './constants';
import {
  getBackgroundColorVarRef,
  getForegroundColorVarRef,
  getThemeColors,
  Theme,
} from './themeUtils';

export interface ReaderContent {
  html: string;
  title?: string;
  theme?: 'light' | 'dark';
  fontScale?: number; // 1.0 is base, e.g., 1.1 = 110%
}

interface Snapshot {
  html: string;
  scrollX: number;
  scrollY: number;
}

const DEFAULT_THEME: Required<Pick<ReaderContent, 'theme' | 'fontScale'>> = {
  theme: 'light',
  fontScale: FONT_SCALE.DEFAULT,
};

interface ReaderState {
  theme: 'light' | 'dark';
  fontScale: number;
}

/**
 * Creates a reader mode instance with isolated state.
 * @internal - Exported for testing
 */
export function createReaderMode(initialState?: {
  isActive?: boolean;
  originalPage?: Snapshot | null;
  config?: ReaderState | null;
}) {
  let isActive = initialState?.isActive ?? false;
  let originalPage: Snapshot | null = initialState?.originalPage ?? null;
  let config: ReaderState | null = initialState?.config ?? null;

  function activateReader(document: Document, content: ReaderContent): { ok: boolean; reason?: string } {
    if (isActive) {
      return { ok: false, reason: 'already_active' };
    }

    originalPage = {
      html: document.documentElement.innerHTML,
      scrollX: document.defaultView?.scrollX ?? 0,
      scrollY: document.defaultView?.scrollY ?? 0,
    };

    const html = buildReaderShell(content);
    document.documentElement.innerHTML = html;
    config = {
      theme: content.theme ?? DEFAULT_THEME.theme,
      fontScale: content.fontScale ?? DEFAULT_THEME.fontScale,
    };
    applyState(document, config);
    setupControls(document);
    setupSummaryControls(document);

    isActive = true;
    return { ok: true };
  }

  function deactivateReader(document: Document): { ok: boolean; reason?: string } {
    if (!isActive || !originalPage) {
      return { ok: true, reason: 'not_active' };
    }

    document.documentElement.innerHTML = originalPage.html;
    try {
      const scrollToFn = document.defaultView?.scrollTo;
      const isJsdom = !!document.defaultView?.navigator?.userAgent?.includes('jsdom');
      const isStub = scrollToFn && /Not implemented/i.test(String(scrollToFn));
      const allowCustom = (scrollToFn as unknown as { __ALLOW_SCROLL__?: boolean })?.__ALLOW_SCROLL__ === true;
      if (scrollToFn && (allowCustom || (!isStub && !isJsdom))) {
        scrollToFn.call(document.defaultView, originalPage.scrollX, originalPage.scrollY);
      }
    } catch {
      // ignore scroll restore errors
    }

    isActive = false;
    originalPage = null;
    config = null;
    return { ok: true };
  }

  function isReaderActive(): boolean {
    return isActive;
  }

  function changeTheme(document: Document, theme: 'light' | 'dark'): { ok: boolean; reason?: string } {
    if (!isActive || !config) {
      return { ok: false, reason: 'not_active' };
    }

    config.theme = theme;
    applyState(document, config);
    return { ok: true };
  }

  function setupControls(document: Document): void {
    setupButtonHandlers(document);
    setupKeyboardShortcuts(document);
  }

  /**
   * Sets up click handlers for reader control buttons.
   * @internal - Exported for testing
   */
  function setupButtonHandlers(document: Document): void {
    const inc = document.getElementById(ELEMENT_IDS.FONT_INC);
    const dec = document.getElementById(ELEMENT_IDS.FONT_DEC);
    const exit = document.getElementById(ELEMENT_IDS.EXIT);

    inc?.addEventListener('click', () => handleFontIncrease(document));
    dec?.addEventListener('click', () => handleFontDecrease(document));
    exit?.addEventListener('click', () => handleExit(document));
  }

  /**
   * Sets up keyboard shortcuts for reader mode.
   * @internal - Exported for testing
   */
  function setupKeyboardShortcuts(document: Document): void {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Escape: Exit reader
      if (e.key === 'Escape') {
        e.preventDefault();
        handleExit(document);
        return;
      }

      // + or =: Increase font
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleFontIncrease(document);
        return;
      }

      // -: Decrease font
      if (e.key === '-') {
        e.preventDefault();
        handleFontDecrease(document);
        return;
      }

      // Option+S / Alt+S: Generate summary (backup handler)
      // Note: This is also handled via manifest command, but this provides
      // a backup in case the command doesn't work
      if ((e.altKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Trigger summary via message to content script
        // This will be handled by contentHandler
        document.dispatchEvent(new CustomEvent('sr-summarize'));
        return;
      }
    });
  }

  function handleFontIncrease(document: Document): void {
    if (!config) return;
    config.fontScale = clampFontScale(config.fontScale + FONT_SCALE.INCREMENT);
    applyState(document, config);
  }

  function handleFontDecrease(document: Document): void {
    if (!config) return;
    config.fontScale = clampFontScale(config.fontScale - FONT_SCALE.INCREMENT);
    applyState(document, config);
  }

  function handleExit(document: Document): void {
    deactivateReader(document);
  }

  function showSummary(document: Document, summary: string, isHtml: boolean = false): void {
    const summaryEl = document.getElementById(ELEMENT_IDS.SUMMARY);
    const contentEl = document.getElementById(ELEMENT_IDS.SUMMARY_CONTENT);
    if (!summaryEl || !contentEl) return;

    if (isHtml) {
      contentEl.innerHTML = summary;
    } else {
      contentEl.textContent = summary;
    }
    summaryEl.style.display = 'block';
    summaryEl.classList.remove('collapsed');
    updateSummaryToggleButton(document);
  }

  function hideSummary(document: Document): void {
    const summaryEl = document.getElementById(ELEMENT_IDS.SUMMARY);
    if (!summaryEl) return;
    summaryEl.style.display = 'none';
  }

  function removeSummary(document: Document): void {
    hideSummary(document);
    const contentEl = document.getElementById(ELEMENT_IDS.SUMMARY_CONTENT);
    if (contentEl) {
      contentEl.textContent = '';
    }
  }

  function toggleSummaryCollapse(document: Document): void {
    const summaryEl = document.getElementById(ELEMENT_IDS.SUMMARY);
    if (!summaryEl) return;
    summaryEl.classList.toggle('collapsed');
    updateSummaryToggleButton(document);
  }

  function updateSummaryToggleButton(document: Document): void {
    const toggleBtn = document.getElementById(ELEMENT_IDS.SUMMARY_TOGGLE);
    const summaryEl = document.getElementById(ELEMENT_IDS.SUMMARY);
    if (!toggleBtn || !summaryEl) return;
    // Icon is handled by CSS (::before pseudo-element)
    // Just update aria-label
    toggleBtn.setAttribute(
      'aria-label',
      summaryEl.classList.contains('collapsed') ? SUMMARY_MESSAGES.EXPAND : SUMMARY_MESSAGES.COLLAPSE
    );
  }

  function setupSummaryControls(document: Document): void {
    const toggleBtn = document.getElementById(ELEMENT_IDS.SUMMARY_TOGGLE);
    toggleBtn?.addEventListener('click', () => toggleSummaryCollapse(document));
  }

  return {
    activateReader,
    deactivateReader,
    isReaderActive,
    changeTheme,
    showSummary,
    hideSummary,
    removeSummary,
    toggleSummaryCollapse,
  };
}

// Create module-level instance for backward compatibility
const readerMode = createReaderMode();

// Export functions from module-level instance
export const activateReader = readerMode.activateReader;
export const deactivateReader = readerMode.deactivateReader;
export const isReaderActive = readerMode.isReaderActive;
export const changeTheme = readerMode.changeTheme;
export const showSummary = readerMode.showSummary;
export const hideSummary = readerMode.hideSummary;
export const removeSummary = readerMode.removeSummary;
export const toggleSummaryCollapse = readerMode.toggleSummaryCollapse;

/**
 * Generate CSS styles for reader mode.
 * @internal - Exported for testing
 */
export function generateStyles(theme: Theme, fontScale: number): string {
  const themeColors = getThemeColors(theme);
  const bgColorVar = getBackgroundColorVarRef(theme);
  const fgColorVar = getForegroundColorVarRef(theme);
  
  return `
    :root {
      ${CSS_VARIABLES.FONT_SCALE}: ${fontScale};
      ${CSS_VARIABLES.BG_LIGHT}: ${COLORS.light.background};
      ${CSS_VARIABLES.FG_LIGHT}: ${COLORS.light.foreground};
      ${CSS_VARIABLES.BG_DARK}: ${COLORS.dark.background};
      ${CSS_VARIABLES.FG_DARK}: ${COLORS.dark.foreground};
      ${CSS_VARIABLES.CONTENT_WIDTH}: ${DIMENSIONS.contentWidth};
      ${CSS_VARIABLES.LINE_HEIGHT}: ${TYPOGRAPHY.lineHeight};
      ${CSS_VARIABLES.FONT_FAMILY}: ${TYPOGRAPHY.fontFamily};
    }
    body {
      margin: 0;
      padding: 0;
      background: ${bgColorVar};
      color: ${fgColorVar};
      font-family: var(${CSS_VARIABLES.FONT_FAMILY});
      line-height: var(${CSS_VARIABLES.LINE_HEIGHT});
      font-size: calc(${TYPOGRAPHY.baseFontSize}px * var(${CSS_VARIABLES.FONT_SCALE}));
      display: flex;
      justify-content: center;
    }
    #${ELEMENT_IDS.ROOT} {
      max-width: var(${CSS_VARIABLES.CONTENT_WIDTH});
      width: 100%;
      padding: ${DIMENSIONS.padding.top}px ${DIMENSIONS.padding.sides}px ${DIMENSIONS.padding.bottom}px;
      box-sizing: border-box;
    }
    .sr-title {
      margin-top: 0;
      margin-bottom: ${DIMENSIONS.title.marginBottom}px;
      font-size: ${TYPOGRAPHY.title.fontSize};
      line-height: ${TYPOGRAPHY.title.lineHeight};
    }
    #${ELEMENT_IDS.ROOT} p {
      margin: 0 0 1em 0;
    }
    #${ELEMENT_IDS.ROOT} img, #${ELEMENT_IDS.ROOT} video {
      max-width: 100%;
      height: auto;
    }
    #${ELEMENT_IDS.ROOT} a {
      color: inherit;
      text-decoration: underline;
    }
    #${ELEMENT_IDS.CONTROLS} {
      position: sticky;
      top: 0;
      display: flex;
      gap: ${DIMENSIONS.controls.gap}px;
      align-items: center;
      padding: ${DIMENSIONS.controls.padding.top}px 0 ${DIMENSIONS.controls.padding.bottom}px 0;
      background: ${bgColorVar};
    }
    #${ELEMENT_IDS.CONTROLS} button {
      padding: ${BUTTON_STYLES.padding.vertical}px ${BUTTON_STYLES.padding.horizontal}px;
      border: 1px solid ${themeColors.border};
      background: ${themeColors.button};
      color: inherit;
      border-radius: ${BUTTON_STYLES.borderRadius}px;
      cursor: pointer;
      font: inherit;
    }
    #${ELEMENT_IDS.CONTROLS} button:hover {
      border-color: ${themeColors.buttonHover};
    }
    .sr-summary {
      margin: 24px 0;
      border: 1px solid ${themeColors.border};
      border-radius: 8px;
      background: ${bgColorVar};
      overflow: hidden;
    }
    #${ELEMENT_IDS.SUMMARY_HEADER} {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid ${themeColors.border};
      background: ${bgColorVar};
    }
    #${ELEMENT_IDS.SUMMARY_HEADER} h2 {
      margin: 0;
      font-size: 1.1em;
      font-weight: 600;
    }
    .sr-summary-actions {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .sr-icon-button {
      min-width: 2.5em;
      height: 2.5em;
      padding: 0.5em 0.75em;
      border: 1px solid ${themeColors.border};
      background: ${themeColors.button};
      color: inherit;
      border-radius: 6px;
      cursor: pointer;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1em;
      transition: all 0.2s ease;
      opacity: 0.85;
    }
    .sr-icon-button:hover {
      opacity: 1;
      background: ${themeColors.border};
      border-color: ${themeColors.buttonHover};
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .sr-icon-button:active {
      transform: translateY(0);
    }
    #${ELEMENT_IDS.SUMMARY_TOGGLE} {
      font-size: 1.1em;
      font-weight: 500;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #${ELEMENT_IDS.SUMMARY_TOGGLE}::before {
      content: '';
      width: 0;
      height: 0;
      border-left: 0.4em solid transparent;
      border-right: 0.4em solid transparent;
      border-top: 0.5em solid currentColor;
      transition: transform 0.2s;
    }
    .sr-summary.collapsed #${ELEMENT_IDS.SUMMARY_TOGGLE}::before {
      border-top: none;
      border-bottom: 0.5em solid currentColor;
    }
    #${ELEMENT_IDS.SUMMARY_CONTENT} {
      padding: 16px;
      line-height: 1.6;
    }
    .sr-summary.collapsed #${ELEMENT_IDS.SUMMARY_CONTENT} {
      display: none;
    }
  `;
}

/**
 * Generate the <head> section of the reader shell.
 * @internal - Exported for testing
 */
export function generateHead(title: string | undefined, theme: Theme, fontScale: number): string {
  const escapedTitle = escapeHtml(title ?? DEFAULT_TITLE);
  const styles = generateStyles(theme, fontScale);
  
  return `
<head>
  <meta charset="UTF-8" />
  <title>${escapedTitle}</title>
  <style>${styles}</style>
</head>`;
}

/**
 * Generate the <body> section of the reader shell.
 * @internal - Exported for testing
 */
export function generateBody(title: string | undefined, html: string, theme: Theme): string {
  const titleElement = title ? `<h1 class="sr-title">${escapeHtml(title)}</h1>` : '';
  
  return `
<body data-theme="${theme}">
  <div id="${ELEMENT_IDS.ROOT}">
    <div id="${ELEMENT_IDS.CONTROLS}">
      <button id="${ELEMENT_IDS.FONT_DEC}" aria-label="Decrease font size">A-</button>
      <button id="${ELEMENT_IDS.FONT_INC}" aria-label="Increase font size">A+</button>
      <button id="${ELEMENT_IDS.EXIT}" aria-label="Exit reader">Exit</button>
    </div>
    <div id="${ELEMENT_IDS.SUMMARY}" class="sr-summary" style="display: none;">
      <div id="${ELEMENT_IDS.SUMMARY_HEADER}" class="sr-summary-header">
        <h2>${SUMMARY_MESSAGES.TITLE}</h2>
        <div class="sr-summary-actions">
          <button id="${ELEMENT_IDS.SUMMARY_TOGGLE}" aria-label="${SUMMARY_MESSAGES.COLLAPSE}" class="sr-icon-button"></button>
        </div>
      </div>
      <div id="${ELEMENT_IDS.SUMMARY_CONTENT}" class="sr-summary-content"></div>
    </div>
    ${titleElement}
    <article class="sr-article">
      ${html}
    </article>
  </div>
</body>`;
}

/**
 * Build the complete reader shell HTML.
 */
function buildReaderShell(content: ReaderContent): string {
  const theme = content.theme ?? DEFAULT_THEME.theme;
  const fontScale = content.fontScale ?? DEFAULT_THEME.fontScale;
  
  const head = generateHead(content.title, theme, fontScale);
  const body = generateBody(content.title, content.html, theme);
  
  return `${head}${body}`;
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

/**
 * Update font scale CSS variable.
 * @internal - Exported for testing
 */
export function updateFontScale(document: Document, fontScale: number): void {
  document.documentElement.style.setProperty(CSS_VARIABLES.FONT_SCALE, fontScale.toString());
}

/**
 * Apply theme colors to body element.
 * @internal - Exported for testing
 */
export function applyThemeToBody(document: Document, theme: Theme): void {
  document.body.setAttribute('data-theme', theme);
  
  const bgColor = getBackgroundColorVarRef(theme);
  const fgColor = getForegroundColorVarRef(theme);
  
  document.body.style.background = bgColor;
  document.body.style.color = fgColor;
}

/**
 * Apply theme background to controls element.
 * @internal - Exported for testing
 */
export function applyThemeToControls(document: Document, theme: Theme): void {
  const controls = document.getElementById(ELEMENT_IDS.CONTROLS);
  if (controls) {
    const bgColor = getBackgroundColorVarRef(theme);
    (controls as HTMLElement).style.background = bgColor;
  }
}

/**
 * Apply theme styles to control buttons.
 * @internal - Exported for testing
 */
export function applyThemeToButtons(document: Document, theme: Theme): void {
  const themeColors = getThemeColors(theme);
  const buttons = document.querySelectorAll(`#${ELEMENT_IDS.CONTROLS} button`);
  
  buttons.forEach((btn) => {
    const button = btn as HTMLElement;
    button.style.borderColor = themeColors.border;
    button.style.background = themeColors.button;
  });
}

/**
 * Apply reader state to document (font scale and theme).
 */
function applyState(document: Document, next: ReaderState): void {
  updateFontScale(document, next.fontScale);
  applyThemeToBody(document, next.theme);
  applyThemeToControls(document, next.theme);
  applyThemeToButtons(document, next.theme);
}

function clampFontScale(value: number): number {
  return Math.min(FONT_SCALE.MAX, Math.max(FONT_SCALE.MIN, Number(value.toFixed(2))));
}


