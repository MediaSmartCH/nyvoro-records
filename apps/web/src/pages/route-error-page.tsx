import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ErrorState } from '../components/error-state';

function getStatusCodeFromError(error: unknown): number {
  if (isRouteErrorResponse(error)) {
    return error.status;
  }

  return 500;
}

function getErrorDetail(error: unknown): string | undefined {
  if (isRouteErrorResponse(error)) {
    return error.statusText || undefined;
  }

  if (error instanceof Error && import.meta.env.DEV) {
    return error.message;
  }

  return undefined;
}

export function RouteErrorPage() {
  const error = useRouteError();
  const detail = getErrorDetail(error);

  if (detail) {
    return <ErrorState statusCode={getStatusCodeFromError(error)} detail={detail} />;
  }

  return <ErrorState statusCode={getStatusCodeFromError(error)} />;
}
