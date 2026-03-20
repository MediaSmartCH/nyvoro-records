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

export const joinApplicationEditableSchema = joinApplicationSchema.omit({
  turnstileToken: true,
  honeypot: true
});

export type JoinApplicationEditableInput = z.infer<typeof joinApplicationEditableSchema>;

export const authRoleSchema = z.enum(['admin', 'artist']);
export type AuthRole = z.infer<typeof authRoleSchema>;

export const authLoginStartSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(12).max(160),
  turnstileToken: z.string().min(10, 'Turnstile token is required.'),
  honeypot: z.string().optional().default('')
});

export type AuthLoginStartInput = z.infer<typeof authLoginStartSchema>;

export const authRegisterSchema = z.object({
  role: authRoleSchema,
  email: z.string().trim().email(),
  password: z.string().min(12).max(160),
  turnstileToken: z.string().min(10, 'Turnstile token is required.'),
  honeypot: z.string().optional().default('')
});

export type AuthRegisterInput = z.infer<typeof authRegisterSchema>;

export const authLoginMfaVerifySchema = z.object({
  mfaToken: z.string().trim().min(20),
  code: z.string().trim().regex(/^\d{6}$/)
});

export type AuthLoginMfaVerifyInput = z.infer<typeof authLoginMfaVerifySchema>;

export const authLoginMfaChallengeResponseSchema = z.object({
  status: z.literal('mfa_required'),
  role: z.literal('admin'),
  email: z.string().trim().email(),
  mfaToken: z.string().trim().min(20)
});

export type AuthLoginMfaChallengeResponse = z.infer<typeof authLoginMfaChallengeResponseSchema>;

export const contactMessageChannelSchema = z.enum(['general', 'press', 'demos']);
export type ContactMessageChannel = z.infer<typeof contactMessageChannelSchema>;

export const contactMessageStatusSchema = z.enum(['open', 'resolved']);
export type ContactMessageStatus = z.infer<typeof contactMessageStatusSchema>;

export const contactMessageCreateSchema = z.object({
  locale: localeSchema,
  channel: contactMessageChannelSchema,
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(20).max(3000),
  turnstileToken: z.string().min(10, 'Turnstile token is required.'),
  honeypot: z.string().optional().default('')
});

export type ContactMessageCreateInput = z.infer<typeof contactMessageCreateSchema>;

export const adminDashboardResponseSchema = z.object({
  status: z.literal('ok'),
  summary: z.object({
    totalApplications: z.number().int().nonnegative(),
    applicationsLast7Days: z.number().int().nonnegative(),
    applicationsEmailPendingOrFailed: z.number().int().nonnegative(),
    openContactMessages: z.number().int().nonnegative()
  }),
  recentApplications: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
      locale: localeSchema,
      artistName: z.string(),
      email: z.string(),
      emailStatus: z.enum(['pending', 'sent', 'failed'])
    })
  ),
  recentContactMessages: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
      locale: localeSchema,
      channel: contactMessageChannelSchema,
      fullName: z.string(),
      email: z.string(),
      subject: z.string(),
      status: contactMessageStatusSchema
    })
  )
});

export type AdminDashboardResponse = z.infer<typeof adminDashboardResponseSchema>;

const optionalProfileNameSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string().max(80).optional().default('')
);

export const accountProfileUpdateSchema = z.object({
  firstName: optionalProfileNameSchema,
  lastName: optionalProfileNameSchema,
  email: z.string().trim().email()
});

export type AccountProfileUpdateInput = z.infer<typeof accountProfileUpdateSchema>;

export const accountPasswordUpdateSchema = z
  .object({
    currentPassword: z.string().min(12).max(160),
    newPassword: z.string().min(12).max(160)
  })
  .refine((input) => input.currentPassword !== input.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from current password.'
  });

export type AccountPasswordUpdateInput = z.infer<typeof accountPasswordUpdateSchema>;

export const accountMfaVerifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/)
});

export type AccountMfaVerifyInput = z.infer<typeof accountMfaVerifySchema>;

export type ArtistDiscographyEntry = {
  title: string;
  year: number;
  format: string;
  platforms: Record<string, string>;
};

