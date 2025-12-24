import {
  BUTTON_STYLES,
  COLORS,
  CSS_VARIABLES,
  DEFAULT_TITLE,
  DIMENSIONS,
  ELEMENT_IDS,
  FONT_SCALE,
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

let active = false;
let snapshot: Snapshot | null = null;
let state: ReaderState | null = null;

export function activateReader(document: Document, content: ReaderContent): { ok: boolean; reason?: string } {
  if (active) {
    return { ok: false, reason: 'already_active' };
  }

  snapshot = {
    html: document.documentElement.innerHTML,
    scrollX: document.defaultView?.scrollX ?? 0,
    scrollY: document.defaultView?.scrollY ?? 0,
  };

  const html = buildReaderShell(content);
  document.documentElement.innerHTML = html;
  state = {
    theme: content.theme ?? DEFAULT_THEME.theme,
    fontScale: content.fontScale ?? DEFAULT_THEME.fontScale,
  };
  applyState(document, state);
  wireControls(document);

  active = true;
  return { ok: true };
}

export function deactivateReader(document: Document): { ok: boolean; reason?: string } {
  if (!active || !snapshot) {
    return { ok: true, reason: 'not_active' };
  }

  document.documentElement.innerHTML = snapshot.html;
  try {
    const scrollToFn = document.defaultView?.scrollTo;
    const isJsdom = !!document.defaultView?.navigator?.userAgent?.includes('jsdom');
    const isStub = scrollToFn && /Not implemented/i.test(String(scrollToFn));
    const allowCustom = (scrollToFn as unknown as { __ALLOW_SCROLL__?: boolean })?.__ALLOW_SCROLL__ === true;
    if (scrollToFn && (allowCustom || (!isStub && !isJsdom))) {
      scrollToFn.call(document.defaultView, snapshot.scrollX, snapshot.scrollY);
    }
  } catch {
    // ignore scroll restore errors
  }

  active = false;
  snapshot = null;
  state = null;
  return { ok: true };
}

export function isReaderActive(): boolean {
  return active;
}

/**
 * Change theme while reader is active.
 */
export function changeTheme(document: Document, theme: 'light' | 'dark'): { ok: boolean; reason?: string } {
  if (!active || !state) {
    return { ok: false, reason: 'not_active' };
  }

  state.theme = theme;
  applyState(document, state);
  return { ok: true };
}

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

function wireControls(document: Document): void {
  const inc = document.getElementById(ELEMENT_IDS.FONT_INC);
  const dec = document.getElementById(ELEMENT_IDS.FONT_DEC);
  const exit = document.getElementById(ELEMENT_IDS.EXIT);

  const handleFontIncrease = () => {
    if (!state) return;
    state.fontScale = clampFontScale(state.fontScale + FONT_SCALE.INCREMENT);
    applyState(document, state);
  };

  const handleFontDecrease = () => {
    if (!state) return;
    state.fontScale = clampFontScale(state.fontScale - FONT_SCALE.INCREMENT);
    applyState(document, state);
  };

  const handleExit = () => {
    deactivateReader(document);
  };

  inc?.addEventListener('click', handleFontIncrease);
  dec?.addEventListener('click', handleFontDecrease);
  exit?.addEventListener('click', handleExit);

  // Add keyboard shortcuts when reader is active
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Escape: Exit reader
    if (e.key === 'Escape') {
      e.preventDefault();
      handleExit();
      return;
    }

    // + or =: Increase font
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      handleFontIncrease();
      return;
    }

    // -: Decrease font
    if (e.key === '-') {
      e.preventDefault();
      handleFontDecrease();
      return;
    }
  });
}

