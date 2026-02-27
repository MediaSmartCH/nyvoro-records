import { escapeHtml, renderApiPageShell } from './api-page-shell.js';

type ApiErrorPageInput = {
  statusCode: number;
  environment: string;
  message?: string;
  requestPath?: string;
};

type ErrorCopy = {
  title: string;
  description: string;
};

function normalizeStatusCode(statusCode: number): number {
  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
    return 500;
  }

  return statusCode;
}

function getErrorCopy(statusCode: number): ErrorCopy {
  switch (statusCode) {
    case 400:
      return {
        title: 'Bad request.',
        description: 'The request payload or parameters are invalid.'
      };
    case 401:
      return {
        title: 'Unauthorized request.',
        description: 'Authentication is required to access this resource.'
      };
    case 403:
      return {
        title: 'Access forbidden.',
        description: 'The request origin or permissions are not allowed for this route.'
      };
    case 404:
      return {
        title: 'Route not found.',
        description: 'The requested endpoint does not exist on this API.'
      };
    case 429:
      return {
        title: 'Rate limit reached.',
        description: 'Too many requests were detected in a short period. Please retry later.'
      };
    case 503:
      return {
        title: 'Service unavailable.',
        description: 'The service is temporarily unavailable while recovering.'
      };
    case 500:
      return {
        title: 'Unexpected server error.',
        description: 'The API encountered an internal failure while processing the request.'
      };
    default:
      return {
        title: `HTTP ${statusCode} response.`,
        description: 'The request completed with an unexpected HTTP error status.'
      };
  }
}

export function renderApiErrorPage(input: ApiErrorPageInput): string {
  const statusCode = normalizeStatusCode(input.statusCode);
  const copy = getErrorCopy(statusCode);
  const title = escapeHtml(copy.title);
  const description = escapeHtml(input.message ?? copy.description);
  const requestPath = input.requestPath ? escapeHtml(input.requestPath) : undefined;

  const requestPathMarkup = requestPath
    ? `<p class="error-detail">Requested path: <code>${requestPath}</code></p>`
    : '';

  const content = `
    <section class="error-layout card">
      <p class="error-code" aria-hidden="true">${statusCode}</p>
      <div class="error-content">
        <p class="eyebrow">Nyvoro Records API · Error ${statusCode}</p>
        <h1>${title}</h1>
        <p class="error-description">${description}</p>
        ${requestPathMarkup}
        <div class="hero-actions">
          <a class="action primary" href="/">Back to API home</a>
          <a class="action secondary" href="/api/v1/health">Open health endpoint</a>
        </div>
      </div>
    </section>
  `;

  return renderApiPageShell({
    title: `Nyvoro Records API · ${statusCode}`,
    description: `Nyvoro Records API error page for status code ${statusCode}.`,
    environment: input.environment,
    content
  });
}
