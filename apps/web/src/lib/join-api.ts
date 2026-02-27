import type { Locale } from '@nyvoro/shared-types';

export type JoinFormState = {
  legalName: string;
  artistName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  projectType: 'solo' | 'duo' | 'band' | 'producer' | 'dj' | 'other';
  yearsActive: string;
  primaryGenre: string;
  secondaryGenres: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  x: string;
  website: string;
  spotify: string;
  appleMusic: string;
  soundCloud: string;
  deezer: string;
  beatport: string;
  notableReleases: string;
  releaseSummary: string;
  monthlyListeners: string;
  totalFollowers: string;
  averageStreamsPerRelease: string;
  topMarkets: string;
  monthlyMarketingBudgetEur: string;
  productionBudgetPerTrackEur: string;
  teamDescription: string;
  releaseFrequency: string;
  roadmap90Days: string;
  goals12Months: string;
  whyNyvoro: string;
  message: string;
  consent: boolean;
  honeypot: string;
  turnstileToken: string;
};

type SubmitJoinApplicationResponse = {
  ok: boolean;
  status: number;
  body: {
    status?: string;
    code?: string;
    [key: string]: unknown;
  };
};

function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveConfiguredApiBaseUrl(): string | undefined {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configuredApiBaseUrl) {
    return undefined;
  }

  const normalizedConfiguredApiBaseUrl = normalizeApiBaseUrl(configuredApiBaseUrl);

  if (typeof window === 'undefined') {
    return normalizedConfiguredApiBaseUrl;
  }

  const currentHostname = window.location.hostname;

  try {
    const configuredHostname = new URL(normalizedConfiguredApiBaseUrl).hostname;

    // Guardrail: a production browser should never use a localhost API URL.
    if (!isLocalHostname(currentHostname) && isLocalHostname(configuredHostname)) {
      console.warn(
        '[join-api] Ignoring VITE_API_BASE_URL pointing to localhost in non-local runtime.'
      );
      return undefined;
    }
  } catch {
    if (!isLocalHostname(currentHostname)) {
      console.warn('[join-api] Invalid VITE_API_BASE_URL. Falling back to runtime defaults.');
      return undefined;
    }
  }

  return normalizedConfiguredApiBaseUrl;
}

function resolveApiBaseUrl(): string {
  const configuredApiBaseUrl = resolveConfiguredApiBaseUrl();
  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (isLocalHostname(hostname)) {
      return 'http://localhost:4000';
    }

    if (hostname === 'nyvoro-records.com' || hostname === 'www.nyvoro-records.com') {
      return 'https://api.nyvoro-records.com';
    }

    return origin;
  }

  return '';
}

function buildApiUrl(path: string): string {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return path;
  }
  return `${apiBaseUrl}${path}`;
}

function parseList(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseNumber(raw: string): number | '' {
  if (raw.trim().length === 0) {
    return '';
  }

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? '' : parsed;
}

export async function submitJoinApplication(input: {
  locale: Locale;
  values: JoinFormState;
}): Promise<SubmitJoinApplicationResponse> {
  const { locale, values } = input;

  const payload = {
    locale,
    turnstileToken: values.turnstileToken,
    honeypot: values.honeypot,
    profile: {
      legalName: values.legalName,
      artistName: values.artistName,
      email: values.email,
      phone: values.phone,
      city: values.city,
      country: values.country,
      projectType: values.projectType,
      yearsActive: parseNumber(values.yearsActive),
      primaryGenre: values.primaryGenre,
      secondaryGenres: parseList(values.secondaryGenres)
    },
    socialLinks: {
      instagram: values.instagram,
      tiktok: values.tiktok,
      youtube: values.youtube,
      x: values.x,
      website: values.website
    },
    streamingLinks: {
      spotify: values.spotify,
      appleMusic: values.appleMusic,
      soundCloud: values.soundCloud,
      deezer: values.deezer,
      beatport: values.beatport
    },
    releaseHistory: {
      notableReleases: parseList(values.notableReleases),
      releaseSummary: values.releaseSummary
    },
    audienceAnalytics: {
      monthlyListeners: parseNumber(values.monthlyListeners),
      totalFollowers: parseNumber(values.totalFollowers),
      averageStreamsPerRelease: parseNumber(values.averageStreamsPerRelease),
      topMarkets: parseList(values.topMarkets)
    },
    budgetAndResources: {
      monthlyMarketingBudgetEur: parseNumber(values.monthlyMarketingBudgetEur),
      productionBudgetPerTrackEur: parseNumber(values.productionBudgetPerTrackEur),
      teamDescription: values.teamDescription
    },
    planning: {
      releaseFrequency: values.releaseFrequency,
      roadmap90Days: values.roadmap90Days
    },
    objectives: {
      goals12Months: values.goals12Months,
      whyNyvoro: values.whyNyvoro
    },
    message: values.message,
    consent: values.consent
  };

  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/applications'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch {
    return {
      ok: false,
      status: 0,
      body: {
        status: 'error',
        code: 'network_error',
        message: 'Network request failed.'
      }
    };
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body
    };
  }

  return {
    ok: true,
    status: response.status,
    body
  };
}
