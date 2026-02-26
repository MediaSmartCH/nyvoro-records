import { Navigate } from 'react-router-dom';
import { detectBrowserLocale } from '../lib/locale';

export function GlobalNotFoundRedirectPage() {
  const locale = detectBrowserLocale();

  return <Navigate to={`/${locale}/error/404`} replace />;
}
