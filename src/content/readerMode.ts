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
  fontScale: 1,
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

function buildReaderShell(content: ReaderContent): string {
  const theme = content.theme ?? DEFAULT_THEME.theme;
  const fontScale = content.fontScale ?? DEFAULT_THEME.fontScale;
  const title = content.title ? `<h1 class="sr-title">${content.title}</h1>` : '';

  return `
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(content.title ?? 'Reader')}</title>
  <style>
    :root {
      --sr-font-scale: ${fontScale};
      --sr-bg-light: #f8f8f8;
      --sr-fg-light: #1a1a1a;
      --sr-bg-dark: #111;
      --sr-fg-dark: #f5f5f5;
      --sr-content-width: 720px;
      --sr-line-height: 1.6;
      --sr-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      padding: 0;
      background: ${theme === 'dark' ? 'var(--sr-bg-dark)' : 'var(--sr-bg-light)'};
      color: ${theme === 'dark' ? 'var(--sr-fg-dark)' : 'var(--sr-fg-light)'};
      font-family: var(--sr-font-family);
      line-height: var(--sr-line-height);
      font-size: calc(16px * var(--sr-font-scale));
      display: flex;
      justify-content: center;
    }
    #still-reader-root {
      max-width: var(--sr-content-width);
      width: 100%;
      padding: 32px 20px 64px;
      box-sizing: border-box;
    }
    .sr-title {
      margin-top: 0;
      margin-bottom: 24px;
      font-size: 1.8em;
      line-height: 1.2;
    }
    #still-reader-root p {
      margin: 0 0 1em 0;
    }
    #still-reader-root img, #still-reader-root video {
      max-width: 100%;
      height: auto;
    }
    #still-reader-root a {
      color: inherit;
      text-decoration: underline;
    }
    #still-reader-controls {
      position: sticky;
      top: 0;
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 12px 0 16px 0;
      background: ${theme === 'dark' ? 'var(--sr-bg-dark)' : 'var(--sr-bg-light)'};
    }
    #still-reader-controls button {
      padding: 6px 10px;
      border: 1px solid ${theme === 'dark' ? '#333' : '#ccc'};
      background: ${theme === 'dark' ? '#1c1c1c' : '#fff'};
      color: inherit;
      border-radius: 6px;
      cursor: pointer;
      font: inherit;
    }
    #still-reader-controls button:hover {
      border-color: ${theme === 'dark' ? '#555' : '#999'};
    }
  </style>
</head>
<body data-theme="${theme}">
  <div id="still-reader-root">
    <div id="still-reader-controls">
      <button id="sr-font-dec" aria-label="Decrease font size">A-</button>
      <button id="sr-font-inc" aria-label="Increase font size">A+</button>
      <button id="sr-theme-toggle" aria-label="Toggle theme">${theme === 'dark' ? 'Light' : 'Dark'}</button>
      <button id="sr-exit" aria-label="Exit reader">Exit</button>
    </div>
    ${title}
    <article class="sr-article">
      ${content.html}
    </article>
  </div>
</body>
`;
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

function applyState(document: Document, next: ReaderState): void {
  document.documentElement.style.setProperty('--sr-font-scale', next.fontScale.toString());
  const theme = next.theme;
  document.body.setAttribute('data-theme', theme);
}

function clampFontScale(value: number): number {
  const min = 0.8;
  const max = 1.6;
  return Math.min(max, Math.max(min, Number(value.toFixed(2))));
}

function wireControls(document: Document): void {
  const inc = document.getElementById('sr-font-inc');
  const dec = document.getElementById('sr-font-dec');
  const theme = document.getElementById('sr-theme-toggle');
  const exit = document.getElementById('sr-exit');

  const updateThemeLabel = () => {
    if (theme) {
      theme.textContent = state?.theme === 'dark' ? 'Light' : 'Dark';
    }
  };

  inc?.addEventListener('click', () => {
    if (!state) return;
    state.fontScale = clampFontScale(state.fontScale + 0.1);
    applyState(document, state);
  });

  dec?.addEventListener('click', () => {
    if (!state) return;
    state.fontScale = clampFontScale(state.fontScale - 0.1);
    applyState(document, state);
  });

  theme?.addEventListener('click', () => {
    if (!state) return;
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyState(document, state);
    updateThemeLabel();
  });

  exit?.addEventListener('click', () => {
    deactivateReader(document);
  });
}

