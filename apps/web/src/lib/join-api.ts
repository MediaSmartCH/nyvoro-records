import type {
  JoinApplicationEditableInput,
  JoinApplicationInput,
  Locale
} from '@nyvoro/shared-types';

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

export type ApplicationProfileLinks = {
  viewUrl: string;
  editUrl: string;
};

type ApiBody = {
  status?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type ApiResponse<TBody extends ApiBody> = {
  ok: boolean;
  status: number;
  body: TBody;
};

type SubmitJoinApplicationBody = ApiBody & {
  applicationId?: string;
  profileLinks?: ApplicationProfileLinks;
};

type FetchApplicationProfileBody = ApiBody & {
  applicationId?: string;
  createdAt?: string;
  updatedAt?: string;
  canEdit?: boolean;
  payload?: JoinApplicationEditableInput;
};

type UpdateApplicationProfileBody = ApiBody & {
  applicationId?: string;
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

function parseRequiredNumber(raw: string): number {
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function parseOptionalNumber(raw: string): number | undefined {
  if (raw.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function numberToString(value: number | undefined): string {
  return typeof value === 'number' ? String(value) : '';
}

function buildEditablePayload(input: {
  locale: Locale;
  values: JoinFormState;
}): JoinApplicationEditableInput {
  const { locale, values } = input;

  return {
    locale,
    profile: {
      legalName: values.legalName,
      artistName: values.artistName,
      email: values.email,
      phone: values.phone,
      city: values.city,
      country: values.country,
      projectType: values.projectType,
      yearsActive: parseRequiredNumber(values.yearsActive),
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
      monthlyListeners: parseOptionalNumber(values.monthlyListeners),
      totalFollowers: parseOptionalNumber(values.totalFollowers),
      averageStreamsPerRelease: parseOptionalNumber(values.averageStreamsPerRelease),
      topMarkets: parseList(values.topMarkets)
    },
    budgetAndResources: {
      monthlyMarketingBudgetEur: parseOptionalNumber(values.monthlyMarketingBudgetEur),
      productionBudgetPerTrackEur: parseOptionalNumber(values.productionBudgetPerTrackEur),
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
    consent: values.consent as true
  };
}

function buildSubmissionPayload(input: {
  locale: Locale;
  values: JoinFormState;
}): JoinApplicationInput {
  const { locale, values } = input;
  const editablePayload = buildEditablePayload({ locale, values });

  return {
    ...editablePayload,
    turnstileToken: values.turnstileToken,
    honeypot: values.honeypot
  };
}

async function parseResponseBody(response: Response): Promise<ApiBody> {
  return response.json().catch(() => ({}));
}

function buildNetworkErrorResponse<TBody extends ApiBody>(body: TBody): ApiResponse<TBody> {
  return {
    ok: false,
    status: 0,
    body
  };
}

export function toJoinFormState(payload: JoinApplicationEditableInput): JoinFormState {
  return {
    legalName: payload.profile.legalName,
    artistName: payload.profile.artistName,
    email: payload.profile.email,
    phone: payload.profile.phone ?? '',
    city: payload.profile.city,
    country: payload.profile.country,
    projectType: payload.profile.projectType,
    yearsActive: numberToString(payload.profile.yearsActive),
    primaryGenre: payload.profile.primaryGenre,
    secondaryGenres: payload.profile.secondaryGenres.join(', '),
    instagram: payload.socialLinks.instagram ?? '',
    tiktok: payload.socialLinks.tiktok ?? '',
    youtube: payload.socialLinks.youtube ?? '',
    x: payload.socialLinks.x ?? '',
    website: payload.socialLinks.website ?? '',
    spotify: payload.streamingLinks.spotify ?? '',
    appleMusic: payload.streamingLinks.appleMusic ?? '',
    soundCloud: payload.streamingLinks.soundCloud ?? '',
    deezer: payload.streamingLinks.deezer ?? '',
    beatport: payload.streamingLinks.beatport ?? '',
    notableReleases: payload.releaseHistory.notableReleases.join(', '),
    releaseSummary: payload.releaseHistory.releaseSummary,
    monthlyListeners: numberToString(payload.audienceAnalytics.monthlyListeners),
    totalFollowers: numberToString(payload.audienceAnalytics.totalFollowers),
    averageStreamsPerRelease: numberToString(payload.audienceAnalytics.averageStreamsPerRelease),
    topMarkets: payload.audienceAnalytics.topMarkets.join(', '),
    monthlyMarketingBudgetEur: numberToString(payload.budgetAndResources.monthlyMarketingBudgetEur),
    productionBudgetPerTrackEur: numberToString(
      payload.budgetAndResources.productionBudgetPerTrackEur
    ),
    teamDescription: payload.budgetAndResources.teamDescription,
    releaseFrequency: payload.planning.releaseFrequency,
    roadmap90Days: payload.planning.roadmap90Days,
    goals12Months: payload.objectives.goals12Months,
    whyNyvoro: payload.objectives.whyNyvoro,
    message: payload.message,
    consent: payload.consent,
    honeypot: '',
    turnstileToken: ''
  };
}

export async function submitJoinApplication(input: {
  locale: Locale;
  values: JoinFormState;
}): Promise<ApiResponse<SubmitJoinApplicationBody>> {
  const payload = buildSubmissionPayload(input);

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
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as SubmitJoinApplicationBody;

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

export async function fetchApplicationProfile(input: {
  applicationId: string;
  token: string;
}): Promise<ApiResponse<FetchApplicationProfileBody>> {
  const { applicationId, token } = input;

  let response: Response;

  try {
    response = await fetch(
      buildApiUrl(
        `/api/v1/applications/${encodeURIComponent(applicationId)}/profile?token=${encodeURIComponent(token)}`
      )
    );
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as FetchApplicationProfileBody;

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

export async function updateApplicationProfile(input: {
  applicationId: string;
  token: string;
  locale: Locale;
  values: JoinFormState;
}): Promise<ApiResponse<UpdateApplicationProfileBody>> {
  const { applicationId, token, locale, values } = input;
  const payload = buildEditablePayload({ locale, values });

  let response: Response;

  try {
    response = await fetch(
      buildApiUrl(
        `/api/v1/applications/${encodeURIComponent(applicationId)}/profile?token=${encodeURIComponent(token)}`
      ),
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as UpdateApplicationProfileBody;

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
