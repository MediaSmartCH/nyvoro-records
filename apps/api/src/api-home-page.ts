import { renderApiPageShell } from './api-page-shell.js';

type ApiHomePageInput = {
  environment: string;
};

export function renderApiHomePage(input: ApiHomePageInput): string {
  const content = `
    <section class="hero card">
      <p class="eyebrow">Nyvoro Records · Public API</p>
      <h1>API gateway aligned with the main website design.</h1>
      <p class="hero-copy">
        The API remains machine-first with JSON endpoints, while this page provides a polished visual layer for
        humans: status visibility, key routes, and operational behavior in one place.
      </p>
      <div class="hero-actions">
        <a class="action primary" href="/api/v1/health">Open /api/v1/health</a>
        <a class="action secondary" href="https://www.nyvoro-records.com" target="_blank" rel="noreferrer">
          Visit nyvoro-records.com
        </a>
      </div>
    </section>

    <section class="feature-grid">
      <article class="feature-card card">
        <h2>Core endpoints</h2>
        <ul class="list">
          <li class="endpoint">
            <span>Health check</span>
            <code>GET /api/v1/health</code>
          </li>
          <li class="endpoint">
            <span>Join application intake</span>
            <code>POST /api/v1/applications</code>
          </li>
          <li class="endpoint">
            <span>Profile access via magic link</span>
            <code>GET /api/v1/applications/:applicationId/profile?token=...</code>
          </li>
        </ul>
      </article>

      <article class="feature-card card">
        <h2>Visual web rendering</h2>
        <p class="status-line">
          <span id="health-dot" class="status-dot" aria-hidden="true"></span>
          <strong id="health-label">Checking live API status...</strong>
        </p>
        <p>
          This preview keeps the endpoint behavior unchanged while exposing a browser-friendly status view.
        </p>
        <pre class="json-preview" id="health-preview" aria-live="polite">Loading /api/v1/health ...</pre>
      </article>
    </section>

    <section class="feature-grid">
      <article class="feature-card card">
        <h2>Security and delivery pipeline</h2>
        <p class="method">Cloudflare Turnstile token verification before any persistence.</p>
        <p class="method">Honeypot + IP-based rate limiting to reduce automated abuse.</p>
        <p class="method">CORS allowlist and security headers via Helmet.</p>
        <p class="method">SQLite persistence with SMTP notifications and failure fallback.</p>
      </article>

      <article class="feature-card card">
        <h2>Error management</h2>
        <p class="method"><code>404</code> unknown routes return structured API errors.</p>
        <p class="method"><code>403</code> disallowed origins are explicitly mapped.</p>
        <p class="method"><code>500</code> unhandled failures return standardized payloads.</p>
        <p class="method">Browsers receive a styled error page, API clients keep JSON responses.</p>
      </article>
    </section>

    <script>
      (async function loadHealthPreview() {
        const statusDot = document.getElementById('health-dot');
        const statusLabel = document.getElementById('health-label');
        const jsonPreview = document.getElementById('health-preview');

        if (!statusDot || !statusLabel || !jsonPreview) {
          return;
        }

        try {
          const response = await fetch('/api/v1/health', {
            headers: { Accept: 'application/json' }
          });

          const payload = await response.json();

          if (response.ok) {
            statusDot.classList.add('ok');
            statusLabel.textContent = 'Operational';
          } else {
            statusDot.classList.add('error');
            statusLabel.textContent = 'Degraded';
          }

          jsonPreview.textContent = JSON.stringify(payload, null, 2);
        } catch (error) {
          statusDot.classList.add('error');
          statusLabel.textContent = 'Unavailable';
          jsonPreview.textContent = JSON.stringify(
            {
              status: 'error',
              message: error instanceof Error ? error.message : 'Health request failed.'
            },
            null,
            2
          );
        }
      })();
    </script>
  `;

  return renderApiPageShell({
    title: 'Nyvoro Records API',
    description: 'Nyvoro Records public API gateway with operational health and endpoint overview.',
    environment: input.environment,
    content
  });
}
