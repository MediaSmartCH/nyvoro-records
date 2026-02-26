import { Navigate, useParams } from 'react-router-dom';
import type { Locale } from '@nyvoro/shared-types';
import { defaultLocale, getMessages, supportedLocaleList } from '../lib/locale';
import { LocaleProvider } from '../context/locale-context';
import { PageShell } from './page-shell';
import { RouteErrorPage } from '../pages/route-error-page';

function isSupportedLocaleValue(locale: string): locale is Locale {
  return supportedLocaleList.includes(locale as Locale);
}

export function LocaleErrorBoundary() {
  const params = useParams();
  const localeParam = params.locale;

  if (!localeParam) {
    return <Navigate to={`/${defaultLocale}/error/500`} replace />;
  }

  const loweredLocale = localeParam.toLowerCase();

  if (!isSupportedLocaleValue(loweredLocale)) {
    return <Navigate to={`/${defaultLocale}/error/404`} replace />;
  }

  return (
    <LocaleProvider value={{ locale: loweredLocale, messages: getMessages(loweredLocale) }}>
      <PageShell>
        <RouteErrorPage />
      </PageShell>
    </LocaleProvider>
  );
}