function isAssetPathOrUrl(value: string): boolean {
  if (value.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const assetPathOrUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => isAssetPathOrUrl(value), 'Expected a root-relative asset path or a valid URL.');

const localizedTextSchema = z.object({
  en: z.string().trim().min(1).max(4000),
  fr: z.string().trim().min(1).max(4000)
});

const localizedListSchema = z.object({
  en: z.array(z.string().trim().min(1).max(240)).max(24),
  fr: z.array(z.string().trim().min(1).max(240)).max(24)
});

const contentLinksSchema = z.record(z.string().trim().min(1).max(80), z.string().trim().url());

export const releaseFormatSchema = z.enum(['single', 'ep', 'album']);
export type ReleaseFormat = z.infer<typeof releaseFormatSchema>;

export const releaseStatusSchema = z.enum(['draft', 'scheduled', 'published']);
export type ReleaseStatus = z.infer<typeof releaseStatusSchema>;

export const releaseTrackSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(160),
  version: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(120).optional()
  ),
  duration: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(20).optional()
  ),
  isFocusTrack: z.boolean().default(false)
});

export type ReleaseTrack = z.infer<typeof releaseTrackSchema>;

export const adminCatalogArtistSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  genres: z.array(z.string().trim().min(1).max(80)).max(12),
  basedIn: z.string().trim().min(1).max(160),
  portrait: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    assetPathOrUrlSchema.optional()
  ),
  profile: z.object({
    mainLanguage: localizedTextSchema,
    targetTerritory: localizedTextSchema,
    positioning: localizedTextSchema,
    conceptSummary: localizedTextSchema,
    conceptAxes: localizedListSchema,
    soundDna: localizedListSchema,
    visualUniverse: localizedListSchema,
    keyThemes: localizedListSchema
  }),
  bio: localizedTextSchema,
  links: contentLinksSchema
});

export type AdminCatalogArtist = z.infer<typeof adminCatalogArtistSchema>;

export const adminCatalogReleaseSchema = z.object({
  id: z.string().trim().min(1).max(120),
  artistId: z.string().trim().min(1).max(120),
  title: localizedTextSchema,
  releaseDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  artwork: assetPathOrUrlSchema,
  links: contentLinksSchema,
  description: localizedTextSchema,
  format: releaseFormatSchema,
  status: releaseStatusSchema,
  tracks: z.array(releaseTrackSchema).min(1).max(40)
});

export type AdminCatalogRelease = z.infer<typeof adminCatalogReleaseSchema>;

export const adminCatalogSnapshotSchema = z
  .object({
    artists: z.array(adminCatalogArtistSchema),
    releases: z.array(adminCatalogReleaseSchema)
  })
  .superRefine((snapshot, context) => {
    const artistIds = new Set<string>();
    const releaseIds = new Set<string>();

    snapshot.artists.forEach((artist, index) => {
      if (artistIds.has(artist.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['artists', index, 'id'],
          message: 'Artist ids must be unique.'
        });
        return;
      }

      artistIds.add(artist.id);
    });

    snapshot.releases.forEach((release, index) => {
      if (releaseIds.has(release.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['releases', index, 'id'],
          message: 'Release ids must be unique.'
        });
      } else {
        releaseIds.add(release.id);
      }

      if (!artistIds.has(release.artistId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['releases', index, 'artistId'],
          message: 'Every release must reference an existing artist.'
        });
      }
    });
  });

export type AdminCatalogSnapshot = z.infer<typeof adminCatalogSnapshotSchema>;

export const adminCatalogResponseSchema = z.object({
  status: z.literal('ok'),
  artists: z.array(adminCatalogArtistSchema),
  releases: z.array(adminCatalogReleaseSchema)
});

export type AdminCatalogResponse = z.infer<typeof adminCatalogResponseSchema>;

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
  format?: ReleaseFormat;
  status?: ReleaseStatus;
  tracks?: ReleaseTrack[];
};

export type LabelMetadata = {
  name: string;
  foundedYear: number;
  distributor: string;
  mission: Record<Locale, string>;
};
