import { type FocusEvent, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Locale } from '@nyvoro/shared-types';
import {
  logoutSession,
  type AuthRole
} from '../lib/auth-api';

type AccountNavMenuProps = {
  locale: Locale;
  role: AuthRole | undefined;
  onNavigate?: () => void;
};

const copyByLocale = {
  fr: {
    trigger: 'Mon compte',
    dashboard: 'Dashboard',
    account: 'Mon compte',
    signOut: 'Se deconnecter',
    signingOut: 'Deconnexion...'
  },
  en: {
    trigger: 'My account',
    dashboard: 'Dashboard',
    account: 'My account',
    signOut: 'Sign out',
    signingOut: 'Signing out...'
  }
} as const;

function getDashboardPath(locale: Locale, role?: AuthRole) {
  if (role === 'admin') {
    return `/${locale}/admin/dashboard`;
  }

  if (role === 'artist') {
    return `/${locale}/artist/dashboard`;
  }

  return `/${locale}/account/settings`;
}

export function AccountNavMenu({ locale, role, onNavigate }: AccountNavMenuProps) {
  const location = useLocation();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const copy = copyByLocale[locale];
  const dashboardPath = getDashboardPath(locale, role);
  const accountPath = `/${locale}/account/settings`;
  const isActive =
    location.pathname.startsWith(accountPath) ||
    location.pathname.startsWith(`/${locale}/admin/dashboard`) ||
    location.pathname.startsWith(`/${locale}/artist/dashboard`);

  function clearCloseTimeout() {
    if (closeTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }

  function closeMenu() {
    clearCloseTimeout();
    setIsPinnedOpen(false);
    setIsOpen(false);
  }

  function scheduleHoverClose() {
    if (isPinnedOpen) {
      return;
    }

    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimeoutRef.current = null;
    }, 140);
  }

  function handlePointerEnter() {
    clearCloseTimeout();
    setIsOpen(true);
  }

  useEffect(() => {
    clearCloseTimeout();
    setIsPinnedOpen(false);
    setIsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      clearCloseTimeout();
      setIsPinnedOpen(false);
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearCloseTimeout();
        setIsPinnedOpen(false);
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current === null) {
        return;
      }

      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    },
    []
  );

  function handleSignOut() {
    setIsSigningOut(true);
    closeMenu();
    onNavigate?.();
    void logoutSession();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    closeMenu();
  }

  function handleMenuNavigate() {
    closeMenu();
    onNavigate?.();
  }

  return (
    <div
      ref={menuRef}
      className={`account-nav ${isOpen ? 'open' : ''}`.trim()}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={scheduleHoverClose}
      onBlur={handleBlur}
    >
      <button
        type="button"
        className={`account-nav-trigger ${isActive ? 'active' : ''}`.trim()}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => {
          clearCloseTimeout();

          if (isPinnedOpen) {
            closeMenu();
            return;
          }

          setIsPinnedOpen(true);
          setIsOpen(true);
        }}
        onFocus={handlePointerEnter}
      >
        <span>{copy.trigger}</span>
        <span className="account-nav-caret" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="account-nav-menu" role="menu" id={menuId} aria-label={copy.trigger}>
          <Link
            role="menuitem"
            className={location.pathname.startsWith(dashboardPath) ? 'active' : ''}
            to={dashboardPath}
            onClick={handleMenuNavigate}
          >
            {copy.dashboard}
          </Link>
          <Link
            role="menuitem"
            className={location.pathname.startsWith(accountPath) ? 'active' : ''}
            to={accountPath}
            onClick={handleMenuNavigate}
          >
            {copy.account}
          </Link>
          <Link
            role="menuitem"
            to={`/${locale}/login`}
            className={isSigningOut ? 'active' : ''}
            onClick={handleSignOut}
          >
            {isSigningOut ? copy.signingOut : copy.signOut}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
