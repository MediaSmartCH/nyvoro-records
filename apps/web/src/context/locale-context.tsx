/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { Locale } from '@nyvoro/shared-types';
import type { Messages } from '../lib/locale';

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  value,
  children
}: {
  value: LocaleContextValue;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext(): LocaleContextValue {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocaleContext must be used inside LocaleProvider.');
  }

  return context;
}
