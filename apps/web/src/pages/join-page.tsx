import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocaleContext } from '../context/locale-context';
import {
  fetchApplicationProfile,
  submitJoinApplication,
  toJoinFormState,
  updateApplicationProfile,
  type ApplicationProfileLinks,
  type JoinFormState
} from '../lib/join-api';

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

type Option = {
  value: string;
  label: string;
};

type ProjectTypeOption = {
  value: JoinFormState['projectType'];
  label: string;
};

const socialFieldKeys = ['instagram', 'tiktok', 'youtube', 'x', 'website'] as const;
const streamingFieldKeys = ['spotify', 'appleMusic', 'soundCloud', 'deezer', 'beatport'] as const;

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

const joinFormCopy: Record<
  LocaleKey,
  {
    intro: string;
    requiredLegend: string;
    selectPlaceholder: string;
    sections: {
      profile: { title: string; description: string };
      positioning: { title: string; description: string };
      presence: { title: string; description: string };
      metrics: { title: string; description: string };
      strategy: { title: string; description: string };
    };
    hints: {
      secondaryGenres: string;
      topMarkets: string;
    };
    placeholders: {
      secondaryGenres: string;
      notableReleases: string;
      releaseSummary: string;
      topMarkets: string;
      teamDescription: string;
      roadmap90Days: string;
      goals12Months: string;
      whyNyvoro: string;
      message: string;
    };
    editMode: {
      notice: string;
      loading: string;
      invalidToken: string;
      loadError: string;
      updateSuccess: string;
      submit: string;
      viewProfile: string;
      editProfile: string;
    };
  }
> = {
  fr: {
    intro: 'Plus ta candidature est précise, plus notre retour sera rapide.',
    requiredLegend: 'Champs obligatoires',
    selectPlaceholder: 'Sélectionne une option',
    sections: {
      profile: {
        title: 'Profil & contact',
        description: 'Les informations de base pour te joindre et identifier ton projet.'
      },
      positioning: {
        title: 'Positionnement artistique',
        description: 'Décris ton univers musical et les sorties qui te représentent le mieux.'
      },
      presence: {
        title: 'Présence en ligne',
        description: 'Ajoute tes plateformes principales (optionnel mais recommandé).'
      },
      metrics: {
        title: 'Audience & ressources',
        description: 'Des estimations réalistes suffisent pour orienter notre analyse.'
      },
      strategy: {
        title: 'Vision & stratégie',
        description: 'Explique ton plan d’action pour les prochains mois.'
      }
    },
    hints: {
      secondaryGenres: 'Format conseillé: House, Progressive House, Breaks.',
      topMarkets: 'Format conseillé: France, Belgique, Canada.'
    },
    placeholders: {
      secondaryGenres: 'Ex. House, Progressive House, Breaks',
      notableReleases: 'Ex. Night Shift EP, Skyline Remix, Echoes Live Session',
      releaseSummary:
        'Résume les temps forts de tes sorties: performances, collaborations, labels, playlists ou presse.',
      topMarkets: 'Ex. France, Allemagne, Canada',
      teamDescription:
        'Qui travaille avec toi aujourd’hui (management, visuels, mix/master, promo) ?',
      roadmap90Days:
        'Quelles sorties et actions marketing prévois-tu dans les 90 prochains jours ?',
      goals12Months:
        'Quels objectifs concrets vises-tu sur 12 mois (audience, catalogues, live, territoires) ?',
      whyNyvoro: 'Pourquoi Nyvoro est-il le bon partenaire pour ton projet en ce moment ?',
      message:
        'Ajoute tout contexte utile (contraintes, calendrier, attentes, liens complémentaires).'
    },
    editMode: {
      notice: 'Mode edition active. Le lien magique permet de modifier ton profil existant.',
      loading: 'Chargement du profil en cours...',
      invalidToken: 'Lien magique invalide ou expire.',
      loadError: 'Impossible de charger le profil pour edition.',
      updateSuccess: 'Profil mis a jour avec succes.',
      submit: 'Mettre a jour le profil',
      viewProfile: 'Voir le profil public',
      editProfile: 'Rouvrir le lien d\'edition'
    }
  },
  en: {
    intro: 'The more precise your application is, the faster we can review it.',
    requiredLegend: 'Required fields',
    selectPlaceholder: 'Select an option',
    sections: {
      profile: {
        title: 'Profile & contact',
        description: 'Core details so we can identify your project and reach you quickly.'
      },
      positioning: {
        title: 'Artistic positioning',
        description:
          'Describe your sonic direction and the releases that represent your project best.'
      },
      presence: {
        title: 'Online presence',
        description: 'Share your main platforms (optional but recommended).'
      },
      metrics: {
        title: 'Audience & resources',
        description: 'Approximate numbers are enough for a first strategic review.'
      },
      strategy: {
        title: 'Vision & strategy',
        description: 'Tell us what you plan to execute over the next months.'
      }
    },
    hints: {
      secondaryGenres: 'Recommended format: House, Progressive House, Breaks.',
      topMarkets: 'Recommended format: France, Belgium, Canada.'
    },
    placeholders: {
      secondaryGenres: 'Ex. House, Progressive House, Breaks',
      notableReleases: 'Ex. Night Shift EP, Skyline Remix, Echoes Live Session',
      releaseSummary:
        'Summarize your key release milestones: performance, collaborations, labels, playlists, or press.',
      topMarkets: 'Ex. France, Germany, Canada',
      teamDescription: 'Who is currently involved (management, visuals, mix/master, promo)?',
      roadmap90Days: 'Which releases and marketing actions are planned over the next 90 days?',
      goals12Months:
        'What concrete outcomes do you target over 12 months (audience, catalog, live, territories)?',
      whyNyvoro: 'Why is Nyvoro the right partner for your project right now?',
      message: 'Add any useful context (constraints, timeline, expectations, extra links).'
    },
    editMode: {
      notice: 'Edit mode is active. This magic link lets you update your existing profile.',
      loading: 'Loading profile...',
      invalidToken: 'Invalid or expired magic link.',
      loadError: 'Unable to load profile for editing.',
      updateSuccess: 'Profile updated successfully.',
      submit: 'Update profile',
      viewProfile: 'Open public profile',
      editProfile: 'Reopen edit link'
    }
  }
};

