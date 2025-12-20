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

let active = false;
let snapshot: Snapshot | null = null;

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
      --font-scale: ${fontScale};
      --bg-light: #f8f8f8;
      --fg-light: #1a1a1a;
      --bg-dark: #111;
      --fg-dark: #f5f5f5;
      --content-width: 720px;
      --line-height: 1.6;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      padding: 0;
      background: ${theme === 'dark' ? 'var(--bg-dark)' : 'var(--bg-light)'};
      color: ${theme === 'dark' ? 'var(--fg-dark)' : 'var(--fg-light)'};
      font-family: var(--font-family);
      line-height: var(--line-height);
      font-size: calc(16px * var(--font-scale));
      display: flex;
      justify-content: center;
    }
    #still-reader-root {
      max-width: var(--content-width);
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
  </style>
</head>
<body data-theme="${theme}">
  <div id="still-reader-root">
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

