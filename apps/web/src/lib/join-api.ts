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

export async function submitJoinApplication(input: { locale: Locale; values: JoinFormState }) {
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

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  const response = await fetch(`${apiBase}/api/v1/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

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
