import { FormEvent, useEffect, useState } from 'react';
import { artists, labelMetadata, releases } from '@nyvoro/content';
import { useLocaleContext } from '../context/locale-context';
import { submitContactMessage, type ContactMessageChannel, type ContactMessageCreateInput } from '../lib/auth-api';

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

type ContactFormValues = ContactMessageCreateInput;

const initialFormValues: ContactFormValues = {
  locale: 'en',
  channel: 'general',
  fullName: '',
  email: '',
  subject: '',
  message: '',
  honeypot: '',
  turnstileToken: ''
};

export function ContactPage() {
  const { locale, messages } = useLocaleContext();

  const distroKidUrl = 'https://distrokid.com';
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL ?? 'contact@nyvoro-records.com';
  const pressEmail = import.meta.env.VITE_PRESS_EMAIL ?? 'press@nyvoro-records.com';
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL ?? 'demo@nyvoro-records.com';

  const [values, setValues] = useState<ContactFormValues>({
    ...initialFormValues,
    locale
  });
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

  const artistEmailLabel = locale === 'fr' ? 'Email artiste' : 'Artist inbox';
  const contactShowcaseTitle =
    locale === 'fr' ? 'Une boîte claire pour chaque besoin.' : 'A clear inbox for each request.';
  const contactShowcaseBody =
    locale === 'fr'
      ? 'Nous séparons presse, démos et contact général pour te répondre plus vite et orienter chaque message vers la bonne personne.'
      : 'We split press, demos, and general contact to answer faster and route each message to the right person.';
  const responseLabel = locale === 'fr' ? 'Temps de réponse moyen' : 'Average response time';
  const coverageLabel = locale === 'fr' ? 'Couverture' : 'Coverage';
  const artistHint = locale === 'fr' ? 'Boîtes directes artistes' : 'Direct artist inboxes';
  const routingLabel = locale === 'fr' ? 'Routage intelligent' : 'Smart routing';
  const routingValue =
    locale === 'fr'
      ? 'Chaque message arrive directement dans la bonne boîte.'
      : 'Each request lands directly in the right inbox.';
  const artistCountLabel =
    locale === 'fr'
      ? `${artists.length} boîtes actives`
      : `${artists.length} active inboxes`;
  const artistMailListClassName =
    artists.length > 1 ? 'artist-mail-list artist-mail-list--multi' : 'artist-mail-list';

  const primaryChannels: Array<{
    key: ContactMessageChannel;
    label: string;
    email: string;
    hint: string;
  }> = [
    {
      key: 'general',
      label: messages.contact.general,
      email: contactEmail,
      hint:
        locale === 'fr'
          ? 'Partenariats, administration, collaboration label.'
          : 'Partnerships, administration, and label collaboration.'
    },
    {
      key: 'press',
      label: messages.contact.press,
      email: pressEmail,
      hint: locale === 'fr' ? 'Interviews, médias, demandes presse.' : 'Interviews, media, and press requests.'
    },
    {
      key: 'demos',
      label: messages.contact.demos,
      email: demoEmail,
      hint:
        locale === 'fr'
          ? 'Envoi de projets artistiques et demos.'
          : 'Artist submissions and demo material.'
    }
  ];

  useEffect(() => {
    setValues((current) => ({ ...current, locale }));
  }, [locale]);

  useEffect(() => {
    if (isTurnstileBypassed) {
      setValues((current) => ({ ...current, turnstileToken: 'dev_bypass_token_1234567890' }));
      return;
    }

    const renderWidget = () => {
      window.turnstile?.render('#nyvoro-contact-turnstile', {
        sitekey: turnstileSiteKey,
        callback: (token) => setValues((current) => ({ ...current, turnstileToken: token }))
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-nyvoro-contact-turnstile]');
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
    script.dataset.nyvoroContactTurnstile = 'true';
    script.onload = renderWidget;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [isTurnstileBypassed, turnstileSiteKey]);

  function updateField<Key extends keyof ContactFormValues>(field: Key, value: ContactFormValues[Key]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    const response = await submitContactMessage(values);

    if (!response.ok) {
      if (response.body.code === 'captcha_invalid') {
        setFeedback({ kind: 'error', message: messages.contact.formErrors.captcha });
      } else if (response.body.code === 'rate_limited') {
        setFeedback({ kind: 'error', message: messages.contact.formErrors.rateLimited });
      } else if (response.body.code === 'network_error') {
        setFeedback({ kind: 'error', message: messages.contact.formErrors.network });
      } else if (response.body.code === 'validation_error') {
        setFeedback({ kind: 'error', message: messages.contact.formErrors.validation });
      } else {
        setFeedback({ kind: 'error', message: messages.contact.formErrors.generic });
      }
      setIsSubmitting(false);
      return;
    }

    setFeedback({ kind: 'success', message: messages.contact.formSuccess });
    setValues({
      ...initialFormValues,
      locale,
      turnstileToken: isTurnstileBypassed ? 'dev_bypass_token_1234567890' : ''
    });
    window.turnstile?.reset();
    setIsSubmitting(false);
  }

  const submitDisabled =
    isSubmitting ||
    values.fullName.trim().length < 2 ||
    values.email.trim().length < 3 ||
    values.subject.trim().length < 3 ||
    values.message.trim().length < 20 ||
    (!isTurnstileBypassed && values.turnstileToken.trim().length < 10);

  return (
    <section className="stacked-section contact-page">
      <header className="section-header contact-header">
        <h1>{messages.contact.title}</h1>
        <p>{messages.contact.subtitle}</p>
      </header>

      <article className="card contact-showcase">
        <div className="contact-showcase-main">
          <p className="contact-kicker">Nyvoro Mailroom</p>
          <h2>{contactShowcaseTitle}</h2>
          <p>{contactShowcaseBody}</p>
        </div>
        <div className="contact-showcase-meta">
          <div className="contact-showcase-meta-item">
            <p className="label">{responseLabel}</p>
            <p className="value">24-72h</p>
          </div>
          <div className="contact-showcase-meta-item">
            <p className="label">{coverageLabel}</p>
            <p className="value">FR · EN</p>
          </div>
          <div className="contact-showcase-meta-item">
            <p className="label">{routingLabel}</p>
            <p className="value">{routingValue}</p>
          </div>
        </div>
      </article>

      <div className="cards-grid contact-grid contact-grid--premium">
        {primaryChannels.map((channel, index) => (
          <a
            key={channel.key}
            className="card contact-card contact-card--primary contact-card-link"
            href={`mailto:${channel.email}`}
            aria-label={`${channel.label}: ${channel.email}`}
          >
            <p className="contact-card-step">{String(index + 1).padStart(2, '0')}</p>
            <p className="contact-channel-label">{channel.label}</p>
            <p className="contact-address">{channel.email}</p>
            <p className="contact-channel-hint">{channel.hint}</p>
          </a>
        ))}

        <article className="card contact-card contact-card--muted">
          <p className="contact-channel-label">{messages.contact.distributor}</p>
          <p className="contact-address">
            <a href={distroKidUrl} target="_blank" rel="noreferrer">
              {labelMetadata.distributor}
            </a>
          </p>
          <p className="contact-channel-hint">
            {locale === 'fr'
              ? 'Distribution digitale centralisée via '
              : 'Digital distribution workflow centralized with '}
            <a className="contact-inline-link" href={distroKidUrl} target="_blank" rel="noreferrer">
              DistroKid
            </a>
            .
          </p>
        </article>

        <article className="card contact-card artist-inboxes">
          <div className="artist-inbox-head">
            <p className="contact-channel-label">{messages.contact.artistInboxes}</p>
            <p className="contact-inline-count">{artistCountLabel}</p>
          </div>
          <p className="contact-channel-hint">{artistHint}</p>
          <div className={artistMailListClassName}>
            {artists.map((artist) => {
              const inbox = `${artist.id}@nyvoro-records.com`;
              const avatar = artist.portrait ?? releases.find((release) => release.artistId === artist.id)?.artwork ?? '';
              return (
                <a
                  key={artist.id}
                  className="artist-mail-item artist-mail-item-link"
                  href={`mailto:${inbox}`}
                  aria-label={`${artist.name}: ${inbox}`}
                >
                  <span className="artist-mail-profile">
                    <span
                      className={`artist-mail-avatar ${avatar ? '' : 'fallback'}`.trim()}
                      role="img"
                      aria-label={artist.name}
                      style={avatar ? { backgroundImage: `url(${avatar})` } : undefined}
                    >
                      {!avatar ? artist.name.slice(0, 1).toUpperCase() : null}
                    </span>
                    <span>
                      <strong>{artist.name}</strong> · {artistEmailLabel}
                    </span>
                  </span>
                  <span className="artist-mail-pill">{inbox}</span>
                </a>
              );
            })}
          </div>
        </article>
      </div>

      <form className="card join-form contact-form" onSubmit={handleSubmit}>
        <header className="join-form-section-header">
          <h2>{messages.contact.formTitle}</h2>
          <p>{messages.contact.formSubtitle}</p>
        </header>

        <div className="form-grid">
          <label>
            <span>{messages.contact.formFields.channel}</span>
            <select
              value={values.channel}
              onChange={(event) => updateField('channel', event.target.value as ContactMessageChannel)}
            >
              {primaryChannels.map((channel) => (
                <option key={channel.key} value={channel.key}>
                  {channel.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{messages.contact.formFields.fullName}</span>
            <input
              type="text"
              required
              minLength={2}
              value={values.fullName}
              onChange={(event) => updateField('fullName', event.target.value)}
            />
          </label>

          <label className="full-width">
            <span>{messages.contact.formFields.email}</span>
            <input
              type="email"
              required
              value={values.email}
              onChange={(event) => updateField('email', event.target.value)}
            />
          </label>

          <label className="full-width">
            <span>{messages.contact.formFields.subject}</span>
            <input
              type="text"
              required
              minLength={3}
              maxLength={180}
              value={values.subject}
              onChange={(event) => updateField('subject', event.target.value)}
            />
          </label>

          <label className="full-width">
            <span>{messages.contact.formFields.message}</span>
            <textarea
              required
              minLength={20}
              maxLength={3000}
              value={values.message}
              onChange={(event) => updateField('message', event.target.value)}
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
            <p>{messages.contact.formBypass}</p>
          </div>
        ) : (
          <div className="captcha-wrapper login-captcha">
            <div id="nyvoro-contact-turnstile" />
          </div>
        )}

        <button type="submit" className="btn primary" disabled={submitDisabled}>
          {isSubmitting ? messages.contact.formSubmitting : messages.contact.formSubmit}
        </button>

        {feedback ? (
          <p className={`form-status ${feedback.kind === 'success' ? 'success' : 'error'}`}>{feedback.message}</p>
        ) : null}
      </form>
    </section>
  );
}
