import { type ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocaleContext } from '../context/locale-context';
import { fetchSession, type AuthRole } from '../lib/auth-api';

export type ProtectedSession = {
  role: AuthRole;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  expiresAt: string;
  shouldSetupTwoFactor: boolean;
};

type GuardDeniedReason = 'session_expired' | 'session_invalid' | 'unknown';

type GuardState =
  | { status: 'loading' }
  | { status: 'denied'; reason?: GuardDeniedReason }
  | { status: 'allowed'; session: ProtectedSession };

type RoleProtectedPageProps = {
  requiredRole?: AuthRole;
  children: (session: ProtectedSession) => ReactNode;
};

function parseRole(value: unknown): AuthRole | undefined {
  if (value === 'admin' || value === 'artist') {
    return value;
  }

  return undefined;
}

export function RoleProtectedPage({ requiredRole, children }: RoleProtectedPageProps) {
  const { locale } = useLocaleContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<GuardState>({ status: 'loading' });
  const deniedReason = state.status === 'denied' ? state.reason : undefined;

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const response = await fetchSession();
      if (!mounted) {
        return;
      }

      if (!response.ok || response.body.authenticated !== true) {
        if (response.body.code === 'session_expired') {
          setState({ status: 'denied', reason: 'session_expired' });
          return;
        }

        if (response.body.code === 'session_invalid') {
          setState({ status: 'denied', reason: 'session_invalid' });
          return;
        }

        setState({ status: 'denied', reason: 'unknown' });
        return;
      }

      const role = parseRole(response.body.role);
      if (!role || (requiredRole && role !== requiredRole)) {
        setState({ status: 'denied', reason: 'unknown' });
        return;
      }

      setState({
        status: 'allowed',
        session: {
          role,
          email: typeof response.body.email === 'string' ? response.body.email : '',
          firstName: typeof response.body.firstName === 'string' ? response.body.firstName : '',
          lastName: typeof response.body.lastName === 'string' ? response.body.lastName : '',
          displayName: typeof response.body.displayName === 'string' ? response.body.displayName : '',
          expiresAt: typeof response.body.expiresAt === 'string' ? response.body.expiresAt : '',
          shouldSetupTwoFactor: response.body.shouldSetupTwoFactor === true
        }
      });
    })();

    return () => {
      mounted = false;
    };
  }, [requiredRole]);

  useEffect(() => {
    if (state.status !== 'denied') {
      return;
    }

    const queryParams = new URLSearchParams({
      next: `${location.pathname}${location.search}`
    });

    if (deniedReason === 'session_expired') {
      queryParams.set('reason', 'inactive');
    }

    navigate(`/${locale}/login?${queryParams.toString()}`, { replace: true });
  }, [state.status, deniedReason, location.pathname, location.search, locale, navigate]);

  if (state.status === 'loading') {
    return (
      <section className="stacked-section dashboard-shell">
        <div className="card dashboard-card">
          <p>{locale === 'fr' ? 'Verification de session...' : 'Checking session...'}</p>
        </div>
      </section>
    );
  }

  if (state.status === 'denied') {
    const copy =
      locale === 'fr'
        ? {
            title: 'Redirection vers le login',
            description: 'Verification des permissions en cours...'
          }
        : {
            title: 'Redirecting to login',
            description: 'Checking permissions...'
          };

    return (
      <section className="stacked-section dashboard-shell">
        <article className="card dashboard-card">
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </article>
      </section>
    );
  }

  return <>{children(state.session)}</>;
}