const projectTypeOptions: Record<LocaleKey, ProjectTypeOption[]> = {
  fr: [
    { value: 'solo', label: 'Solo' },
    { value: 'duo', label: 'Duo' },
    { value: 'band', label: 'Groupe' },
    { value: 'producer', label: 'Producteur / Productrice' },
    { value: 'dj', label: 'DJ' },
    { value: 'other', label: 'Autre' }
  ],
  en: [
    { value: 'solo', label: 'Solo' },
    { value: 'duo', label: 'Duo' },
    { value: 'band', label: 'Band' },
    { value: 'producer', label: 'Producer' },
    { value: 'dj', label: 'DJ' },
    { value: 'other', label: 'Other' }
  ]
};

const countryOptions: Record<LocaleKey, Option[]> = {
  fr: [
    { value: 'France', label: 'France' },
    { value: 'Belgique', label: 'Belgique' },
    { value: 'Suisse', label: 'Suisse' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Allemagne', label: 'Allemagne' },
    { value: 'Pays-Bas', label: 'Pays-Bas' },
    { value: 'Royaume-Uni', label: 'Royaume-Uni' },
    { value: 'États-Unis', label: 'États-Unis' },
    { value: 'Espagne', label: 'Espagne' },
    { value: 'Italie', label: 'Italie' },
    { value: 'Portugal', label: 'Portugal' },
    { value: 'Brésil', label: 'Brésil' },
    { value: 'Maroc', label: 'Maroc' },
    { value: 'Autre', label: 'Autre' }
  ],
  en: [
    { value: 'France', label: 'France' },
    { value: 'Belgium', label: 'Belgium' },
    { value: 'Switzerland', label: 'Switzerland' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Germany', label: 'Germany' },
    { value: 'Netherlands', label: 'Netherlands' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'United States', label: 'United States' },
    { value: 'Spain', label: 'Spain' },
    { value: 'Italy', label: 'Italy' },
    { value: 'Portugal', label: 'Portugal' },
    { value: 'Brazil', label: 'Brazil' },
    { value: 'Morocco', label: 'Morocco' },
    { value: 'Other', label: 'Other' }
  ]
};

const primaryGenreOptions: Record<LocaleKey, Option[]> = {
  fr: [
    { value: 'Melodic Techno', label: 'Melodic Techno' },
    { value: 'Techno', label: 'Techno' },
    { value: 'Progressive House', label: 'Progressive House' },
    { value: 'House', label: 'House' },
    { value: 'Afro House', label: 'Afro House' },
    { value: 'Indie Dance', label: 'Indie Dance' },
    { value: 'Electronica', label: 'Electronica' },
    { value: 'Organic House', label: 'Organic House' },
    { value: 'Drum & Bass', label: 'Drum & Bass' },
    { value: 'Trance', label: 'Trance' },
    { value: 'Autre', label: 'Autre' }
  ],
  en: [
    { value: 'Melodic Techno', label: 'Melodic Techno' },
    { value: 'Techno', label: 'Techno' },
    { value: 'Progressive House', label: 'Progressive House' },
    { value: 'House', label: 'House' },
    { value: 'Afro House', label: 'Afro House' },
    { value: 'Indie Dance', label: 'Indie Dance' },
    { value: 'Electronica', label: 'Electronica' },
    { value: 'Organic House', label: 'Organic House' },
    { value: 'Drum & Bass', label: 'Drum & Bass' },
    { value: 'Trance', label: 'Trance' },
    { value: 'Other', label: 'Other' }
  ]
};

const releaseFrequencyOptions: Record<LocaleKey, Option[]> = {
  fr: [
    { value: 'Un single toutes les 2 semaines', label: 'Toutes les 2 semaines' },
    { value: 'Un single toutes les 4 semaines', label: 'Toutes les 4 semaines' },
    { value: 'Une sortie toutes les 6 semaines', label: 'Toutes les 6 semaines' },
    { value: 'Une sortie par trimestre', label: 'Trimestriel' },
    { value: 'Sorties irrégulières selon les opportunités', label: 'Irrégulier' }
  ],
  en: [
    { value: 'One single every 2 weeks', label: 'Every 2 weeks' },
    { value: 'One single every 4 weeks', label: 'Every 4 weeks' },
    { value: 'One release every 6 weeks', label: 'Every 6 weeks' },
    { value: 'One release per quarter', label: 'Quarterly' },
    { value: 'Irregular releases based on opportunities', label: 'Irregular' }
  ]
};

const monthlyListenersOptions: Record<LocaleKey, Option[]> = {
  fr: [
    { value: '1000', label: '0 - 1 000' },
    { value: '5000', label: '1 000 - 5 000' },
    { value: '20000', label: '5 000 - 20 000' },
    { value: '75000', label: '20 000 - 100 000' },
    { value: '250000', label: '100 000+' }
  ],
  en: [
    { value: '1000', label: '0 - 1,000' },
    { value: '5000', label: '1,000 - 5,000' },
    { value: '20000', label: '5,000 - 20,000' },
    { value: '75000', label: '20,000 - 100,000' },
    { value: '250000', label: '100,000+' }
  ]
};

const totalFollowersOptions: Record<LocaleKey, Option[]> = {
  fr: [
    { value: '500', label: '0 - 500' },
    { value: '5000', label: '500 - 5 000' },
    { value: '25000', label: '5 000 - 25 000' },
    { value: '100000', label: '25 000 - 100 000' },
    { value: '300000', label: '100 000+' }
  ],
  en: [
    { value: '500', label: '0 - 500' },
    { value: '5000', label: '500 - 5,000' },
    { value: '25000', label: '5,000 - 25,000' },
    { value: '100000', label: '25,000 - 100,000' },
    { value: '300000', label: '100,000+' }
  ]
};

const averageStreamsOptions: Record<LocaleKey, Option[]> = {
  fr: [
    { value: '1000', label: '0 - 1 000' },
    { value: '5000', label: '1 000 - 5 000' },
    { value: '20000', label: '5 000 - 20 000' },
    { value: '75000', label: '20 000 - 75 000' },
    { value: '200000', label: '75 000+' }
  ],
  en: [
    { value: '1000', label: '0 - 1,000' },
    { value: '5000', label: '1,000 - 5,000' },
    { value: '20000', label: '5,000 - 20,000' },
    { value: '75000', label: '20,000 - 75,000' },
    { value: '200000', label: '75,000+' }
  ]
};

const monthlyMarketingBudgetOptions: Record<LocaleKey, Option[]> = {
  fr: [
    { value: '0', label: '0 EUR' },
    { value: '300', label: '300 EUR' },
    { value: '1000', label: '1 000 EUR' },
    { value: '3000', label: '3 000 EUR' },
    { value: '7000', label: '7 000 EUR' },
    { value: '15000', label: '15 000 EUR +' }
  ],
  en: [
    { value: '0', label: 'EUR 0' },
    { value: '300', label: 'EUR 300' },
    { value: '1000', label: 'EUR 1,000' },
    { value: '3000', label: 'EUR 3,000' },
    { value: '7000', label: 'EUR 7,000' },
    { value: '15000', label: 'EUR 15,000+' }
  ]
};

const productionBudgetOptions: Record<LocaleKey, Option[]> = {
  fr: [
    { value: '0', label: '0 EUR' },
    { value: '200', label: '200 EUR' },
    { value: '500', label: '500 EUR' },
    { value: '1000', label: '1 000 EUR' },
    { value: '2000', label: '2 000 EUR' },
    { value: '5000', label: '5 000 EUR +' }
  ],
  en: [
    { value: '0', label: 'EUR 0' },
    { value: '200', label: 'EUR 200' },
    { value: '500', label: 'EUR 500' },
    { value: '1000', label: 'EUR 1,000' },
    { value: '2000', label: 'EUR 2,000' },
    { value: '5000', label: 'EUR 5,000+' }
  ]
};

const secondaryGenreSuggestions: Record<LocaleKey, string[]> = {
  fr: [
    'House',
    'Progressive House',
    'Melodic House',
    'Afro House',
    'Indie Dance',
    'Minimal',
    'Breaks',
    'Electronica'
  ],
  en: [
    'House',
    'Progressive House',
    'Melodic House',
    'Afro House',
    'Indie Dance',
    'Minimal',
    'Breaks',
    'Electronica'
  ]
};

const topMarketSuggestions: Record<LocaleKey, string[]> = {
  fr: [
    'France',
    'Belgique',
    'Suisse',
    'Allemagne',
    'Royaume-Uni',
    'États-Unis',
    'Canada',
    'Pays-Bas'
  ],
  en: [
    'France',
    'Belgium',
    'Switzerland',
    'Germany',
    'United Kingdom',
    'United States',
    'Canada',
    'Netherlands'
  ]
};

function buildYearsActiveOptions(locale: LocaleKey): Option[] {
  return Array.from({ length: 21 }, (_, year) => ({
    value: String(year),
    label:
      locale === 'fr'
        ? year === 0
          ? "Moins d'un an"
          : `${year} an${year > 1 ? 's' : ''}`
        : year === 0
          ? 'Less than one year'
          : `${year} year${year > 1 ? 's' : ''}`
  }));
}

type JoinSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function JoinSection({ title, description, children }: JoinSectionProps) {
  return (
    <section className="join-form-section">
      <header className="join-form-section-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="form-grid">{children}</div>
    </section>
  );
}

type JoinFieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  fullWidth?: boolean;
  children: ReactNode;
};

function JoinField({ label, required = false, hint, fullWidth = false, children }: JoinFieldProps) {
  return (
    <label className={fullWidth ? 'join-field full-width' : 'join-field'}>
      <span className="join-field-label">
        {label}
        {required ? (
          <span className="required-indicator" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {hint ? <span className="join-field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}

function parseProfileLinks(value: unknown): ApplicationProfileLinks | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const maybeLinks = value as Record<string, unknown>;
  if (typeof maybeLinks.viewUrl !== 'string' || typeof maybeLinks.editUrl !== 'string') {
    return null;
  }

  return {
    viewUrl: maybeLinks.viewUrl,
    editUrl: maybeLinks.editUrl
  };
}

export function JoinPage() {
  const [searchParams] = useSearchParams();
  const { locale, messages } = useLocaleContext();
  const [values, setValues] = useState<JoinFormState>(initialState);
  const [status, setStatus] = useState<
    | 'idle'
    | 'loading'
    | 'submitting'
    | 'success'
    | 'stored'
    | 'updated'
    | 'error'
    | 'captcha'
    | 'invalidToken'
    | 'loadError'
  >('idle');
  const [profileLinks, setProfileLinks] = useState<ApplicationProfileLinks | null>(null);

  const localizedLocale: LocaleKey = locale === 'fr' ? 'fr' : 'en';
  const copy = joinFormCopy[localizedLocale];
  const editApplicationId = searchParams.get('applicationId')?.trim() ?? '';
  const editToken = searchParams.get('editToken')?.trim() ?? '';
  const isEditMode = editApplicationId.length > 0 && editToken.length > 0;
  const yearsActiveOptions = useMemo(
    () => buildYearsActiveOptions(localizedLocale),
    [localizedLocale]
  );

  const secondaryGenresListId = `join-secondary-genres-${localizedLocale}`;
  const topMarketsListId = `join-top-markets-${localizedLocale}`;

  const turnstileSiteKey =
    import.meta.env.VITE_TURNSTILE_SITE_KEY ?? 'turnstile_site_key_placeholder';

  function updateField<Key extends keyof JoinFormState>(field: Key, value: JoinFormState[Key]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    let isMounted = true;
    setStatus('loading');

    void (async () => {
      const response = await fetchApplicationProfile({
        applicationId: editApplicationId,
        token: editToken
      });

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        if (response.body.code === 'invalid_token') {
          setStatus('invalidToken');
        } else {
          setStatus('loadError');
        }
        return;
      }

      if (!response.body.payload) {
        setStatus('loadError');
        return;
      }

      setValues(toJoinFormState(response.body.payload));
      setProfileLinks({
        viewUrl: `${window.location.origin}/${locale}/application-profile/${encodeURIComponent(editApplicationId)}?token=${encodeURIComponent(editToken)}`,
        editUrl: window.location.href
      });
      setStatus('idle');
    })();

    return () => {
      isMounted = false;
    };
  }, [editApplicationId, editToken, isEditMode, locale]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    if (turnstileSiteKey.includes('placeholder')) {
      updateField('turnstileToken', 'dev_bypass_token_1234567890');
      return;
    }

    if (window.turnstile) {
      window.turnstile.render('#nyvoro-turnstile', {
        sitekey: turnstileSiteKey,
        callback: (token) => updateField('turnstileToken', token)
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
        callback: (token) => updateField('turnstileToken', token)
      });
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [isEditMode, turnstileSiteKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    if (!isEditMode) {
      setProfileLinks(null);
    }
    const response = isEditMode
      ? await updateApplicationProfile({
          applicationId: editApplicationId,
          token: editToken,
          locale,
          values
        })
      : await submitJoinApplication({ locale, values });

    if (!response.ok) {
      if (response.body?.code === 'captcha_invalid') {
        setStatus('captcha');
      } else if (response.body?.code === 'invalid_token') {
        setStatus('invalidToken');
      } else {
        setStatus('error');
      }
      return;
    }

    if (isEditMode) {
      setStatus('updated');
      return;
    }

    const responseProfileLinks = parseProfileLinks(response.body.profileLinks);
    if (responseProfileLinks) {
      setProfileLinks(responseProfileLinks);
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
        <div className="join-form-intro">
          <p className="form-note">{copy.intro}</p>
          <p className="required-note">
            <span className="required-indicator" aria-hidden="true">
              *
            </span>{' '}
            {copy.requiredLegend}
          </p>
          {isEditMode ? <p className="form-note">{copy.editMode.notice}</p> : null}
          {status === 'loading' ? <p className="form-status warning">{copy.editMode.loading}</p> : null}
        </div>

        <JoinSection
          title={copy.sections.profile.title}
          description={copy.sections.profile.description}
        >
          <JoinField label={messages.joinFields.legalName} required>
            <input
              required
              minLength={2}
              autoComplete="name"
              value={values.legalName}
              onChange={(event) => updateField('legalName', event.target.value)}
            />
          </JoinField>
          <JoinField label={messages.joinFields.artistName} required>
            <input
              required
              minLength={2}
              autoComplete="nickname"
              value={values.artistName}
              onChange={(event) => updateField('artistName', event.target.value)}
            />
          </JoinField>
          <JoinField label={messages.joinFields.email} required>
            <input
              type="email"
              required
              autoComplete="email"
              value={values.email}
              onChange={(event) => updateField('email', event.target.value)}
            />
          </JoinField>
          <JoinField label={messages.joinFields.phone}>
            <input
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={(event) => updateField('phone', event.target.value)}
            />
          </JoinField>
          <JoinField label={messages.joinFields.city} required>
            <input
              required
              minLength={2}
              autoComplete="address-level2"
              value={values.city}
              onChange={(event) => updateField('city', event.target.value)}
            />
          </JoinField>
          <JoinField label={messages.joinFields.country} required>
            <select
              required
              value={values.country}
              onChange={(event) => updateField('country', event.target.value)}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {countryOptions[localizedLocale].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </JoinField>
          <JoinField label={messages.joinFields.projectType} required>
            <select
              required
              value={values.projectType}
              onChange={(event) =>
                updateField('projectType', event.target.value as JoinFormState['projectType'])
              }
            >
              {projectTypeOptions[localizedLocale].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </JoinField>
        </JoinSection>

        <JoinSection
          title={copy.sections.positioning.title}
          description={copy.sections.positioning.description}
        >
          <JoinField label={messages.joinFields.yearsActive} required>
            <select
              required
              value={values.yearsActive}
              onChange={(event) => updateField('yearsActive', event.target.value)}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {yearsActiveOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </JoinField>
          <JoinField label={messages.joinFields.primaryGenre} required>
            <select
              required
              value={values.primaryGenre}
              onChange={(event) => updateField('primaryGenre', event.target.value)}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {primaryGenreOptions[localizedLocale].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </JoinField>
          <JoinField
            label={messages.joinFields.secondaryGenres}
            required
            hint={copy.hints.secondaryGenres}
          >
            <input
              required
              list={secondaryGenresListId}
              placeholder={copy.placeholders.secondaryGenres}
              value={values.secondaryGenres}
              onChange={(event) => updateField('secondaryGenres', event.target.value)}
            />
            <datalist id={secondaryGenresListId}>
              {secondaryGenreSuggestions[localizedLocale].map((genre) => (
                <option key={genre} value={genre} />
              ))}
            </datalist>
          </JoinField>
          <JoinField label={messages.joinFields.notableReleases} required fullWidth>
            <input
              required
              placeholder={copy.placeholders.notableReleases}
              value={values.notableReleases}
              onChange={(event) => updateField('notableReleases', event.target.value)}
            />
          </JoinField>
          <JoinField label={messages.joinFields.releaseSummary} required fullWidth>
            <textarea
              required
              minLength={20}
              rows={4}
              placeholder={copy.placeholders.releaseSummary}
              value={values.releaseSummary}
              onChange={(event) => updateField('releaseSummary', event.target.value)}
            />
          </JoinField>
        </JoinSection>

        <JoinSection
          title={copy.sections.presence.title}
          description={copy.sections.presence.description}
        >
          {socialFieldKeys.map((fieldKey) => (
            <JoinField key={fieldKey} label={messages.joinFields[fieldKey]}>
              <input
                type="url"
                placeholder="https://"
                value={values[fieldKey]}
                onChange={(event) => updateField(fieldKey, event.target.value)}
              />
            </JoinField>
          ))}

          {streamingFieldKeys.map((fieldKey) => (
            <JoinField key={fieldKey} label={messages.joinFields[fieldKey]}>
              <input
                type="url"
                placeholder="https://"
                value={values[fieldKey]}
                onChange={(event) => updateField(fieldKey, event.target.value)}
              />
            </JoinField>
          ))}
        </JoinSection>

        <JoinSection
          title={copy.sections.metrics.title}
          description={copy.sections.metrics.description}
        >
          <JoinField label={messages.joinFields.monthlyListeners}>
            <select
              value={values.monthlyListeners}
              onChange={(event) => updateField('monthlyListeners', event.target.value)}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {monthlyListenersOptions[localizedLocale].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </JoinField>
          <JoinField label={messages.joinFields.totalFollowers}>
            <select
              value={values.totalFollowers}
              onChange={(event) => updateField('totalFollowers', event.target.value)}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {totalFollowersOptions[localizedLocale].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </JoinField>
          <JoinField label={messages.joinFields.averageStreamsPerRelease}>
            <select
              value={values.averageStreamsPerRelease}
              onChange={(event) => updateField('averageStreamsPerRelease', event.target.value)}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {averageStreamsOptions[localizedLocale].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </JoinField>
          <JoinField label={messages.joinFields.topMarkets} hint={copy.hints.topMarkets}>
            <input
              list={topMarketsListId}
              placeholder={copy.placeholders.topMarkets}
              value={values.topMarkets}
              onChange={(event) => updateField('topMarkets', event.target.value)}
            />
            <datalist id={topMarketsListId}>
              {topMarketSuggestions[localizedLocale].map((market) => (
                <option key={market} value={market} />
              ))}
            </datalist>
          </JoinField>
          <JoinField label={messages.joinFields.monthlyMarketingBudgetEur}>
            <select
              value={values.monthlyMarketingBudgetEur}
              onChange={(event) => updateField('monthlyMarketingBudgetEur', event.target.value)}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {monthlyMarketingBudgetOptions[localizedLocale].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </JoinField>
          <JoinField label={messages.joinFields.productionBudgetPerTrackEur}>
            <select
              value={values.productionBudgetPerTrackEur}
              onChange={(event) => updateField('productionBudgetPerTrackEur', event.target.value)}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {productionBudgetOptions[localizedLocale].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </JoinField>
          <JoinField label={messages.joinFields.teamDescription} required fullWidth>
            <textarea
              required
              minLength={10}
              rows={3}
              placeholder={copy.placeholders.teamDescription}
              value={values.teamDescription}
              onChange={(event) => updateField('teamDescription', event.target.value)}
            />
          </JoinField>
        </JoinSection>

        <JoinSection
          title={copy.sections.strategy.title}
          description={copy.sections.strategy.description}
        >
          <JoinField label={messages.joinFields.releaseFrequency} required>
            <select
              required
              value={values.releaseFrequency}
              onChange={(event) => updateField('releaseFrequency', event.target.value)}
            >
              <option value="">{copy.selectPlaceholder}</option>
              {releaseFrequencyOptions[localizedLocale].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </JoinField>
          <JoinField label={messages.joinFields.roadmap90Days} required fullWidth>
            <textarea
              required
              minLength={30}
              rows={4}
              placeholder={copy.placeholders.roadmap90Days}
              value={values.roadmap90Days}
              onChange={(event) => updateField('roadmap90Days', event.target.value)}
            />
          </JoinField>
          <JoinField label={messages.joinFields.goals12Months} required fullWidth>
            <textarea
              required
              minLength={30}
              rows={4}
              placeholder={copy.placeholders.goals12Months}
              value={values.goals12Months}
              onChange={(event) => updateField('goals12Months', event.target.value)}
            />
          </JoinField>
          <JoinField label={messages.joinFields.whyNyvoro} required fullWidth>
            <textarea
              required
              minLength={30}
              rows={4}
              placeholder={copy.placeholders.whyNyvoro}
              value={values.whyNyvoro}
              onChange={(event) => updateField('whyNyvoro', event.target.value)}
            />
          </JoinField>
          <JoinField label={messages.joinFields.message} required fullWidth>
            <textarea
              required
              minLength={20}
              rows={4}
              placeholder={copy.placeholders.message}
              value={values.message}
              onChange={(event) => updateField('message', event.target.value)}
            />
          </JoinField>
        </JoinSection>

        <input
          className="honeypot"
          tabIndex={-1}
          autoComplete="off"
          value={values.honeypot}
          onChange={(event) => updateField('honeypot', event.target.value)}
          aria-hidden="true"
        />

        <label className="checkbox-row join-consent">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(event) => updateField('consent', event.target.checked)}
            required
          />
          <span>
            {messages.join.consent}{' '}
            <span className="required-indicator" aria-hidden="true">
              *
            </span>
          </span>
        </label>

        {!isEditMode ? (
          <div className="captcha-wrapper">
            <div id="nyvoro-turnstile" />
          </div>
        ) : null}

        <button
          className="btn primary"
          type="submit"
          disabled={status === 'submitting' || status === 'loading'}
        >
          {status === 'submitting' ? '...' : isEditMode ? copy.editMode.submit : messages.join.submit}
        </button>

        {status === 'success' && <p className="form-status success">{messages.join.success}</p>}
        {status === 'stored' && (
          <p className="form-status warning">{messages.join.storedWithEmailError}</p>
        )}
        {status === 'updated' && <p className="form-status success">{copy.editMode.updateSuccess}</p>}
        {status === 'error' && <p className="form-status error">{messages.join.error}</p>}
        {status === 'captcha' && <p className="form-status error">{messages.join.captchaError}</p>}
        {status === 'invalidToken' && (
          <p className="form-status error">{copy.editMode.invalidToken}</p>
        )}
        {status === 'loadError' && <p className="form-status error">{copy.editMode.loadError}</p>}

        {profileLinks ? (
          <p className="form-status success">
            <a href={profileLinks.viewUrl} target="_blank" rel="noreferrer">
              {copy.editMode.viewProfile}
            </a>{' '}
            ·{' '}
            <a href={profileLinks.editUrl} target="_blank" rel="noreferrer">
              {copy.editMode.editProfile}
            </a>
          </p>
        ) : null}
      </form>
    </section>
  );
}
