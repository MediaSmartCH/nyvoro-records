import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { labelMetadata } from '@nyvoro/content';
import type { Locale } from '@nyvoro/shared-types';
import { getLocaleSwitchPath } from '../lib/locale';
import { useLocaleContext } from '../context/locale-context';
import {
  applyTheme,
  getInitialThemePreference,
  getSystemTheme,
  persistThemePreference,
  resolveThemePreference,
  type ResolvedTheme,
  type ThemePreference
} from '../lib/theme';

function LocaleSwitch({ locale, onNavigate }: { locale: Locale; onNavigate?: () => void }) {
  const location = useLocation();

  const frenchPath = getLocaleSwitchPath(location.pathname, 'fr');
  const englishPath = getLocaleSwitchPath(location.pathname, 'en');

  return (
    <div className="locale-switch" aria-label="Language switch">
      <Link to={englishPath} className={locale === 'en' ? 'active' : ''} onClick={onNavigate}>
        EN
      </Link>
      <Link to={frenchPath} className={locale === 'fr' ? 'active' : ''} onClick={onNavigate}>
        FR
      </Link>
    </div>
  );
}

function ThemeIcon({ mode }: { mode: ThemePreference }) {
  if (mode === 'light') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.1" />
        <path d="M12 2.4V5.2M12 18.8v2.8M4.9 4.9l2 2M17.1 17.1l2 2M2.4 12h2.8M18.8 12h2.8M4.9 19.1l2-2M17.1 6.9l2-2" />
      </svg>
    );
  }

  if (mode === 'dark') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.6 3.4a8.9 8.9 0 1 0 5 12.7 9.2 9.2 0 0 1-10-10 9.4 9.4 0 0 1 5-2.7z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.8" y="4.8" width="16.4" height="10.7" rx="1.8" />
      <path d="M9 19.2h6M12 15.5v3.7" />
    </svg>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { locale, messages } = useLocaleContext();
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    getInitialThemePreference()
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const resolvedTheme = resolveThemePreference(themePreference, systemTheme);

  const navigation = [
    { key: 'home', path: '', label: messages.nav.home },
    { key: 'artists', path: 'artists', label: messages.nav.artists },
    { key: 'contact', path: 'contact', label: messages.nav.contact }
  ];

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    syncTheme();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncTheme);
      return () => {
        mediaQuery.removeEventListener('change', syncTheme);
      };
    }

    mediaQuery.addListener(syncTheme);
    return () => {
      mediaQuery.removeListener(syncTheme);
    };
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme);
    persistThemePreference(themePreference);
  }, [resolvedTheme, themePreference]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const onScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const themeAriaLabel = locale === 'fr' ? 'Choix du thème' : 'Theme selection';
  const mobileMenuAriaLabel =
    locale === 'fr'
      ? isMobileMenuOpen
        ? 'Fermer le menu'
        : 'Ouvrir le menu'
      : isMobileMenuOpen
        ? 'Close menu'
        : 'Open menu';
  const themeOptions: { mode: ThemePreference; label: string }[] =
    locale === 'fr'
      ? [
          { mode: 'light', label: 'Mode jour' },
          { mode: 'dark', label: 'Mode nuit' },
          { mode: 'auto', label: 'Mode auto (système)' }
        ]
      : [
          { mode: 'light', label: 'Light mode' },
          { mode: 'dark', label: 'Dark mode' },
          { mode: 'auto', label: 'Auto mode (system)' }
        ];

  return (
    <div className="site-root">
      <header className={`site-header ${isScrolled ? 'is-scrolled' : ''} ${isMobileMenuOpen ? 'menu-open' : ''}`}>
        <div className="brand-block">
          <p className="brand-kicker">
            {locale === 'fr' ? 'Label indépendant' : 'Independent Label'} · {labelMetadata.foundedYear}
          </p>
          <Link to={`/${locale}`} className="brand-title">
            <img className="brand-logo" src="/favicon.svg" alt="" aria-hidden="true" />
            <span>{labelMetadata.name}</span>
          </Link>
          <p className="brand-subtitle">{labelMetadata.mission[locale]}</p>
        </div>

        <button
          type="button"
          className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
          aria-expanded={isMobileMenuOpen}
          aria-controls="site-mobile-nav"
          aria-label={mobileMenuAriaLabel}
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          <span className="mobile-menu-toggle-bar bar-1" aria-hidden="true" />
          <span className="mobile-menu-toggle-bar bar-2" aria-hidden="true" />
          <span className="mobile-menu-toggle-bar bar-3" aria-hidden="true" />
        </button>

        <nav className="main-nav" aria-label="Main navigation" id="site-mobile-nav">
          {navigation.map((item) => {
            const to = item.path ? `/${locale}/${item.path}` : `/${locale}`;
            return (
              <NavLink key={item.key} to={to} end={item.path === ''} onClick={() => setIsMobileMenuOpen(false)}>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="header-controls">
          <div className="theme-switch" role="group" aria-label={themeAriaLabel}>
            {themeOptions.map((option) => (
              <button
                key={option.mode}
                type="button"
                className={`theme-option ${themePreference === option.mode ? 'active' : ''}`}
                onClick={() => setThemePreference(option.mode)}
                aria-label={option.label}
                title={option.label}
              >
                <ThemeIcon mode={option.mode} />
                <span className="sr-only">{option.label}</span>
              </button>
            ))}
          </div>
          <LocaleSwitch locale={locale} onNavigate={() => setIsMobileMenuOpen(false)} />
        </div>
      </header>

      <main className="page-content">{children}</main>

      <footer className="site-footer">
        <div>
          <p>
            {labelMetadata.name} · {labelMetadata.foundedYear}
          </p>
          <p>{messages.footer.rights}</p>
          <p className="site-credit">
            {locale === 'fr' ? 'Site créé par ' : 'Site created by '}
            <a
              className="site-credit-link"
              href="https://www.mediasmart.ch/"
              target="_blank"
              rel="noreferrer"
            >
              MediaSmart
            </a>
            .
          </p>
        </div>
        <div className="footer-legal-links">
          <Link to={`/${locale}/legal/imprint`}>{messages.legal.imprint}</Link>
          <Link to={`/${locale}/legal/privacy`}>{messages.legal.privacy}</Link>
          <Link to={`/${locale}/legal/terms`}>{messages.legal.terms}</Link>
        </div>
      </footer>
    </div>
  );
}
