import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminCatalogManager } from '../components/admin/admin-catalog-manager';
import { RoleProtectedPage } from '../components/role-protected-page';
import { useLocaleContext } from '../context/locale-context';
import {
  fetchAdminDashboard,
  logoutSession,
  resolveContactMessage,
  type AdminDashboardSummary,
  type AdminRecentApplication,
  type AdminRecentContactMessage,
  type AuthRole
} from '../lib/auth-api';

type LocaleKey = 'en' | 'fr';

type SessionState = {
  role: AuthRole;
  email: string;
  expiresAt: string;
  shouldSetupTwoFactor: boolean;
};

type DashboardData = {
  summary: AdminDashboardSummary;
  recentApplications: AdminRecentApplication[];
  recentContactMessages: AdminRecentContactMessage[];
};

const copyByLocale: Record<
  LocaleKey,
  {
    title: string;
    subtitle: string;
    sessionTitle: string;
    connectedAs: string;
    activeUntil: string;
    overviewTitle: string;
    metrics: {
      totalApplications: string;
      applicationsLast7Days: string;
      applicationsEmailPendingOrFailed: string;
      openContactMessages: string;
    };
    recentApplicationsTitle: string;
    recentContactMessagesTitle: string;
    noApplications: string;
    noContactMessages: string;
    loading: string;
    loadError: string;
    refresh: string;
    resolve: string;
    resolved: string;
    resolving: string;
    statusOpen: string;
    statusResolved: string;
    emailStatus: Record<'pending' | 'sent' | 'failed', string>;
    twoFactorHint: string;
    signOut: string;
    signingOut: string;
  }
> = {
  fr: {
    title: 'Dashboard admin',
    subtitle: 'Pilotage operationnel du label, du roster et des sorties.',
    sessionTitle: 'Session',
    connectedAs: 'Connecte en tant que',
    activeUntil: 'Session valide jusqu au',
    overviewTitle: 'Vue rapide',
    metrics: {
      totalApplications: 'Total candidatures',
      applicationsLast7Days: '7 derniers jours',
      applicationsEmailPendingOrFailed: 'Emails en attente/echec',
      openContactMessages: 'Messages ouverts'
    },
    recentApplicationsTitle: 'Inscriptions recentes',
    recentContactMessagesTitle: 'Messages contact',
    noApplications: 'Aucune candidature recente.',
    noContactMessages: 'Aucun message contact pour le moment.',
    loading: 'Chargement du dashboard...',
    loadError: 'Impossible de charger les donnees admin pour le moment.',
    refresh: 'Recharger',
    resolve: 'Marquer traite',
    resolved: 'Traite',
    resolving: 'Traitement...',
    statusOpen: 'Ouvert',
    statusResolved: 'Traite',
    emailStatus: {
      pending: 'En attente',
      sent: 'Envoye',
      failed: 'Echec'
    },
    twoFactorHint:
      '2FA est fortement recommande apres la premiere connexion. Tu peux l activer plus tard sans blocage.',
    signOut: 'Se deconnecter',
    signingOut: 'Deconnexion...'
  },
  en: {
    title: 'Admin dashboard',
    subtitle: 'Operational control room for roster, releases, signups, and inbound contact.',
    sessionTitle: 'Session',
    connectedAs: 'Signed in as',
    activeUntil: 'Session valid until',
    overviewTitle: 'Overview',
    metrics: {
      totalApplications: 'Total applications',
      applicationsLast7Days: 'Last 7 days',
      applicationsEmailPendingOrFailed: 'Pending/failed emails',
      openContactMessages: 'Open messages'
    },
    recentApplicationsTitle: 'Recent applications',
    recentContactMessagesTitle: 'Contact queue',
    noApplications: 'No recent applications yet.',
    noContactMessages: 'No contact messages yet.',
    loading: 'Loading dashboard...',
    loadError: 'Unable to load admin data right now.',
    refresh: 'Refresh',
    resolve: 'Mark as resolved',
    resolved: 'Resolved',
    resolving: 'Resolving...',
    statusOpen: 'Open',
    statusResolved: 'Resolved',
    emailStatus: {
      pending: 'Pending',
      sent: 'Sent',
      failed: 'Failed'
    },
    twoFactorHint:
      '2FA is strongly recommended after your first login. You can enable it later without being blocked.',
    signOut: 'Sign out',
    signingOut: 'Signing out...'
  }
};

