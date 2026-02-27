type RenderApiPageShellInput = {
  title: string;
  description: string;
  environment: string;
  content: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderApiPageShell(input: RenderApiPageShellInput): string {
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);
  const environment = escapeHtml(input.environment);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${description}" />
    <meta name="theme-color" content="#101215" />
    <link rel="icon" type="image/svg+xml" href="/api-assets/favicon-api.svg" />
    <link rel="shortcut icon" href="/api-assets/favicon-api.svg" />
    <link rel="apple-touch-icon" href="/api-assets/favicon-api.svg" />
    <title>${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Sora:wght@300;400;500;600;700&display=swap');

      :root {
        --bg: #e9e7e2;
        --surface: #f7f5f1;
        --surface-strong: #ffffff;
        --ink: #101215;
        --muted: #5f656d;
        --line: #d3cfc8;
        --line-strong: #b7b2ab;
        --accent: #13171d;
        --accent-soft: #ece7df;
        --success: #246149;
        --danger: #9f2f2f;
        --shadow: 0 24px 56px rgba(16, 18, 21, 0.11);
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0f141d;
          --surface: #161d29;
          --surface-strong: #1f2836;
          --ink: #edf1f7;
          --muted: #a8b1bf;
          --line: #2b3443;
          --line-strong: #3d475a;
          --accent: #f0f4fb;
          --accent-soft: #2a3445;
          --success: #7dd4ab;
          --danger: #ff9696;
          --shadow: 0 24px 56px rgba(0, 0, 0, 0.35);
        }
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--ink);
        font-family: 'Sora', sans-serif;
        background:
          radial-gradient(circle at 12% 4%, rgba(24, 27, 33, 0.08), transparent 34%),
          radial-gradient(circle at 86% 22%, rgba(120, 112, 101, 0.13), transparent 32%),
          var(--bg);
      }

      .site-root {
        width: min(100%, 1280px);
        margin: 0 auto;
        min-height: 100vh;
        padding: 0.9rem clamp(0.9rem, 2vw, 1.8rem) 1.8rem;
        display: flex;
        flex-direction: column;
        gap: 1.15rem;
      }

      .card {
        border: 1px solid var(--line);
        border-radius: 22px;
        background: var(--surface);
        box-shadow: var(--shadow);
      }

      .site-header {
        padding: 0.95rem 1.1rem;
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) auto auto;
        gap: 1rem;
        align-items: center;
        background: color-mix(in srgb, var(--surface), var(--surface-strong) 45%);
      }

      .brand-block {
        display: grid;
        gap: 0.22rem;
      }

      .brand-kicker {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.17em;
        font-size: 0.6rem;
        color: var(--muted);
      }

      .brand-title {
        text-decoration: none;
        color: inherit;
        font-family: 'Instrument Serif', serif;
        font-size: clamp(1.6rem, 2.2vw, 2.25rem);
        line-height: 1;
      }

      .brand-subtitle {
        margin: 0;
        color: var(--muted);
        font-size: 0.79rem;
        line-height: 1.45;
      }

      .main-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        align-items: center;
        justify-content: center;
      }

      .main-nav a {
        text-decoration: none;
        border: 1px solid transparent;
        border-radius: 999px;
        padding: 0.4rem 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.11em;
        font-size: 0.62rem;
        font-weight: 600;
        transition:
          border-color 160ms ease,
          transform 160ms ease;
      }

      .main-nav a:hover {
        border-color: var(--line-strong);
        transform: translateY(-1px);
      }

      .env-pill {
        margin: 0;
        border: 1px solid color-mix(in srgb, var(--line-strong), var(--line) 45%);
        border-radius: 999px;
        padding: 0.35rem 0.56rem;
        background: color-mix(in srgb, var(--surface-strong), var(--surface) 35%);
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }

      .env-label {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.54rem;
        color: var(--muted);
      }

      .env-pill strong {
        font-size: 0.66rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .page-content {
        flex: 1 0 auto;
        display: grid;
        gap: 1rem;
        align-content: start;
      }

      .hero {
        padding: clamp(1.15rem, 2.4vw, 2rem);
        background:
          radial-gradient(circle at 88% 12%, rgba(52, 81, 132, 0.18), transparent 34%),
          radial-gradient(circle at 20% 16%, rgba(204, 184, 151, 0.18), transparent 32%),
          color-mix(in srgb, var(--surface), var(--surface-strong) 42%);
      }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.62rem;
        color: var(--muted);
      }

      .hero h1 {
        margin: 0.55rem 0 0;
        font-family: 'Instrument Serif', serif;
        font-weight: 400;
        font-size: clamp(2.1rem, 5vw, 3.95rem);
        line-height: 0.96;
        max-width: 19ch;
      }

      .hero-copy {
        margin: 0.85rem 0 0;
        max-width: 68ch;
        color: var(--muted);
        line-height: 1.55;
      }

      .hero-actions {
        margin-top: 1rem;
        display: flex;
        gap: 0.56rem;
        flex-wrap: wrap;
      }

      .action {
        text-decoration: none;
        border-radius: 999px;
        padding: 0.64rem 0.94rem;
        text-transform: uppercase;
        letter-spacing: 0.11em;
        font-size: 0.66rem;
        font-weight: 600;
        border: 1px solid var(--line-strong);
        transition:
          transform 140ms ease,
          border-color 140ms ease,
          background 140ms ease,
          color 140ms ease;
      }

      .action:hover {
        transform: translateY(-1px);
      }

      .action.primary {
        border-color: var(--accent);
        background: var(--accent);
        color: var(--bg);
      }

      .action.secondary {
        color: var(--ink);
        background: color-mix(in srgb, var(--surface-strong), var(--surface) 30%);
      }

      .feature-grid {
        display: grid;
        gap: 0.95rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .feature-card {
        padding: 1rem;
        display: grid;
        gap: 0.52rem;
      }

      .feature-card h2 {
        margin: 0;
        font-family: 'Instrument Serif', serif;
        font-weight: 400;
        font-size: clamp(1.4rem, 2vw, 1.95rem);
      }

      .feature-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.5;
      }

      .list {
        margin: 0.2rem 0 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 0.52rem;
      }

      .endpoint {
        display: flex;
        flex-direction: column;
        gap: 0.24rem;
        border: 1px solid color-mix(in srgb, var(--line-strong), var(--line) 28%);
        border-radius: 14px;
        padding: 0.6rem 0.66rem;
        background: color-mix(in srgb, var(--surface-strong), var(--surface) 26%);
      }

      .endpoint span {
        font-size: 0.82rem;
      }

      code {
        width: fit-content;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.77rem;
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, var(--line-strong), var(--line) 24%);
        padding: 0.28rem 0.48rem;
        background: color-mix(in srgb, var(--surface-strong), var(--surface) 38%);
      }

      .method {
        border-left: 3px solid color-mix(in srgb, var(--line-strong), transparent 25%);
        padding-left: 0.62rem;
        color: var(--muted);
      }

      .status-line {
        margin: 0;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
      }

      .status-dot {
        width: 0.58rem;
        height: 0.58rem;
        border-radius: 999px;
        background: color-mix(in srgb, var(--muted), var(--surface) 30%);
      }

      .status-dot.ok {
        background: var(--success);
      }

      .status-dot.error {
        background: var(--danger);
      }

      .json-preview {
        margin: 0.2rem 0 0;
        border: 1px solid color-mix(in srgb, var(--line-strong), var(--line) 20%);
        border-radius: 12px;
        padding: 0.72rem;
        min-height: 170px;
        background: color-mix(in srgb, var(--surface-strong), var(--surface) 36%);
        overflow: auto;
        line-height: 1.45;
        font-size: 0.78rem;
      }

      .error-layout {
        min-height: clamp(320px, 55vh, 760px);
        padding: clamp(1.1rem, 2.4vw, 2rem);
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
        gap: clamp(0.9rem, 2.2vw, 2.1rem);
        align-items: center;
      }

      .error-code {
        margin: 0;
        font-family: 'Instrument Serif', serif;
        font-size: clamp(4.2rem, 15vw, 10.6rem);
        line-height: 0.85;
        color: color-mix(in srgb, var(--accent), transparent 78%);
      }

      .error-content {
        display: grid;
        gap: 0.65rem;
      }

      .error-content h1 {
        margin: 0;
        font-family: 'Instrument Serif', serif;
        font-weight: 400;
        font-size: clamp(2rem, 4.7vw, 4.2rem);
        line-height: 0.95;
        max-width: 14ch;
      }

      .error-description {
        margin: 0;
        color: var(--muted);
        line-height: 1.52;
      }

      .error-detail {
        margin: 0;
        border-left: 3px solid var(--line-strong);
        padding-left: 0.68rem;
        color: var(--muted);
        font-size: 0.86rem;
        word-break: break-word;
      }

      .site-footer {
        margin-top: auto;
        border-top: 1px solid var(--line-strong);
        padding-top: 0.78rem;
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        flex-wrap: wrap;
        font-size: 0.76rem;
        color: var(--muted);
      }

      .site-footer p {
        margin: 0;
      }

      .site-footer a {
        color: inherit;
      }

      @media (max-width: 980px) {
        .site-header {
          grid-template-columns: 1fr;
        }

        .main-nav {
          justify-content: flex-start;
        }

        .feature-grid {
          grid-template-columns: 1fr;
        }

        .error-layout {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        .site-root {
          padding-inline: 0.72rem;
          gap: 0.8rem;
        }

        .site-header {
          border-radius: 16px;
          padding: 0.75rem 0.82rem;
        }

        .hero,
        .feature-card,
        .error-layout {
          padding: 0.85rem;
          border-radius: 16px;
        }

        .hero h1 {
          max-width: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="site-root">
      <header class="site-header card">
        <div class="brand-block">
          <p class="brand-kicker">Independent label API</p>
          <a class="brand-title" href="/">Nyvoro Records API</a>
          <p class="brand-subtitle">
            Application intake, anti-spam checks, secure persistence, and operational delivery.
          </p>
        </div>
        <nav class="main-nav" aria-label="Primary navigation">
          <a href="/">Home</a>
          <a href="/api/v1/health">Health</a>
          <a href="https://www.nyvoro-records.com" target="_blank" rel="noreferrer">Main website</a>
        </nav>
        <p class="env-pill">
          <span class="env-label">Environment</span>
          <strong>${environment}</strong>
        </p>
      </header>
      <main class="page-content">${input.content}</main>
      <footer class="site-footer">
        <p>Nyvoro Records API Gateway</p>
        <p>
          <a href="https://www.nyvoro-records.com" target="_blank" rel="noreferrer">nyvoro-records.com</a>
        </p>
      </footer>
    </div>
  </body>
</html>`;
}
