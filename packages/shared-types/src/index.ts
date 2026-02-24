import { z } from 'zod';

export const supportedLocales = ['en', 'fr'] as const;
export const localeSchema = z.enum(supportedLocales);
export type Locale = z.infer<typeof localeSchema>;

const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().url().optional()
);

const optionalNumberSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.coerce.number().nonnegative().optional()
);

const socialLinksSchema = z.object({
  instagram: optionalUrlSchema,
  tiktok: optionalUrlSchema,
  youtube: optionalUrlSchema,
  x: optionalUrlSchema,
  website: optionalUrlSchema
});

const streamingLinksSchema = z.object({
  spotify: optionalUrlSchema,
  appleMusic: optionalUrlSchema,
  soundCloud: optionalUrlSchema,
  deezer: optionalUrlSchema,
  beatport: optionalUrlSchema
});

export const joinApplicationSchema = z.object({
  locale: localeSchema,
  turnstileToken: z.string().min(10, 'Turnstile token is required.'),
  honeypot: z.string().optional().default(''),
  profile: z.object({
    legalName: z.string().trim().min(2).max(120),
    artistName: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().trim().min(6).max(40).optional()
    ),
    city: z.string().trim().min(2).max(120),
    country: z.string().trim().min(2).max(120),
    projectType: z.enum(['solo', 'duo', 'band', 'producer', 'dj', 'other']),
    yearsActive: z.coerce.number().int().nonnegative().max(80),
    primaryGenre: z.string().trim().min(2).max(80),
    secondaryGenres: z.array(z.string().trim().min(2).max(80)).max(10)
  }),
  socialLinks: socialLinksSchema,
  streamingLinks: streamingLinksSchema,
  releaseHistory: z.object({
    notableReleases: z.array(z.string().trim().min(2).max(200)).max(10),
    releaseSummary: z.string().trim().min(20).max(1600)
  }),
  audienceAnalytics: z.object({
    monthlyListeners: optionalNumberSchema,
    totalFollowers: optionalNumberSchema,
    averageStreamsPerRelease: optionalNumberSchema,
    topMarkets: z.array(z.string().trim().min(2).max(120)).max(10)
  }),
  budgetAndResources: z.object({
    monthlyMarketingBudgetEur: optionalNumberSchema,
    productionBudgetPerTrackEur: optionalNumberSchema,
    teamDescription: z.string().trim().min(10).max(1200)
  }),
  planning: z.object({
    releaseFrequency: z.string().trim().min(5).max(160),
    roadmap90Days: z.string().trim().min(30).max(3000)
  }),
  objectives: z.object({
    goals12Months: z.string().trim().min(30).max(3000),
    whyNyvoro: z.string().trim().min(30).max(3000)
  }),
  message: z.string().trim().min(20).max(3000),
  consent: z.literal(true)
});

export type JoinApplicationInput = z.infer<typeof joinApplicationSchema>;

export type ArtistDiscographyEntry = {
  title: string;
  year: number;
  format: string;
  platforms: Record<string, string>;
};

export type ArtistProfile = {
  mainLanguage: Record<Locale, string>;
  targetTerritory: Record<Locale, string>;
  positioning: Record<Locale, string>;
  conceptSummary: Record<Locale, string>;
  conceptAxes: Record<Locale, string[]>;
  soundDna: Record<Locale, string[]>;
  visualUniverse: Record<Locale, string[]>;
  keyThemes: Record<Locale, string[]>;
};

export type Artist = {
  id: string;
  name: string;
  genres: string[];
  basedIn: string;
  portrait?: string;
  profile: ArtistProfile;
  bio: Record<Locale, string>;
  links: Record<string, string>;
  discography: ArtistDiscographyEntry[];
};

export type Release = {
  id: string;
  artistId: string;
  title: Record<Locale, string>;
  releaseDate: string;
  artwork: string;
  links: Record<string, string>;
  description: Record<Locale, string>;
};

export type LabelMetadata = {
  name: string;
  foundedYear: number;
  distributor: string;
  mission: Record<Locale, string>;
};