function normalizeDashboardData(responseBody: {
  summary?: unknown;
  recentApplications?: unknown;
  recentContactMessages?: unknown;
}): DashboardData {
  const summary = responseBody.summary as AdminDashboardSummary | undefined;
  const recentApplications = Array.isArray(responseBody.recentApplications)
    ? (responseBody.recentApplications as AdminRecentApplication[])
    : [];
  const recentContactMessages = Array.isArray(responseBody.recentContactMessages)
    ? (responseBody.recentContactMessages as AdminRecentContactMessage[])
    : [];

  return {
    summary: {
      totalApplications: typeof summary?.totalApplications === 'number' ? summary.totalApplications : 0,
      applicationsLast7Days:
        typeof summary?.applicationsLast7Days === 'number' ? summary.applicationsLast7Days : 0,
      applicationsEmailPendingOrFailed:
        typeof summary?.applicationsEmailPendingOrFailed === 'number'
          ? summary.applicationsEmailPendingOrFailed
          : 0,
      openContactMessages: typeof summary?.openContactMessages === 'number' ? summary.openContactMessages : 0
    },
    recentApplications,
    recentContactMessages
  };
}

function AdminDashboardContent({
  locale,
  copy,
  session,
  onSignOut,
  isSigningOut
}: {
  locale: string;
  copy: (typeof copyByLocale)['en'];
  session: SessionState;
  onSignOut: () => Promise<void>;
  isSigningOut: boolean;
}) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvingMessageId, setResolvingMessageId] = useState<string | null>(null);

  const metricRows = useMemo(() => {
    if (!dashboard) {
      return [] as Array<{ label: string; value: number }>;
    }

    return [
      { label: copy.metrics.totalApplications, value: dashboard.summary.totalApplications },
      { label: copy.metrics.applicationsLast7Days, value: dashboard.summary.applicationsLast7Days },
      {
        label: copy.metrics.applicationsEmailPendingOrFailed,
        value: dashboard.summary.applicationsEmailPendingOrFailed
      },
      { label: copy.metrics.openContactMessages, value: dashboard.summary.openContactMessages }
    ];
  }, [dashboard, copy.metrics]);

  const loadDashboard = useCallback(
    async (options?: { isRefresh?: boolean }) => {
      if (options?.isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      const response = await fetchAdminDashboard();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const queryParams = new URLSearchParams({
            next: `/${locale}/admin/dashboard`
          });

          if (response.status === 401) {
            queryParams.set('reason', 'inactive');
          }

          navigate(`/${locale}/login?${queryParams.toString()}`, {
            replace: true
          });
          return;
        }

        setErrorMessage(copy.loadError);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setDashboard(normalizeDashboardData(response.body));
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [copy.loadError, locale, navigate]
  );

  async function handleResolveContactMessage(messageId: string) {
    if (!dashboard || resolvingMessageId) {
      return;
    }

    const previousDashboard = dashboard;
    const previousContactMessages = dashboard.recentContactMessages;
    setResolvingMessageId(messageId);
    setErrorMessage(null);

    setDashboard({
      ...dashboard,
      summary: {
        ...dashboard.summary,
        openContactMessages:
          previousContactMessages.find((entry) => entry.id === messageId)?.status === 'open'
            ? Math.max(0, dashboard.summary.openContactMessages - 1)
            : dashboard.summary.openContactMessages
      },
      recentContactMessages: previousContactMessages.map((entry) =>
        entry.id === messageId ? { ...entry, status: 'resolved' } : entry
      )
    });

    const response = await resolveContactMessage(messageId);
    if (!response.ok) {
      setDashboard(previousDashboard);
      setErrorMessage(copy.loadError);
    }

    setResolvingMessageId(null);
  }

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (isLoading) {
    return (
      <div className="card dashboard-card">
        <p>{copy.loading}</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="card dashboard-card">
        <p>{copy.loadError}</p>
        <button type="button" className="btn secondary" onClick={() => void loadDashboard({ isRefresh: true })}>
          {copy.refresh}
        </button>
      </div>
    );
  }

  return (
    <>
      {errorMessage ? <p className="form-status error">{errorMessage}</p> : null}

      <div className="dashboard-layout">
        <article className="card dashboard-card">
          <h2>{copy.sessionTitle}</h2>
          <p>
            {copy.connectedAs} {session.email}
          </p>
          {session.expiresAt ? (
            <p>
              {copy.activeUntil} {new Date(session.expiresAt).toLocaleString(locale)}
            </p>
          ) : null}
        </article>

        <article className="card dashboard-card">
          <h2>{copy.overviewTitle}</h2>
          <div className="dashboard-metric-grid">
            {metricRows.map((metric) => (
              <div key={metric.label} className="dashboard-metric-item">
                <p className="dashboard-metric-value">{metric.value}</p>
                <p className="dashboard-metric-label">{metric.label}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <AdminCatalogManager locale={locale} />

      <article className="card dashboard-card dashboard-card-wide">
        <div className="dashboard-card-header">
          <h2>{copy.recentApplicationsTitle}</h2>
        </div>

        {dashboard.recentApplications.length > 0 ? (
          <ul className="dashboard-list">
            {dashboard.recentApplications.map((application) => (
              <li key={application.id} className="dashboard-list-item">
                <div>
                  <p className="dashboard-list-title">{application.artistName}</p>
                  <p className="dashboard-list-subtitle">{application.email || 'n/a'}</p>
                </div>
                <div className="dashboard-list-meta">
                  <span>{new Date(application.createdAt).toLocaleString(locale)}</span>
                  <span>{copy.emailStatus[application.emailStatus]}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>{copy.noApplications}</p>
        )}
      </article>

      <article className="card dashboard-card dashboard-card-wide">
        <div className="dashboard-card-header">
          <h2>{copy.recentContactMessagesTitle}</h2>
          <button
            type="button"
            className="btn secondary"
            onClick={() => void loadDashboard({ isRefresh: true })}
            disabled={isRefreshing || isSigningOut || resolvingMessageId !== null}
          >
            {copy.refresh}
          </button>
        </div>

        {dashboard.recentContactMessages.length > 0 ? (
          <ul className="dashboard-list">
            {dashboard.recentContactMessages.map((message) => {
              const isResolved = message.status === 'resolved';
              const isResolving = resolvingMessageId === message.id;

              return (
                <li key={message.id} className="dashboard-list-item dashboard-list-item-with-action">
                  <div>
                    <p className="dashboard-list-title">{message.subject}</p>
                    <p className="dashboard-list-subtitle">
                      {message.fullName} · {message.email}
                    </p>
                    <p className="dashboard-list-subtitle">
                      {message.channel} · {new Date(message.createdAt).toLocaleString(locale)}
                    </p>
                  </div>

                  <div className="dashboard-list-meta">
                    <span>{isResolved ? copy.statusResolved : copy.statusOpen}</span>
                    <button
                      type="button"
                      className="btn secondary dashboard-inline-action"
                      disabled={isResolved || isResolving || isSigningOut}
                      onClick={() => void handleResolveContactMessage(message.id)}
                    >
                      {isResolved ? copy.resolved : isResolving ? copy.resolving : copy.resolve}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>{copy.noContactMessages}</p>
        )}
      </article>

      <button type="button" className="btn secondary dashboard-signout" onClick={() => void onSignOut()} disabled={isSigningOut}>
        {isSigningOut ? copy.signingOut : copy.signOut}
      </button>
    </>
  );
}

export function AdminDashboardPage() {
  const { locale } = useLocaleContext();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const localizedLocale: LocaleKey = locale === 'fr' ? 'fr' : 'en';
  const copy = copyByLocale[localizedLocale];

  async function handleSignOut() {
    setIsSigningOut(true);
    await logoutSession();
    navigate(`/${locale}/login`, { replace: true });
  }

  return (
    <RoleProtectedPage requiredRole="admin">
      {(session) => (
        <section className="stacked-section dashboard-shell">
          <header className="section-header dashboard-heading">
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </header>

          {session.shouldSetupTwoFactor ? <p className="dashboard-twofactor-hint">{copy.twoFactorHint}</p> : null}

          <AdminDashboardContent
            locale={locale}
            copy={copy}
            session={session}
            onSignOut={handleSignOut}
            isSigningOut={isSigningOut}
          />
        </section>
      )}
    </RoleProtectedPage>
  );
}
