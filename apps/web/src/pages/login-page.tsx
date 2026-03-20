import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLocaleContext } from '../context/locale-context';
import {
  fetchSession,
  logoutSession,
  submitLogin,
  verifyLoginMfa,
  type AuthRole,
  type LoginInput
} from '../lib/auth-api';

declare global {
  interface Window {
    turnstile?: {
      render: (
        selector: string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type LocaleKey = 'en' | 'fr';

type SessionState = {
  role: AuthRole;
  email: string;
  expiresAt: string;
  shouldSetupTwoFactor: boolean;
};

type PendingMfaChallenge = {
  role: 'admin';
  email: string;
  mfaToken: string;
};

const initialValues: LoginInput = {
  email: '',
  password: '',
  honeypot: '',
  turnstileToken: ''
};

const copyByLocale: Record<
  LocaleKey,
  {
    title: string;
    subtitle: string;
    roles: Record<AuthRole, string>;
    emailLabel: string;
    passwordLabel: string;
    mfaTitle: string;
    mfaSubtitle: string;
    mfaCodeLabel: string;
    submit: string;
    submitting: string;
    verifyMfa: string;
    verifyingMfa: string;
    restartLogin: string;
    createAccount: string;
    createAccountCta: string;
    sessionTitle: string;
    activeUntil: string;
    logout: string;
    noSession: string;
    twoFactorHint: string;
    captchaBypassed: string;
    sessionExpiredNotice: string;
    errors: {
      generic: string;
      captcha: string;
      rateLimited: string;
      invalidTotp: string;
      mfaExpired: string;
      network: string;
    };
    success: string;
  }
> = {
  fr: {
    title: 'Login',
    subtitle: 'Connecte-toi avec ton email et ton mot de passe. Le bon espace sera detecte automatiquement.',
    roles: {
      admin: 'Admin',
      artist: 'Artiste'
    },
    emailLabel: 'Email',
    passwordLabel: 'Mot de passe',
    mfaTitle: 'Verification MFA admin',
    mfaSubtitle: 'Saisis le code a 6 chiffres de ton application Authenticator pour finaliser la connexion.',
    mfaCodeLabel: 'Code 6 chiffres',
    submit: 'Sign in',
    submitting: 'Connexion...',
    verifyMfa: 'Verifier le code',
    verifyingMfa: 'Verification...',
    restartLogin: 'Revenir au login',
    createAccount: 'Pas encore de compte ?',
    createAccountCta: 'Creer un compte',
    sessionTitle: 'Session active',
    activeUntil: 'Expire le',
    logout: 'Se deconnecter',
    noSession: 'Aucune session active.',
    twoFactorHint:
      '2FA reste optionnelle pour les artistes, mais les admins avec MFA activee doivent verifier un code a la connexion.',
    captchaBypassed: 'Verification anti-bot desactivee en environnement local.',
    sessionExpiredNotice:
      'Ta session a expire apres une longue inactivite. Merci de te reconnecter.',
    errors: {
      generic: 'Connexion refusee. Verifie ton email et ton mot de passe.',
      captcha: 'Verification anti-bot invalide. Recharge le challenge puis reessaie.',
      rateLimited: 'Trop de tentatives. Reessaie dans quelques minutes.',
      invalidTotp: 'Code MFA invalide. Reessaie avec un code a 6 chiffres valide.',
      mfaExpired: 'Le challenge MFA a expire. Recommence la connexion.',
      network: 'Connexion reseau impossible. Verifie l API puis reessaie.'
    },
    success: 'Connexion reussie.'
  },
  en: {
    title: 'Login',
    subtitle: 'Sign in with your email and password. The correct workspace will be detected automatically.',
    roles: {
      admin: 'Admin',
      artist: 'Artist'
    },
    emailLabel: 'Email',
    passwordLabel: 'Password',
    mfaTitle: 'Admin MFA verification',
    mfaSubtitle: 'Enter the 6-digit code from your authenticator app to complete sign-in.',
    mfaCodeLabel: '6-digit code',
    submit: 'Sign in',
    submitting: 'Signing in...',
    verifyMfa: 'Verify code',
    verifyingMfa: 'Verifying...',
    restartLogin: 'Back to login',
    createAccount: 'Need an account?',
    createAccountCta: 'Create account',
    sessionTitle: 'Active session',
    activeUntil: 'Expires on',
    logout: 'Sign out',
    noSession: 'No active session.',
    twoFactorHint:
      '2FA remains optional for artists, but admins with MFA enabled must verify a code during sign-in.',
    captchaBypassed: 'Bot verification is disabled in local development.',
    sessionExpiredNotice: 'Session expired due to inactivity. Please sign in again.',
    errors: {
      generic: 'Login denied. Check your email and password.',
      captcha: 'Bot verification failed. Refresh the challenge and retry.',
      rateLimited: 'Too many attempts. Try again in a few minutes.',
      invalidTotp: 'Invalid MFA code. Retry with a valid 6-digit code.',
      mfaExpired: 'The MFA challenge expired. Restart the login flow.',
      network: 'Network request failed. Verify API availability and retry.'
    },
    success: 'Login successful.'
  }
};

function resolveDefaultDashboardPath(locale: string, role: AuthRole): string {
  return `/${locale}/${role}/dashboard`;
}

function resolvePostLoginPath(input: { locale: string; role: AuthRole; search: string }): string {
  const defaultDashboardPath = resolveDefaultDashboardPath(input.locale, input.role);
  const params = new URLSearchParams(input.search);
  const nextPath = params.get('next');

  if (!nextPath) {
    return defaultDashboardPath;
  }

  if (!nextPath.startsWith(`/${input.locale}/`) || nextPath.startsWith('//')) {
    return defaultDashboardPath;
  }

  if (nextPath.startsWith(`/${input.locale}/admin`) && input.role !== 'admin') {
    return defaultDashboardPath;
  }

  if (nextPath.startsWith(`/${input.locale}/artist`) && input.role !== 'artist') {
    return defaultDashboardPath;
  }

  return nextPath;
}

export function LoginPage() {
  const { locale } = useLocaleContext();
  const navigate = useNavigate();
  const location = useLocation();
  const localizedLocale: LocaleKey = locale === 'fr' ? 'fr' : 'en';
  const copy = copyByLocale[localizedLocale];

  const [values, setValues] = useState<LoginInput>(initialValues);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [pendingMfaChallenge, setPendingMfaChallenge] = useState<PendingMfaChallenge | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [feedback, setFeedback] = useState<
    | {
        kind: 'success' | 'error';
        message: string;
      }
    | null
  >(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const turnstileSiteKey =
    import.meta.env.VITE_TURNSTILE_SITE_KEY ?? 'turnstile_site_key_placeholder';
  const isTurnstileBypassed =
    import.meta.env.DEV ||
    import.meta.env.MODE === 'development' ||
    import.meta.env.VITE_TURNSTILE_BYPASS === 'true' ||
    turnstileSiteKey.includes('placeholder');
  const isMfaStep = pendingMfaChallenge !== null;

  function updateField<Key extends keyof LoginInput>(field: Key, value: LoginInput[Key]) {
    if (pendingMfaChallenge) {
      setPendingMfaChallenge(null);
      setMfaCode('');
    }

    setValues((current) => ({ ...current, [field]: value }));
  }

  function resetMfaChallenge() {
    setPendingMfaChallenge(null);
    setMfaCode('');
  }

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const response = await fetchSession();

      if (!mounted) {
        return;
      }

      if (response.ok && response.body.authenticated) {
        const authenticatedRole = response.body.role === 'admin' ? 'admin' : 'artist';

        setSession({
          role: authenticatedRole,
          email: typeof response.body.email === 'string' ? response.body.email : '',
          expiresAt: typeof response.body.expiresAt === 'string' ? response.body.expiresAt : '',
          shouldSetupTwoFactor: response.body.shouldSetupTwoFactor === true
        });

        setIsCheckingSession(false);
        navigate(
          resolvePostLoginPath({
            locale,
            role: authenticatedRole,
            search: location.search
          }),
          { replace: true }
        );
        return;
      }

      setIsCheckingSession(false);
    })();

    return () => {
      mounted = false;
    };
  }, [locale, location.search, navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('reason') === 'inactive') {
      setSessionNotice(copy.sessionExpiredNotice);
      return;
    }

    setSessionNotice(null);
  }, [copy.sessionExpiredNotice, location.search]);

  useEffect(() => {
    if (isTurnstileBypassed) {
      setValues((current) => ({ ...current, turnstileToken: 'dev_bypass_token_1234567890' }));
      return;
    }

    const renderWidget = () => {
      window.turnstile?.render('#nyvoro-login-turnstile', {
        sitekey: turnstileSiteKey,
        callback: (token) => setValues((current) => ({ ...current, turnstileToken: token }))
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-nyvoro-login-turnstile]');
    if (existingScript) {
      existingScript.addEventListener('load', renderWidget, { once: true });
      return () => {
        existingScript.removeEventListener('load', renderWidget);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.nyvoroLoginTurnstile = 'true';
    script.onload = renderWidget;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [isTurnstileBypassed, turnstileSiteKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    if (pendingMfaChallenge) {
      const response = await verifyLoginMfa({
        mfaToken: pendingMfaChallenge.mfaToken,
        code: mfaCode
      });

      if (!response.ok) {
        if (response.body.code === 'invalid_totp_code') {
          setFeedback({ kind: 'error', message: copy.errors.invalidTotp });
        } else if (response.body.code === 'mfa_token_expired' || response.body.code === 'mfa_token_invalid') {
          resetMfaChallenge();
          setFeedback({ kind: 'error', message: copy.errors.mfaExpired });
        } else if (response.body.code === 'network_error') {
          setFeedback({ kind: 'error', message: copy.errors.network });
        } else {
          setFeedback({ kind: 'error', message: copy.errors.generic });
        }

        setIsSubmitting(false);
        return;
      }

      if (response.body.status !== 'ok') {
        setFeedback({ kind: 'error', message: copy.errors.generic });
        setIsSubmitting(false);
        return;
      }

      setSession({
        role: 'admin',
        email: typeof response.body.email === 'string' ? response.body.email : pendingMfaChallenge.email,
        expiresAt: typeof response.body.expiresAt === 'string' ? response.body.expiresAt : '',
        shouldSetupTwoFactor: response.body.shouldSetupTwoFactor === true
      });
      resetMfaChallenge();
      setFeedback({ kind: 'success', message: copy.success });
      setIsSubmitting(false);
      navigate(
        resolvePostLoginPath({
          locale,
          role: 'admin',
          search: location.search
        }),
        { replace: true }
      );
      return;
    }

    const response = await submitLogin(values);

    if (!response.ok) {
      if (response.body.code === 'captcha_invalid') {
        setFeedback({ kind: 'error', message: copy.errors.captcha });
      } else if (response.body.code === 'auth_rate_limited') {
        setFeedback({ kind: 'error', message: copy.errors.rateLimited });
      } else if (response.body.code === 'network_error') {
        setFeedback({ kind: 'error', message: copy.errors.network });
      } else {
        setFeedback({ kind: 'error', message: copy.errors.generic });
      }
      setIsSubmitting(false);
      return;
    }

    if (response.body.status === 'mfa_required') {
      if (typeof response.body.mfaToken !== 'string' || response.body.mfaToken.length === 0) {
        setFeedback({ kind: 'error', message: copy.errors.generic });
        setIsSubmitting(false);
        return;
      }

      setPendingMfaChallenge({
        role: 'admin',
        email: typeof response.body.email === 'string' ? response.body.email : values.email,
        mfaToken: response.body.mfaToken
      });
      setMfaCode('');
      setFeedback(null);
      setIsSubmitting(false);
      return;
    }

    if (response.body.status !== 'ok') {
      setFeedback({ kind: 'error', message: copy.errors.generic });
      setIsSubmitting(false);
      return;
    }

    const authenticatedRole = response.body.role === 'admin' ? 'admin' : 'artist';

    setSession({
      role: authenticatedRole,
      email: typeof response.body.email === 'string' ? response.body.email : values.email,
      expiresAt: typeof response.body.expiresAt === 'string' ? response.body.expiresAt : '',
      shouldSetupTwoFactor: response.body.shouldSetupTwoFactor === true
    });

    setFeedback({ kind: 'success', message: copy.success });
    setValues((current) => ({
      ...current,
      password: '',
      turnstileToken: isTurnstileBypassed ? 'dev_bypass_token_1234567890' : ''
    }));
    window.turnstile?.reset();
    setIsSubmitting(false);
    navigate(
      resolvePostLoginPath({
        locale,
        role: authenticatedRole,
        search: location.search
      }),
      { replace: true }
    );
  }

  async function handleLogout() {
    setIsSubmitting(true);
    await logoutSession();
    setSession(null);
    setFeedback(null);
    setIsSubmitting(false);
  }

  const submitDisabled =
    isCheckingSession ||
    isSubmitting ||
    (isMfaStep
      ? mfaCode.length !== 6
      : values.email.trim().length === 0 ||
        values.password.length < 12 ||
        (!isTurnstileBypassed && values.turnstileToken.trim().length < 10));

  return (
    <section className="stacked-section login-shell">
      <header className="section-header login-heading">
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>

      <div className="login-layout">
        <form className="card login-form" onSubmit={handleSubmit}>
          {isMfaStep ? (
            <div className="login-fields register-fields">
              <div className="login-field">
                <span>{copy.mfaTitle}</span>
                <p>{copy.mfaSubtitle}</p>
                <p>
                  <strong>{pendingMfaChallenge?.email}</strong>
                </p>
              </div>

              <label className="login-field">
                <span>{copy.mfaCodeLabel}</span>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))}
                />
              </label>
            </div>
          ) : (
            <>
              <div className="login-fields">
                <label className="login-field">
                  <span>{copy.emailLabel}</span>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={values.email}
                    onChange={(event) => updateField('email', event.target.value)}
                  />
                </label>

                <label className="login-field">
                  <span>{copy.passwordLabel}</span>
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="current-password"
                    value={values.password}
                    onChange={(event) => updateField('password', event.target.value)}
                  />
                </label>
              </div>

              <label className="honeypot" aria-hidden="true">
                Bot trap
                <input
                  type="text"
                  autoComplete="off"
                  tabIndex={-1}
                  value={values.honeypot}
                  onChange={(event) => updateField('honeypot', event.target.value)}
                />
              </label>

              {isTurnstileBypassed ? (
                <div className="login-captcha login-captcha-bypass">
                  <p>{copy.captchaBypassed}</p>
                </div>
              ) : (
                <div className="captcha-wrapper login-captcha">
                  <div id="nyvoro-login-turnstile" />
                </div>
              )}
            </>
          )}

          <button type="submit" className="btn primary" disabled={submitDisabled}>
            {isSubmitting
              ? isMfaStep
                ? copy.verifyingMfa
                : copy.submitting
              : isMfaStep
                ? copy.verifyMfa
                : copy.submit}
          </button>

          {isMfaStep ? (
            <button
              type="button"
              className="btn secondary"
              disabled={isSubmitting}
              onClick={() => {
                resetMfaChallenge();
                setFeedback(null);
              }}
            >
              {copy.restartLogin}
            </button>
          ) : null}

          {sessionNotice ? <p className="form-status warning">{sessionNotice}</p> : null}

          {feedback ? (
            <p className={`form-status ${feedback.kind === 'success' ? 'success' : 'error'}`}>
              {feedback.message}
            </p>
          ) : null}

          <p className="login-register-link">
            {copy.createAccount}{' '}
            <Link to={`/${locale}/register`}>{copy.createAccountCta}</Link>
          </p>
        </form>

        <aside className="card login-session-card">
          <h2>{copy.sessionTitle}</h2>

          {session ? (
            <>
              <p>
                {copy.roles[session.role]} · {session.email}
              </p>
              {session.expiresAt ? (
                <p>
                  {copy.activeUntil} {new Date(session.expiresAt).toLocaleString(locale)}
                </p>
              ) : null}

              {session.shouldSetupTwoFactor ? (
                <p className="login-twofactor-hint">{copy.twoFactorHint}</p>
              ) : null}

              <button type="button" className="btn secondary" onClick={handleLogout} disabled={isSubmitting}>
                {copy.logout}
              </button>
            </>
          ) : (
            <p>{copy.noSession}</p>
          )}
        </aside>
      </div>
    </section>
  );
}
