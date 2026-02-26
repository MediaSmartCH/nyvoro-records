import { useParams } from 'react-router-dom';
import { ErrorState } from '../components/error-state';

function parseStatusCode(rawStatusCode?: string): number {
  if (!rawStatusCode) {
    return 500;
  }

  const parsedStatusCode = Number.parseInt(rawStatusCode, 10);

  if (Number.isNaN(parsedStatusCode)) {
    return 500;
  }

  return parsedStatusCode;
}

export function ErrorStatusPage() {
  const { statusCode } = useParams();

  return <ErrorState statusCode={parseStatusCode(statusCode)} />;
}
