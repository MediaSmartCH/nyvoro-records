type ApiHomePageInput = {
  environment: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderApiHomePage(input: ApiHomePageInput): string {
  const environment = escapeHtml(input.environment);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nyvoro Records API</title>
    <style>
      :root {
        --bg: #0b1220;
        --panel: #111a2b;
        --panel-border: #2a3956;
        --text: #e8eefb;
        --muted: #a8b6d6;
        --accent: #5fd3bc;
        --accent-2: #7ea8ff;
        --code-bg: #0f1728;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at 20% -10%, rgba(126, 168, 255, 0.22), transparent 45%),
          radial-gradient(circle at 95% 20%, rgba(95, 211, 188, 0.18), transparent 38%),
          var(--bg);
      }
      .container {
        max-width: 960px;
        margin: 0 auto;
        padding: 56px 20px 72px;
      }
      .hero {
        background: linear-gradient(155deg, rgba(126, 168, 255, 0.15), rgba(95, 211, 188, 0.12));
        border: 1px solid var(--panel-border);
        border-radius: 18px;
        padding: 28px;
        box-shadow: 0 18px 40px rgba(8, 13, 23, 0.45);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--panel-border);
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 0.02em;
      }
      h1 {
        margin: 16px 0 8px;
        font-size: clamp(1.8rem, 2.8vw, 2.5rem);
      }
      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.55;
      }
      .grid {
        margin-top: 22px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px;
      }
      .card {
        background: rgba(17, 26, 43, 0.82);
        border: 1px solid var(--panel-border);
        border-radius: 14px;
        padding: 16px;
      }
      h2 {
        margin: 0 0 10px;
        font-size: 1.02rem;
      }
      ul {
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
      }
      li {
        margin: 8px 0;
      }
      code {
        display: inline-block;
        margin-top: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        background: var(--code-bg);
        color: #dbe8ff;
        border: 1px solid var(--panel-border);
        border-radius: 8px;
        padding: 6px 8px;
        font-size: 0.86rem;
      }
      .status {
        margin-top: 22px;
        font-size: 0.88rem;
        color: var(--muted);
      }
      .status strong {
        color: var(--accent);
      }
      a {
        color: var(--accent-2);
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <main class="container">
      <section class="hero">
        <span class="badge">Nyvoro Records · Public API</span>
        <h1>API Gateway</h1>
        <p>
          This service powers the Nyvoro Records application pipeline, including join-form ingestion,
          anti-spam validation, secure persistence, and notification dispatch.
        </p>
        <div class="grid">
          <article class="card">
            <h2>Core Endpoints</h2>
            <ul>
              <li>
                Health check
                <br />
                <code>GET /api/v1/health</code>
              </li>
              <li>
                Join application intake
                <br />
                <code>POST /api/v1/applications</code>
              </li>
            </ul>
          </article>
          <article class="card">
            <h2>Security and Delivery</h2>
            <ul>
              <li>Cloudflare Turnstile token verification</li>
              <li>Honeypot and request rate limiting</li>
              <li>CORS allowlist + security headers (Helmet)</li>
              <li>SQLite persistence with SMTP notifications</li>
            </ul>
          </article>
        </div>
        <p class="status">
          Environment: <strong>${environment}</strong> · Domain:
          <a href="https://nyvoro-records.com">nyvoro-records.com</a>
        </p>
      </section>
    </main>
  </body>
</html>`;
}
