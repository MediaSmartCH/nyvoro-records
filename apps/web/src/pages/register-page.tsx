import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocaleContext } from '../context/locale-context';
import { submitRegister, type RegisterInput } from '../lib/auth-api';

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

type RegisterFormValues = RegisterInput & {
  confirmPassword: string;
};

const initialValues: RegisterFormValues = {
  role: 'artist',
  email: '',
  password: '',
  confirmPassword: '',
  honeypot: '',
  turnstileToken: ''
};

const copyByLocale: Record<
  LocaleKey,
  {
    title: string;
    subtitle: string;
    emailLabel: string;
    passwordLabel: string;
    confirmPasswordLabel: string;
    submit: string;
    submitting: string;
    loginText: string;
    loginCta: string;
    success: string;
    captchaBypassed: string;
    errors: {
      passwordMismatch: string;
      weakPassword: string;
      accountExists: string;
      generic: string;
      captcha: string;
      rateLimited: string;
      network: string;
    };
  }
> = {
  fr: {
    title: 'Create account',
    subtitle: 'Cree un compte artiste pour acceder a l espace prive.',
    emailLabel: 'Email',
    passwordLabel: 'Mot de passe (12 caracteres min)',
    confirmPasswordLabel: 'Confirmation du mot de passe',
    submit: 'Creer le compte',
    submitting: 'Creation...',
    loginText: 'Tu as deja un compte ?',
    loginCta: 'Aller au login',
    success: 'Compte cree avec succes. Tu peux maintenant te connecter.',
    captchaBypassed: 'Verification anti-bot desactivee en environnement local.',
    errors: {
      passwordMismatch: 'Les mots de passe ne correspondent pas.',
      weakPassword: 'Le mot de passe doit contenir au moins 12 caracteres.',
      accountExists: 'Un compte existe deja pour ce role et cet email.',
      generic: 'Creation du compte impossible pour le moment.',
      captcha: 'Verification anti-bot invalide. Recharge le challenge.',
      rateLimited: 'Trop de tentatives. Reessaie dans quelques minutes.',
      network: 'Connexion reseau impossible. Verifie l API puis reessaie.'
    }
  },
  en: {
    title: 'Create account',
    subtitle: 'Create an artist account to access private workspace pages.',
    emailLabel: 'Email',
    passwordLabel: 'Password (minimum 12 characters)',
    confirmPasswordLabel: 'Confirm password',
    submit: 'Create account',
    submitting: 'Creating...',
    loginText: 'Already have an account?',
    loginCta: 'Go to login',
    success: 'Account created successfully. You can now sign in.',
    captchaBypassed: 'Bot verification is disabled in local development.',
    errors: {
      passwordMismatch: 'Passwords do not match.',
      weakPassword: 'Password must contain at least 12 characters.',
      accountExists: 'An account already exists for this role and email.',
      generic: 'Account creation failed for now.',
      captcha: 'Bot verification failed. Reload the challenge.',
      rateLimited: 'Too many attempts. Try again in a few minutes.',
      network: 'Network request failed. Verify API availability and retry.'
    }
  }
};

export function RegisterPage() {
  const { locale } = useLocaleContext();
  const localizedLocale: LocaleKey = locale === 'fr' ? 'fr' : 'en';
  const copy = copyByLocale[localizedLocale];

  const [values, setValues] = useState<RegisterFormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    | {
        kind: 'success' | 'error';
        message: string;
      }
    | null
  >(null);

  const turnstileSiteKey =
    import.meta.env.VITE_TURNSTILE_SITE_KEY ?? 'turnstile_site_key_placeholder';
  const isTurnstileBypassed =
    import.meta.env.DEV ||
    import.meta.env.MODE === 'development' ||
    import.meta.env.VITE_TURNSTILE_BYPASS === 'true' ||
    turnstileSiteKey.includes('placeholder');

  function updateField<Key extends keyof RegisterFormValues>(field: Key, value: RegisterFormValues[Key]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    if (isTurnstileBypassed) {
      setValues((current) => ({ ...current, turnstileToken: 'dev_bypass_token_1234567890' }));
      return;
    }

    const renderWidget = () => {
      window.turnstile?.render('#nyvoro-register-turnstile', {
        sitekey: turnstileSiteKey,
        callback: (token) => setValues((current) => ({ ...current, turnstileToken: token }))
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-nyvoro-register-turnstile]');
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
    script.dataset.nyvoroRegisterTurnstile = 'true';
    script.onload = renderWidget;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [isTurnstileBypassed, turnstileSiteKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (values.password.length < 12) {
      setFeedback({ kind: 'error', message: copy.errors.weakPassword });
      return;
    }

    if (values.password !== values.confirmPassword) {
      setFeedback({ kind: 'error', message: copy.errors.passwordMismatch });
      return;
    }

    setIsSubmitting(true);

    const response = await submitRegister({
      role: values.role,
      email: values.email,
      password: values.password,
      honeypot: values.honeypot,
      turnstileToken: values.turnstileToken
    });

    if (!response.ok) {
      if (response.body.code === 'captcha_invalid') {
        setFeedback({ kind: 'error', message: copy.errors.captcha });
      } else if (response.body.code === 'auth_rate_limited') {
        setFeedback({ kind: 'error', message: copy.errors.rateLimited });
      } else if (response.body.code === 'network_error') {
        setFeedback({ kind: 'error', message: copy.errors.network });
      } else if (response.body.code === 'account_exists') {
        setFeedback({ kind: 'error', message: copy.errors.accountExists });
      } else {
        setFeedback({ kind: 'error', message: copy.errors.generic });
      }
      setIsSubmitting(false);
      return;
    }

    setFeedback({ kind: 'success', message: copy.success });
    setValues({
      ...initialValues,
      role: values.role,
      turnstileToken: isTurnstileBypassed ? 'dev_bypass_token_1234567890' : ''
    });
    window.turnstile?.reset();
    setIsSubmitting(false);
  }

  return (
    <section className="stacked-section register-shell">
      <header className="section-header login-heading">
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>

      <form className="card register-form" onSubmit={handleSubmit}>
        <div className="login-fields register-fields">
          <label className="login-field">
            <span>{copy.emailLabel}</span>
            <input
              type="email"
              required
              autoComplete="email"
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
              autoComplete="new-password"
              value={values.password}
              onChange={(event) => updateField('password', event.target.value)}
            />
          </label>

          <label className="login-field">
            <span>{copy.confirmPasswordLabel}</span>
            <input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
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
            <div id="nyvoro-register-turnstile" />
          </div>
        )}

        <button type="submit" className="btn primary" disabled={isSubmitting}>
          {isSubmitting ? copy.submitting : copy.submit}
        </button>

        {feedback ? (
          <p className={`form-status ${feedback.kind === 'success' ? 'success' : 'error'}`}>
            {feedback.message}
          </p>
        ) : null}

        <p className="login-register-link">
          {copy.loginText} <Link to={`/${locale}/login`}>{copy.loginCta}</Link>
        </p>
      </form>
    </section>
  );
}
