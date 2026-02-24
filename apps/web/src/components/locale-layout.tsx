import { Navigate, Outlet, useParams } from 'react-router-dom';
import { PageShell } from './page-shell';
import { LocaleProvider } from '../context/locale-context';
import { getMessages, normalizeLocale } from '../lib/locale';

export function LocaleLayout() {
  const params = useParams();
  const locale = params.locale;

  if (!locale) {
    return <Navigate to="/en" replace />;
  }

  const normalized = normalizeLocale(locale);

  if (normalized !== locale) {
    return <Navigate to={`/${normalized}`} replace />;
  }

  return (
    <LocaleProvider value={{ locale: normalized, messages: getMessages(normalized) }}>
      <PageShell>
        <Outlet />
      </PageShell>
    </LocaleProvider>
  );
}
