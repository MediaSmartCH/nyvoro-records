import { FormEvent, useEffect, useState } from 'react';
import { useLocaleContext } from '../context/locale-context';
import { submitJoinApplication, type JoinFormState } from '../lib/join-api';

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

const initialState: JoinFormState = {
  legalName: '',
  artistName: '',
  email: '',
  phone: '',
  city: '',
  country: '',
  projectType: 'solo',
  yearsActive: '',
  primaryGenre: '',
  secondaryGenres: '',
  instagram: '',
  tiktok: '',
  youtube: '',
  x: '',
  website: '',
  spotify: '',
  appleMusic: '',
  soundCloud: '',
  deezer: '',
  beatport: '',
  notableReleases: '',
  releaseSummary: '',
  monthlyListeners: '',
  totalFollowers: '',
  averageStreamsPerRelease: '',
  topMarkets: '',
  monthlyMarketingBudgetEur: '',
  productionBudgetPerTrackEur: '',
  teamDescription: '',
  releaseFrequency: '',
  roadmap90Days: '',
  goals12Months: '',
  whyNyvoro: '',
  message: '',
  consent: false,
  honeypot: '',
  turnstileToken: ''
};

export function JoinPage() {
  const { locale, messages } = useLocaleContext();
  const [values, setValues] = useState<JoinFormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'stored' | 'error' | 'captcha'>('idle');

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? 'turnstile_site_key_placeholder';

  useEffect(() => {
    if (turnstileSiteKey.includes('placeholder')) {
      setValues((current) => ({ ...current, turnstileToken: 'dev_bypass_token_1234567890' }));
      return;
    }

    if (window.turnstile) {
      window.turnstile.render('#nyvoro-turnstile', {
        sitekey: turnstileSiteKey,
        callback: (token) => setValues((current) => ({ ...current, turnstileToken: token }))
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.turnstile?.render('#nyvoro-turnstile', {
        sitekey: turnstileSiteKey,
        callback: (token) => setValues((current) => ({ ...current, turnstileToken: token }))
      });
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [turnstileSiteKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');

    const response = await submitJoinApplication({ locale, values });

    if (!response.ok) {
      if (response.body?.code === 'captcha_invalid') {
        setStatus('captcha');
      } else {
        setStatus('error');
      }
      return;
    }

    if (response.body.status === 'stored_with_email_error') {
      setStatus('stored');
    } else {
      setStatus('success');
    }

    setValues({
      ...initialState,
      turnstileToken: turnstileSiteKey.includes('placeholder') ? 'dev_bypass_token_1234567890' : ''
    });
    window.turnstile?.reset();
  }

  return (
    <section className="stacked-section">
      <header className="section-header">
        <h1>{messages.join.title}</h1>
        <p>{messages.join.subtitle}</p>
      </header>

      <form className="card join-form" onSubmit={handleSubmit}>
        <p className="form-note">
          {locale === 'fr'
            ? 'Plus ta candidature est précise, plus notre retour sera rapide.'
            : 'The more precise your application is, the faster we can review it.'}
        </p>
        <div className="form-grid">
          <label>
            {messages.joinFields.legalName}
            <input
              required
              value={values.legalName}
              onChange={(event) => setValues((state) => ({ ...state, legalName: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.artistName}
            <input
              required
              value={values.artistName}
              onChange={(event) => setValues((state) => ({ ...state, artistName: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.email}
            <input
              type="email"
              required
              value={values.email}
              onChange={(event) => setValues((state) => ({ ...state, email: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.phone}
            <input
              value={values.phone}
              onChange={(event) => setValues((state) => ({ ...state, phone: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.city}
            <input
              required
              value={values.city}
              onChange={(event) => setValues((state) => ({ ...state, city: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.country}
            <input
              required
              value={values.country}
              onChange={(event) => setValues((state) => ({ ...state, country: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.projectType}
            <select
              value={values.projectType}
              onChange={(event) =>
                setValues((state) => ({
                  ...state,
                  projectType: event.target.value as JoinFormState['projectType']
                }))
              }
            >
              <option value="solo">Solo</option>
              <option value="duo">Duo</option>
              <option value="band">Band</option>
              <option value="producer">Producer</option>
              <option value="dj">DJ</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            {messages.joinFields.yearsActive}
            <input
              type="number"
              min={0}
              required
              value={values.yearsActive}
              onChange={(event) => setValues((state) => ({ ...state, yearsActive: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.primaryGenre}
            <input
              required
              value={values.primaryGenre}
              onChange={(event) => setValues((state) => ({ ...state, primaryGenre: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.secondaryGenres}
            <input
              required
              value={values.secondaryGenres}
              onChange={(event) =>
                setValues((state) => ({ ...state, secondaryGenres: event.target.value }))
              }
            />
          </label>
          <label>
            {messages.joinFields.instagram}
            <input
              type="url"
              value={values.instagram}
              onChange={(event) => setValues((state) => ({ ...state, instagram: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.tiktok}
            <input
              type="url"
              value={values.tiktok}
              onChange={(event) => setValues((state) => ({ ...state, tiktok: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.youtube}
            <input
              type="url"
              value={values.youtube}
              onChange={(event) => setValues((state) => ({ ...state, youtube: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.x}
            <input
              type="url"
              value={values.x}
              onChange={(event) => setValues((state) => ({ ...state, x: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.website}
            <input
              type="url"
              value={values.website}
              onChange={(event) => setValues((state) => ({ ...state, website: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.spotify}
            <input
              type="url"
              value={values.spotify}
              onChange={(event) => setValues((state) => ({ ...state, spotify: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.appleMusic}
            <input
              type="url"
              value={values.appleMusic}
              onChange={(event) => setValues((state) => ({ ...state, appleMusic: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.soundCloud}
            <input
              type="url"
              value={values.soundCloud}
              onChange={(event) => setValues((state) => ({ ...state, soundCloud: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.deezer}
            <input
              type="url"
              value={values.deezer}
              onChange={(event) => setValues((state) => ({ ...state, deezer: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.beatport}
            <input
              type="url"
              value={values.beatport}
              onChange={(event) => setValues((state) => ({ ...state, beatport: event.target.value }))}
            />
          </label>
          <label className="full-width">
            {messages.joinFields.notableReleases}
            <input
              required
              value={values.notableReleases}
              onChange={(event) =>
                setValues((state) => ({ ...state, notableReleases: event.target.value }))
              }
            />
          </label>
          <label className="full-width">
            {messages.joinFields.releaseSummary}
            <textarea
              required
              rows={4}
              value={values.releaseSummary}
              onChange={(event) =>
                setValues((state) => ({ ...state, releaseSummary: event.target.value }))
              }
            />
          </label>
          <label>
            {messages.joinFields.monthlyListeners}
            <input
              type="number"
              min={0}
              value={values.monthlyListeners}
              onChange={(event) =>
                setValues((state) => ({ ...state, monthlyListeners: event.target.value }))
              }
            />
          </label>
          <label>
            {messages.joinFields.totalFollowers}
            <input
              type="number"
              min={0}
              value={values.totalFollowers}
              onChange={(event) => setValues((state) => ({ ...state, totalFollowers: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.averageStreamsPerRelease}
            <input
              type="number"
              min={0}
              value={values.averageStreamsPerRelease}
              onChange={(event) =>
                setValues((state) => ({ ...state, averageStreamsPerRelease: event.target.value }))
              }
            />
          </label>
          <label>
            {messages.joinFields.topMarkets}
            <input
              value={values.topMarkets}
              onChange={(event) => setValues((state) => ({ ...state, topMarkets: event.target.value }))}
            />
          </label>
          <label>
            {messages.joinFields.monthlyMarketingBudgetEur}
            <input
              type="number"
              min={0}
              value={values.monthlyMarketingBudgetEur}
              onChange={(event) =>
                setValues((state) => ({ ...state, monthlyMarketingBudgetEur: event.target.value }))
              }
            />
          </label>
          <label>
            {messages.joinFields.productionBudgetPerTrackEur}
            <input
              type="number"
              min={0}
              value={values.productionBudgetPerTrackEur}
              onChange={(event) =>
                setValues((state) => ({ ...state, productionBudgetPerTrackEur: event.target.value }))
              }
            />
          </label>
          <label className="full-width">
            {messages.joinFields.teamDescription}
            <textarea
              required
              rows={3}
              value={values.teamDescription}
              onChange={(event) =>
                setValues((state) => ({ ...state, teamDescription: event.target.value }))
              }
            />
          </label>
          <label>
            {messages.joinFields.releaseFrequency}
            <input
              required
              value={values.releaseFrequency}
              onChange={(event) =>
                setValues((state) => ({ ...state, releaseFrequency: event.target.value }))
              }
            />
          </label>
          <label className="full-width">
            {messages.joinFields.roadmap90Days}
            <textarea
              required
              rows={4}
              value={values.roadmap90Days}
              onChange={(event) =>
                setValues((state) => ({ ...state, roadmap90Days: event.target.value }))
              }
            />
          </label>
          <label className="full-width">
            {messages.joinFields.goals12Months}
            <textarea
              required
              rows={4}
              value={values.goals12Months}
              onChange={(event) =>
                setValues((state) => ({ ...state, goals12Months: event.target.value }))
              }
            />
          </label>
          <label className="full-width">
            {messages.joinFields.whyNyvoro}
            <textarea
              required
              rows={4}
              value={values.whyNyvoro}
              onChange={(event) => setValues((state) => ({ ...state, whyNyvoro: event.target.value }))}
            />
          </label>
          <label className="full-width">
            {messages.joinFields.message}
            <textarea
              required
              rows={4}
              value={values.message}
              onChange={(event) => setValues((state) => ({ ...state, message: event.target.value }))}
            />
          </label>

          <input
            className="honeypot"
            tabIndex={-1}
            autoComplete="off"
            value={values.honeypot}
            onChange={(event) => setValues((state) => ({ ...state, honeypot: event.target.value }))}
            aria-hidden="true"
          />

          <label className="checkbox-row full-width">
            <input
              type="checkbox"
              checked={values.consent}
              onChange={(event) => setValues((state) => ({ ...state, consent: event.target.checked }))}
              required
            />
            <span>{messages.join.consent}</span>
          </label>

          <div className="full-width captcha-wrapper">
            <div id="nyvoro-turnstile" />
          </div>
        </div>

        <button className="btn primary" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? '...' : messages.join.submit}
        </button>

        {status === 'success' && <p className="form-status success">{messages.join.success}</p>}
        {status === 'stored' && <p className="form-status warning">{messages.join.storedWithEmailError}</p>}
        {status === 'error' && <p className="form-status error">{messages.join.error}</p>}
        {status === 'captcha' && <p className="form-status error">{messages.join.captchaError}</p>}
      </form>
    </section>
  );
}
