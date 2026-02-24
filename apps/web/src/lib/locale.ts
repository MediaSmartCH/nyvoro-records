import { defaultLocale, getTranslation, isSupportedLocale, supportedLocaleList } from '@nyvoro/content';
import type { Locale } from '@nyvoro/shared-types';

export type Messages = ReturnType<typeof getTranslation>;

export function normalizeLocale(input?: string): Locale {
  if (!input) {
    return defaultLocale;
  }

  const lowered = input.toLowerCase();
  if (isSupportedLocale(lowered)) {
    return lowered;
  }

  return defaultLocale;
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return defaultLocale;
  }

  const [firstChunk] = navigator.language.toLowerCase().split('-');
  return normalizeLocale(firstChunk);
}

export function getLocaleSwitchPath(pathname: string, targetLocale: Locale): string {
  const parts = pathname.split('/').filter(Boolean);
  const maybeLocale = parts[0];

  if (!maybeLocale || !isSupportedLocale(maybeLocale)) {
    return `/${targetLocale}`;
  }

  const trailing = parts.slice(1).join('/');
  return trailing.length > 0 ? `/${targetLocale}/${trailing}` : `/${targetLocale}`;
}

export function getMessages(locale: Locale): Messages {
  return getTranslation(locale);
}

export { defaultLocale, supportedLocaleList };
