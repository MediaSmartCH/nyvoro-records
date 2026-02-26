import { Navigate, Outlet, useParams } from 'react-router-dom';
import type { Locale } from '@nyvoro/shared-types';
import { PageShell } from './page-shell';
import { LocaleProvider } from '../context/locale-context';
import { defaultLocale, getMessages, normalizeLocale, supportedLocaleList } from '../lib/locale';
import { NotFoundPage } from '../pages/not-found-page';

function isSupportedLocaleValue(locale: string): locale is Locale {
  return supportedLocaleList.includes(locale as Locale);
}

export function LocaleLayout() {
  const params = useParams();
  const locale = params.locale;

  if (!locale) {
    return <Navigate to={`/${defaultLocale}`} replace />;
  }

  const loweredLocale = locale.toLowerCase();

  if (!isSupportedLocaleValue(loweredLocale)) {
    return (
      <LocaleProvider value={{ locale: defaultLocale, messages: getMessages(defaultLocale) }}>
        <PageShell>
          <NotFoundPage />
        </PageShell>
      </LocaleProvider>
    );
  }

  const normalized = normalizeLocale(loweredLocale);

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
