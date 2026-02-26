import { ErrorState } from '../components/error-state';

export function NotFoundPage() {
  return <ErrorState statusCode={404} />;
}
