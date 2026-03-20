import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleProtectedPage } from '../components/role-protected-page';
import { useLocaleContext } from '../context/locale-context';
import { logoutSession } from '../lib/auth-api';

type LocaleKey = 'en' | 'fr';

const copyByLocale: Record<
  LocaleKey,
  {
    title: string;
    subtitle: string;
    workspace: string;
    quickActions: string;
    connectedAs: string;
    activeUntil: string;
    twoFactorHint: string;
    actions: string[];
    signOut: string;
    signingOut: string;
  }
> = {
  fr: {
    title: 'Dashboard artiste',
    subtitle: 'Ton espace pour piloter releases et contenus.',
    workspace: 'Session',
    quickActions: 'Acces rapides',
    connectedAs: 'Connecte en tant que',
    activeUntil: 'Session valide jusqu au',
    twoFactorHint:
      '2FA est fortement recommande apres la premiere connexion. Tu peux l activer plus tard sans blocage.',
    actions: ['Mettre a jour ton profil artiste', 'Preparer la prochaine sortie', 'Suivre tes liens de diffusion'],
    signOut: 'Se deconnecter',
    signingOut: 'Deconnexion...'
  },
  en: {
    title: 'Artist dashboard',
    subtitle: 'Your workspace to manage releases and private content.',
    workspace: 'Session',
    quickActions: 'Quick actions',
    connectedAs: 'Signed in as',
    activeUntil: 'Session valid until',
    twoFactorHint:
      '2FA is strongly recommended after your first login. You can enable it later without being blocked.',
    actions: ['Update your artist profile', 'Prepare your next release', 'Track your streaming links'],
    signOut: 'Sign out',
    signingOut: 'Signing out...'
  }
};

export function ArtistDashboardPage() {
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
    <RoleProtectedPage requiredRole="artist">
      {(session) => (
        <section className="stacked-section dashboard-shell">
          <header className="section-header dashboard-heading">
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </header>

          {session.shouldSetupTwoFactor ? (
            <p className="dashboard-twofactor-hint">{copy.twoFactorHint}</p>
          ) : null}

          <div className="dashboard-layout">
            <article className="card dashboard-card">
              <h2>{copy.workspace}</h2>
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
              <h2>{copy.quickActions}</h2>
              <ul className="dashboard-actions">
                {copy.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </article>
          </div>

          <button type="button" className="btn secondary dashboard-signout" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? copy.signingOut : copy.signOut}
          </button>
        </section>
      )}
    </RoleProtectedPage>
  );
}
