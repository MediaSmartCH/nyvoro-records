import { Navigate } from 'react-router-dom';
import { detectBrowserLocale } from '../lib/locale';

export function LocaleRedirectPage() {
  const locale = detectBrowserLocale();
  return <Navigate to={`/${locale}`} replace />;
}
