import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleProtectedPage, type ProtectedSession } from '../components/role-protected-page';
import { useLocaleContext } from '../context/locale-context';
import {
  changeAccountPassword,
  disableAccountMfa,
  fetchAccountProfile,
  setupAccountMfa,
  updateAccountProfile,
  verifyAccountMfa
} from '../lib/auth-api';

type LocaleKey = 'en' | 'fr';

type AccountSettingsState = {
  role: 'admin' | 'artist';
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  expiresAt: string;
  shouldSetupTwoFactor: boolean;
};

type Copy = {
  title: string;
  subtitle: string;
  profileTitle: string;
  securityTitle: string;
  passwordTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  save: string;
  saving: string;
  saved: string;
  updatePassword: string;
  updatingPassword: string;
  passwordUpdated: string;
  invalidCurrentPassword: string;
  passwordMismatch: string;
  passwordTooShort: string;
  passwordMustDiffer: string;
  mfaDisabled: string;
  mfaEnabled: string;
  mfaStatusEnabled: string;
  mfaStatusDisabled: string;
  setupMfa: string;
  setupMfaLoading: string;
  verifyMfa: string;
  verifyMfaLoading: string;
  disableMfa: string;
  disableMfaLoading: string;
  mfaSecretLabel: string;
  mfaCodeLabel: string;
  mfaHint: string;
  sessionTitle: string;
  connectedAs: string;
  activeUntil: string;
  genericError: string;
  networkError: string;
};

const copyByLocale: Record<LocaleKey, Copy> = {
  fr: {
    title: 'Mon compte',
    subtitle: 'Reglages profil et securite.',
    profileTitle: 'Profil',
    securityTitle: 'Securite',
    passwordTitle: 'Mot de passe',
    firstName: 'Prenom',
    lastName: 'Nom',
    email: 'Email',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le nouveau mot de passe',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    saved: 'Profil mis a jour.',
    updatePassword: 'Mettre a jour le mot de passe',
    updatingPassword: 'Mise a jour...',
    passwordUpdated: 'Mot de passe mis a jour.',
    invalidCurrentPassword: 'Mot de passe actuel incorrect.',
    passwordMismatch: 'Les nouveaux mots de passe ne correspondent pas.',
    passwordTooShort: 'Le nouveau mot de passe doit contenir au moins 12 caracteres.',
    passwordMustDiffer: 'Le nouveau mot de passe doit etre different de l ancien.',
    mfaDisabled: 'MFA desactivee.',
    mfaEnabled: 'MFA activee.',
    mfaStatusEnabled: 'MFA active',
    mfaStatusDisabled: 'MFA non activee',
    setupMfa: 'Configurer MFA',
    setupMfaLoading: 'Preparation...',
    verifyMfa: 'Verifier et activer',
    verifyMfaLoading: 'Verification...',
    disableMfa: 'Desactiver MFA',
    disableMfaLoading: 'Desactivation...',
    mfaSecretLabel: 'Cle secrete',
    mfaCodeLabel: 'Code 6 chiffres',
    mfaHint: 'Scanne la cle dans ton application Authenticator, puis saisis un code pour activer.',
    sessionTitle: 'Session',
    connectedAs: 'Connecte en tant que',
    activeUntil: 'Session valide jusqu au',
    genericError: 'Impossible de mettre a jour le compte pour le moment.',
    networkError: 'Erreur reseau. Verifie l API puis reessaie.'
  },
  en: {
    title: 'My account',
    subtitle: 'Profile and security settings.',
    profileTitle: 'Profile',
    securityTitle: 'Security',
    passwordTitle: 'Password',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    save: 'Save changes',
    saving: 'Saving...',
    saved: 'Profile updated.',
    updatePassword: 'Update password',
    updatingPassword: 'Updating...',
    passwordUpdated: 'Password updated.',
    invalidCurrentPassword: 'Current password is invalid.',
    passwordMismatch: 'New passwords do not match.',
    passwordTooShort: 'New password must be at least 12 characters.',
    passwordMustDiffer: 'New password must be different from current password.',
    mfaDisabled: 'MFA disabled.',
    mfaEnabled: 'MFA enabled.',
    mfaStatusEnabled: 'MFA enabled',
    mfaStatusDisabled: 'MFA not enabled',
    setupMfa: 'Set up MFA',
    setupMfaLoading: 'Preparing...',
    verifyMfa: 'Verify and enable',
    verifyMfaLoading: 'Verifying...',
    disableMfa: 'Disable MFA',
    disableMfaLoading: 'Disabling...',
    mfaSecretLabel: 'Secret key',
    mfaCodeLabel: '6-digit code',
    mfaHint: 'Add the key to your authenticator app, then enter a code to enable MFA.',
    sessionTitle: 'Session',
    connectedAs: 'Signed in as',
    activeUntil: 'Session valid until',
    genericError: 'Unable to update account settings right now.',
    networkError: 'Network request failed. Verify API availability and retry.'
  }
};

