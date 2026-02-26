import { Link } from 'react-router-dom';
import { useLocaleContext } from '../context/locale-context';

type ErrorCopy = {
  title: string;
  description: string;
};

function getErrorCopy(
  messages: ReturnType<typeof useLocaleContext>['messages'],
  statusCode: number
): ErrorCopy {
  switch (statusCode) {
    case 403:
      return {
        title: messages.errors.status403Title,
        description: messages.errors.status403Description
      };
    case 404:
      return {
        title: messages.errors.status404Title,
        description: messages.errors.status404Description
      };
    case 500:
      return {
        title: messages.errors.status500Title,
        description: messages.errors.status500Description
      };
    case 503:
      return {
        title: messages.errors.status503Title,
        description: messages.errors.status503Description
      };
    default:
      return {
        title: messages.errors.statusDefaultTitle,
        description: messages.errors.statusDefaultDescription
      };
  }
}

function normalizeStatusCode(statusCode: number): number {
  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
    return 500;
  }

  return statusCode;
}

export function ErrorState({ statusCode, detail }: { statusCode: number; detail?: string }) {
  const { locale, messages } = useLocaleContext();
  const normalizedStatusCode = normalizeStatusCode(statusCode);
  const copy = getErrorCopy(messages, normalizedStatusCode);

  return (
    <section className="stacked-section error-layout">
      <article className="card error-card" role="alert" aria-live="polite">
        <p className="error-code" aria-hidden="true">
          {normalizedStatusCode}
        </p>

        <div className="error-content">
          <p className="error-label">{normalizedStatusCode}</p>
          <h1>{copy.title}</h1>
          <p className="error-description">{copy.description}</p>
          {detail ? <p className="error-detail">{detail}</p> : null}

          <div className="error-actions">
            <Link className="error-action primary" to={`/${locale}`}>
              {messages.errors.actions.home}
            </Link>
            <Link className="error-action" to={`/${locale}/contact`}>
              {messages.errors.actions.contact}
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}