function normalizeSettingsState(session: ProtectedSession): AccountSettingsState {
  return {
    role: session.role,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    displayName: session.displayName,
    expiresAt: session.expiresAt,
    shouldSetupTwoFactor: session.shouldSetupTwoFactor
  };
}

function AccountSettingsContent({
  locale,
  copy,
  session
}: {
  locale: string;
  copy: Copy;
  session: ProtectedSession;
}) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AccountSettingsState>(() => normalizeSettingsState(session));
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [feedback, setFeedback] = useState<
    | {
        kind: 'success' | 'error';
        message: string;
      }
    | null
  >(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const response = await fetchAccountProfile();
      if (!mounted) {
        return;
      }

      if (!response.ok) {
        if (response.status === 401) {
          const queryParams = new URLSearchParams({
            next: `/${locale}/account/settings`,
            reason: 'inactive'
          });
          navigate(`/${locale}/login?${queryParams.toString()}`, { replace: true });
          return;
        }

        setFeedback({ kind: 'error', message: copy.genericError });
        setIsLoading(false);
        return;
      }

      setSettings({
        role: response.body.role === 'admin' ? 'admin' : 'artist',
        email: typeof response.body.email === 'string' ? response.body.email : '',
        firstName: typeof response.body.firstName === 'string' ? response.body.firstName : '',
        lastName: typeof response.body.lastName === 'string' ? response.body.lastName : '',
        displayName: typeof response.body.displayName === 'string' ? response.body.displayName : '',
        expiresAt: typeof response.body.expiresAt === 'string' ? response.body.expiresAt : '',
        shouldSetupTwoFactor: response.body.shouldSetupTwoFactor === true
      });
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [copy.genericError, locale, navigate]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSavingProfile(true);

    const response = await updateAccountProfile({
      firstName: settings.firstName,
      lastName: settings.lastName,
      email: settings.email
    });

    if (!response.ok) {
      if (response.body.code === 'network_error') {
        setFeedback({ kind: 'error', message: copy.networkError });
      } else {
        setFeedback({ kind: 'error', message: copy.genericError });
      }
      setIsSavingProfile(false);
      return;
    }

    setSettings((current) => ({
      ...current,
      email: typeof response.body.email === 'string' ? response.body.email : current.email,
      firstName: typeof response.body.firstName === 'string' ? response.body.firstName : current.firstName,
      lastName: typeof response.body.lastName === 'string' ? response.body.lastName : current.lastName,
      displayName: typeof response.body.displayName === 'string' ? response.body.displayName : current.displayName,
      expiresAt: typeof response.body.expiresAt === 'string' ? response.body.expiresAt : current.expiresAt,
      shouldSetupTwoFactor: response.body.shouldSetupTwoFactor === true
    }));
    setFeedback({ kind: 'success', message: copy.saved });
    setIsSavingProfile(false);
  }

  async function handleSetupMfa() {
    setFeedback(null);
    setIsSettingUpMfa(true);

    const response = await setupAccountMfa();
    if (!response.ok) {
      setFeedback({ kind: 'error', message: copy.genericError });
      setIsSettingUpMfa(false);
      return;
    }

    setMfaSecret(typeof response.body.secret === 'string' ? response.body.secret : '');
    setIsSettingUpMfa(false);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (passwordValues.newPassword.length < 12) {
      setFeedback({ kind: 'error', message: copy.passwordTooShort });
      return;
    }

    if (passwordValues.newPassword !== passwordValues.confirmPassword) {
      setFeedback({ kind: 'error', message: copy.passwordMismatch });
      return;
    }

    if (passwordValues.currentPassword === passwordValues.newPassword) {
      setFeedback({ kind: 'error', message: copy.passwordMustDiffer });
      return;
    }

    setIsChangingPassword(true);
    const response = await changeAccountPassword({
      currentPassword: passwordValues.currentPassword,
      newPassword: passwordValues.newPassword
    });

    if (!response.ok) {
      if (response.body.code === 'invalid_current_password') {
        setFeedback({ kind: 'error', message: copy.invalidCurrentPassword });
      } else if (response.body.code === 'network_error') {
        setFeedback({ kind: 'error', message: copy.networkError });
      } else if (response.body.code === 'validation_error') {
        setFeedback({ kind: 'error', message: copy.passwordMustDiffer });
      } else {
        setFeedback({ kind: 'error', message: copy.genericError });
      }

      setIsChangingPassword(false);
      return;
    }

    setPasswordValues({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setFeedback({ kind: 'success', message: copy.passwordUpdated });
    setIsChangingPassword(false);
  }

  async function handleVerifyMfa() {
    setFeedback(null);
    setIsVerifyingMfa(true);

    const response = await verifyAccountMfa(mfaCode);
    if (!response.ok) {
      setFeedback({ kind: 'error', message: copy.genericError });
      setIsVerifyingMfa(false);
      return;
    }

    setSettings((current) => ({ ...current, shouldSetupTwoFactor: false }));
    setMfaCode('');
    setMfaSecret('');
    setFeedback({ kind: 'success', message: copy.mfaEnabled });
    setIsVerifyingMfa(false);
  }

  async function handleDisableMfa() {
    setFeedback(null);
    setIsDisablingMfa(true);

    const response = await disableAccountMfa();
    if (!response.ok) {
      setFeedback({ kind: 'error', message: copy.genericError });
      setIsDisablingMfa(false);
      return;
    }

    setSettings((current) => ({ ...current, shouldSetupTwoFactor: true }));
    setFeedback({ kind: 'success', message: copy.mfaDisabled });
    setIsDisablingMfa(false);
  }

  const isMfaEnabled = settings.shouldSetupTwoFactor !== true;

  if (isLoading) {
    return (
      <section className="stacked-section dashboard-shell">
        <div className="card dashboard-card">
          <p>{locale === 'fr' ? 'Chargement du compte...' : 'Loading account...'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="stacked-section account-shell">
      <header className="section-header account-heading">
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>

      <div className="dashboard-layout">
        <article className="card dashboard-card">
          <h2>{copy.sessionTitle}</h2>
          <p>
            {copy.connectedAs} {settings.email}
          </p>
          {settings.expiresAt ? (
            <p>
              {copy.activeUntil} {new Date(settings.expiresAt).toLocaleString(locale)}
            </p>
          ) : null}
        </article>

        <article className="card dashboard-card">
          <h2>{copy.securityTitle}</h2>
          <p>{isMfaEnabled ? copy.mfaStatusEnabled : copy.mfaStatusDisabled}</p>
          {isMfaEnabled ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => void handleDisableMfa()}
              disabled={isDisablingMfa}
            >
              {isDisablingMfa ? copy.disableMfaLoading : copy.disableMfa}
            </button>
          ) : null}
        </article>
      </div>

      <form className="card join-form account-form" onSubmit={handleProfileSubmit}>
        <header className="join-form-section-header">
          <h2>{copy.profileTitle}</h2>
        </header>

        <div className="form-grid">
          <label>
            <span>{copy.firstName}</span>
            <input
              type="text"
              value={settings.firstName}
              maxLength={80}
              onChange={(event) =>
                setSettings((current) => ({ ...current, firstName: event.target.value }))
              }
            />
          </label>
          <label>
            <span>{copy.lastName}</span>
            <input
              type="text"
              value={settings.lastName}
              maxLength={80}
              onChange={(event) => setSettings((current) => ({ ...current, lastName: event.target.value }))}
            />
          </label>
          <label className="full-width">
            <span>{copy.email}</span>
            <input
              type="email"
              required
              value={settings.email}
              onChange={(event) => setSettings((current) => ({ ...current, email: event.target.value }))}
            />
          </label>
        </div>

        <button type="submit" className="btn primary" disabled={isSavingProfile}>
          {isSavingProfile ? copy.saving : copy.save}
        </button>
      </form>

      <form className="card join-form account-form account-password-form" onSubmit={handlePasswordSubmit}>
        <header className="join-form-section-header">
          <h2>{copy.passwordTitle}</h2>
        </header>

        <div className="form-grid">
          <label>
            <span>{copy.currentPassword}</span>
            <input
              type="password"
              required
              minLength={12}
              autoComplete="current-password"
              value={passwordValues.currentPassword}
              onChange={(event) =>
                setPasswordValues((current) => ({ ...current, currentPassword: event.target.value }))
              }
            />
          </label>
          <label>
            <span>{copy.newPassword}</span>
            <input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={passwordValues.newPassword}
              onChange={(event) =>
                setPasswordValues((current) => ({ ...current, newPassword: event.target.value }))
              }
            />
          </label>
          <label className="full-width">
            <span>{copy.confirmPassword}</span>
            <input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={passwordValues.confirmPassword}
              onChange={(event) =>
                setPasswordValues((current) => ({ ...current, confirmPassword: event.target.value }))
              }
            />
          </label>
        </div>

        <button type="submit" className="btn primary" disabled={isChangingPassword}>
          {isChangingPassword ? copy.updatingPassword : copy.updatePassword}
        </button>
      </form>

      {!isMfaEnabled ? (
        <article className="card dashboard-card account-mfa-setup">
          <h2>{copy.securityTitle}</h2>
          <p>{copy.mfaHint}</p>

          {mfaSecret ? (
            <>
              <p>
                <strong>{copy.mfaSecretLabel}</strong>: <code>{mfaSecret}</code>
              </p>
              <label className="account-mfa-code">
                <span>{copy.mfaCodeLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))}
                />
              </label>
              <button
                type="button"
                className="btn primary"
                disabled={mfaCode.length !== 6 || isVerifyingMfa}
                onClick={() => void handleVerifyMfa()}
              >
                {isVerifyingMfa ? copy.verifyMfaLoading : copy.verifyMfa}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn secondary"
              disabled={isSettingUpMfa}
              onClick={() => void handleSetupMfa()}
            >
              {isSettingUpMfa ? copy.setupMfaLoading : copy.setupMfa}
            </button>
          )}
        </article>
      ) : null}

      {feedback ? (
        <p className={`form-status ${feedback.kind === 'success' ? 'success' : 'error'}`}>{feedback.message}</p>
      ) : null}
    </section>
  );
}

export function AccountSettingsPage() {
  const { locale } = useLocaleContext();
  const localizedLocale: LocaleKey = locale === 'fr' ? 'fr' : 'en';
  const copy = copyByLocale[localizedLocale];

  return (
    <RoleProtectedPage>
      {(session) => <AccountSettingsContent locale={locale} copy={copy} session={session} />}
    </RoleProtectedPage>
  );
}
