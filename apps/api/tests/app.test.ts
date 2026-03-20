import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { AdminCatalogSnapshot } from '@nyvoro/shared-types';
import { createApp } from '../src/app.js';
import { createDatabase as createBaseDatabase, insertAuthUser } from '../src/db.js';
import type { AppConfig } from '../src/config.js';
import type { ContentStore } from '../src/content-store.js';
import { createPasswordHash, createSignedSessionToken, generateTotpCodeFromSecret } from '../src/security.js';

const adminPassword = 'AdminStrongPassword!2026';
const artistPassword = 'ArtistStrongPassword!2026';
const testAuthUsers = {
  admin: {
    email: 'admin@nyvoro-records.com',
    passwordHash: createPasswordHash(adminPassword),
    totpSecret: 'JBSWY3DPEHPK3PXP'
  },
  artist: {
    email: 'artist@nyvoro-records.com',
    passwordHash: createPasswordHash(artistPassword),
    totpSecret: 'KRSXG5DSNFXGOIDB'
  }
} as const;

const baseConfig: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  allowedOrigins: ['http://localhost:5173'],
  databaseUrl: ':memory:',
  turnstileSecretKey: 'test-secret',
  turnstileVerifyUrl: 'https://example.test/turnstile',
  turnstileBypass: false,
  rateLimitWindowMs: 60_000,
  rateLimitMax: 5,
  smtp: {
    host: 'localhost',
    port: 1025,
    secure: false,
    user: 'test',
    pass: 'test',
    from: 'no-reply@nyvoro-records.com',
    recipientEmail: 'contact@nyvoro-records.com',
    logoUrl: 'https://www.nyvoro-records.com/favicon.svg'
  },
  ipHashSalt: 'test-salt',
  magicLinkSalt: 'test-magic-salt',
  trustProxy: false,
  auth: {
    sessionSecret: 'session-secret-with-at-least-thirty-two-characters',
    sessionTtlMinutes: 30,
    rateLimitWindowMs: 60_000,
    rateLimitMax: 5,
    mfaChallengeTtlMinutes: 5
  },
  publicWebBaseUrl: 'https://www.nyvoro-records.com',
  webDistDir: '/tmp/does-not-exist',
  serveWebDist: false
};

afterEach(() => {
  vi.restoreAllMocks();
});

function seedDefaultAuthUsers(
  db: ReturnType<typeof createBaseDatabase>,
  options: {
    adminMfaEnabled?: boolean;
    artistMfaEnabled?: boolean;
  } = {}
) {
  insertAuthUser(db, {
    id: 'test-admin-account',
    role: 'admin',
    email: testAuthUsers.admin.email,
    password_hash: testAuthUsers.admin.passwordHash,
    totp_secret: testAuthUsers.admin.totpSecret,
    totp_enabled: options.adminMfaEnabled ?? false,
    is_temporary: false
  });

  insertAuthUser(db, {
    id: 'test-artist-account',
    role: 'artist',
    email: testAuthUsers.artist.email,
    password_hash: testAuthUsers.artist.passwordHash,
    totp_secret: testAuthUsers.artist.totpSecret,
    totp_enabled: options.artistMfaEnabled ?? false,
    is_temporary: false
  });
}

function createDatabase(
  databasePath = ':memory:',
  options: {
    seedAuthUsers?: boolean;
    adminMfaEnabled?: boolean;
    artistMfaEnabled?: boolean;
  } = {}
) {
  const db = createBaseDatabase(databasePath);

  if (options.seedAuthUsers !== false) {
    const seedOptions: {
      adminMfaEnabled?: boolean;
      artistMfaEnabled?: boolean;
    } = {};

    if (typeof options.adminMfaEnabled === 'boolean') {
      seedOptions.adminMfaEnabled = options.adminMfaEnabled;
    }

    if (typeof options.artistMfaEnabled === 'boolean') {
      seedOptions.artistMfaEnabled = options.artistMfaEnabled;
    }

    seedDefaultAuthUsers(db, seedOptions);
  }

  return db;
}

function cloneCatalogSnapshot(snapshot: AdminCatalogSnapshot): AdminCatalogSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as AdminCatalogSnapshot;
}

function createMemoryContentStore(initialSnapshot: AdminCatalogSnapshot): ContentStore & {
  getSnapshot: () => AdminCatalogSnapshot;
} {
  let snapshot = cloneCatalogSnapshot(initialSnapshot);

  return {
    readCatalog() {
      return cloneCatalogSnapshot(snapshot);
    },
    writeCatalog(nextSnapshot) {
      snapshot = cloneCatalogSnapshot(nextSnapshot);
      return cloneCatalogSnapshot(snapshot);
    },
    getSnapshot() {
      return cloneCatalogSnapshot(snapshot);
    }
  };
}

const baseCatalogSnapshot: AdminCatalogSnapshot = {
  artists: [
    {
      id: 'lumeno',
      name: 'Lúmeno',
      genres: ['Latin Pop', 'Reggaeton Suave'],
      basedIn: 'Latino market / international Spanish-speaking',
      portrait: '/images/lumeno-profile.png',
      profile: {
        mainLanguage: {
          en: 'Spanish',
          fr: 'Espagnol'
        },
        targetTerritory: {
          en: 'Latino market / international Spanish-speaking',
          fr: 'Marche latino / international hispanophone'
        },
        positioning: {
          en: 'Nocturnal, sensual, emotional, cinematic.',
          fr: 'Nocturne, sensuel, emotionnel, cinematographique.'
        },
        conceptSummary: {
          en: 'A cohesive night-city Latin pop project.',
          fr: 'Un projet latin coherent de nuit urbaine.'
        },
        conceptAxes: {
          en: ['Desire vs restraint'],
          fr: ['Desir et retenue']
        },
        soundDna: {
          en: ['Modern mid-tempo reggaeton'],
          fr: ['Mid-tempo reggaeton moderne']
        },
        visualUniverse: {
          en: ['Night blue and neon red palette'],
          fr: ['Palette bleu nuit et rouge neon']
        },
        keyThemes: {
          en: ['Ambiguous relationships'],
          fr: ['Relations ambigues']
        }
      },
      bio: {
        en: 'Late-night emotional storytelling.',
        fr: 'Narration emotionnelle nocturne.'
      },
      links: {
        spotify: 'https://open.spotify.com/artist/lumeno',
        youtube: 'https://www.youtube.com/@lumeno_music'
      }
    }
  ],
  releases: [
    {
      id: 'noche-que-se-repite',
      artistId: 'lumeno',
      title: {
        en: 'Noche Que Se Repite',
        fr: 'Noche Que Se Repite'
      },
      releaseDate: '2026-02-20',
      artwork: 'https://example.com/noche.jpg',
      links: {
        spotify: 'https://open.spotify.com/track/noche'
      },
      description: {
        en: 'Opening single of the 2026 cycle.',
        fr: 'Single d ouverture du cycle 2026.'
      },
      format: 'single',
      status: 'published',
      tracks: [
        {
          id: 'noche-track-1',
          title: 'Noche Que Se Repite',
          isFocusTrack: true
        }
      ]
    }
  ]
};

function buildPayload() {
  return {
    locale: 'en',
    turnstileToken: 'token_1234567890',
    honeypot: '',
    profile: {
      legalName: 'Alex Martin',
      artistName: 'Lumina Nova',
      email: 'alex@example.com',
      phone: '',
      city: 'Paris',
      country: 'France',
      projectType: 'solo',
      yearsActive: 4,
      primaryGenre: 'Melodic House',
      secondaryGenres: ['Electronica']
    },
    socialLinks: {
      instagram: '',
      tiktok: '',
      youtube: 'https://youtube.com/@luminanova',
      x: '',
      website: ''
    },
    streamingLinks: {
      spotify: 'https://open.spotify.com/artist/example',
      appleMusic: '',
      soundCloud: '',
      deezer: '',
      beatport: ''
    },
    releaseHistory: {
      notableReleases: ['Aurora Echo'],
      releaseSummary: 'Released one EP and two singles with independent promo support.'
    },
    audienceAnalytics: {
      monthlyListeners: 12000,
      totalFollowers: 9000,
      averageStreamsPerRelease: 46000,
      topMarkets: ['France', 'Germany']
    },
    budgetAndResources: {
      monthlyMarketingBudgetEur: 1200,
      productionBudgetPerTrackEur: 600,
      teamDescription: 'Manager plus freelance visual designer and mix engineer.'
    },
    planning: {
      releaseFrequency: 'One single every 6 weeks',
      roadmap90Days: 'Two singles ready, one live session planned, and collab outreach in progress.'
    },
    objectives: {
      goals12Months: 'Reach 200k monthly listeners and build a consistent touring profile in Europe.',
      whyNyvoro:
        'Nyvoro combines artistic direction and strategic release execution, which is exactly what this project needs.'
    },
    message: 'I am ready to build a long-term project with a clear release and growth discipline.',
    consent: true
  };
}

function extractQueryParamFromLink(link: string, key: string): string {
  const value = new URL(link).searchParams.get(key);
  if (!value) {
    throw new Error(`Query param "${key}" missing in link: ${link}`);
  }

  return value;
}

function toEditablePayloadForTest() {
  const payload = buildPayload();

  return {
    locale: payload.locale,
    profile: payload.profile,
    socialLinks: payload.socialLinks,
    streamingLinks: payload.streamingLinks,
    releaseHistory: payload.releaseHistory,
    audienceAnalytics: payload.audienceAnalytics,
    budgetAndResources: payload.budgetAndResources,
    planning: payload.planning,
    objectives: payload.objectives,
    message: payload.message,
    consent: payload.consent
  };
}

function buildLoginPayload(role: 'admin' | 'artist' = 'admin') {
  const email = role === 'admin' ? testAuthUsers.admin.email : testAuthUsers.artist.email;
  const password = role === 'admin' ? adminPassword : artistPassword;

  return {
    email,
    password,
    turnstileToken: 'token_1234567890',
    honeypot: ''
  };
}

function buildContactMessagePayload() {
  return {
    locale: 'en',
    channel: 'general',
    fullName: 'Taylor Martin',
    email: 'taylor@example.com',
    subject: 'Partnership inquiry',
    message:
      'Hello Nyvoro team, we would like to discuss a potential collaboration around an upcoming release campaign.',
    turnstileToken: 'token_1234567890',
    honeypot: ''
  };
}

describe('API health endpoint', () => {
  it('returns an API landing page on root path when web dist is missing', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('Nyvoro Records');
    expect(response.text).toContain('/api/v1/health');
    expect(response.text).toContain('/api/v1/applications');
    expect(response.text).toContain('/api-assets/favicon-api.svg');
  });

  it('returns status ok', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('serves the API favicon asset', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).get('/api-assets/favicon-api.svg');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/svg+xml');
    expect(response.body.toString()).toContain('API');
  });
});

describe('Authentication endpoints', () => {
  it('bypasses captcha verification in development mode', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: {
        ...baseConfig,
        nodeEnv: 'development',
        turnstileBypass: false
      },
      db,
      verifyCaptcha: async (input) =>
        input.bypass ? { success: true, errors: [] } : { success: false, errors: ['forced_failure'] },
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).post('/api/v1/auth/login').send(buildLoginPayload('admin'));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.role).toBe('admin');
  });

  it('does not seed auth users automatically on startup', async () => {
    const db = createDatabase(':memory:', { seedAuthUsers: false });

    createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const row = db.prepare('SELECT COUNT(*) AS total FROM auth_users').get() as { total: number };
    expect(row.total).toBe(0);
  });

  it('creates a new account and allows login', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const registerResponse = await request(app).post('/api/v1/auth/register').send({
      role: 'artist',
      email: 'new-artist@example.com',
      password: 'NewArtistStrongPass!2026',
      turnstileToken: 'token_1234567890',
      honeypot: ''
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.status).toBe('ok');
    expect(registerResponse.body.email).toBe('new-artist@example.com');

    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      email: 'new-artist@example.com',
      password: 'NewArtistStrongPass!2026',
      turnstileToken: 'token_1234567890',
      honeypot: ''
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.shouldSetupTwoFactor).toBe(true);
  });

  it('rejects public admin registration', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const registerResponse = await request(app).post('/api/v1/auth/register').send({
      role: 'admin',
      email: 'new-admin@example.com',
      password: 'NewAdminStrongPass!2026',
      turnstileToken: 'token_1234567890',
      honeypot: ''
    });

    expect(registerResponse.status).toBe(403);
    expect(registerResponse.body.code).toBe('registration_closed_for_role');
  });

  it('authenticates admin login and exposes a valid session', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const client = request.agent(app);

    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.status).toBe('ok');
    expect(loginResponse.body.role).toBe('admin');
    expect(loginResponse.headers['set-cookie']).toBeDefined();

    const sessionResponse = await client.get('/api/v1/auth/session');

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body.authenticated).toBe(true);
    expect(sessionResponse.body.role).toBe('admin');
    expect(sessionResponse.body.email).toBe('admin@nyvoro-records.com');
    expect(sessionResponse.body.shouldSetupTwoFactor).toBe(true);
  });

  it('detects the correct role automatically when the same email exists on multiple accounts', async () => {
    const db = createBaseDatabase(':memory:');
    const sharedEmail = 'shared-login@example.com';

    insertAuthUser(db, {
      id: 'shared-admin-account',
      role: 'admin',
      email: sharedEmail,
      password_hash: createPasswordHash('SharedAdminPassword!2026'),
      totp_secret: null,
      totp_enabled: false,
      is_temporary: false
    });

    insertAuthUser(db, {
      id: 'shared-artist-account',
      role: 'artist',
      email: sharedEmail,
      password_hash: createPasswordHash('SharedArtistPassword!2026'),
      totp_secret: null,
      totp_enabled: false,
      is_temporary: false
    });

    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const adminLoginResponse = await request(app).post('/api/v1/auth/login').send({
      email: sharedEmail,
      password: 'SharedAdminPassword!2026',
      turnstileToken: 'token_1234567890',
      honeypot: ''
    });

    expect(adminLoginResponse.status).toBe(200);
    expect(adminLoginResponse.body.role).toBe('admin');

    const artistLoginResponse = await request(app).post('/api/v1/auth/login').send({
      email: sharedEmail,
      password: 'SharedArtistPassword!2026',
      turnstileToken: 'token_1234567890',
      honeypot: ''
    });

    expect(artistLoginResponse.status).toBe(200);
    expect(artistLoginResponse.body.role).toBe('artist');
  });

  it('requires MFA challenge completion for admins with MFA enabled', async () => {
    const db = createDatabase(':memory:', { adminMfaEnabled: true });
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const loginResponse = await request(app).post('/api/v1/auth/login').send(buildLoginPayload('admin'));

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.status).toBe('mfa_required');
    expect(loginResponse.body.role).toBe('admin');
    expect(typeof loginResponse.body.mfaToken).toBe('string');
    expect(loginResponse.headers['set-cookie']).toBeUndefined();
  });

  it('verifies MFA challenge and issues a session cookie for admins', async () => {
    const db = createDatabase(':memory:', { adminMfaEnabled: true });
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const loginResponse = await request(app).post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.status).toBe('mfa_required');

    const generatedCode = generateTotpCodeFromSecret({
      secret: testAuthUsers.admin.totpSecret
    });
    expect(generatedCode).toBeDefined();

    const verifyResponse = await request(app).post('/api/v1/auth/login/verify-mfa').send({
      mfaToken: loginResponse.body.mfaToken,
      code: generatedCode
    });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.status).toBe('ok');
    expect(verifyResponse.body.role).toBe('admin');
    expect(verifyResponse.headers['set-cookie']).toBeDefined();
  });

  it('rejects invalid MFA verification codes for admin login challenges', async () => {
    const db = createDatabase(':memory:', { adminMfaEnabled: true });
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const loginResponse = await request(app).post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.status).toBe('mfa_required');

    const verifyResponse = await request(app).post('/api/v1/auth/login/verify-mfa').send({
      mfaToken: loginResponse.body.mfaToken,
      code: '123456'
    });

    expect(verifyResponse.status).toBe(400);
    expect(verifyResponse.body.code).toBe('invalid_totp_code');
  });

  it('returns session_expired when an expired signed cookie is provided', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const now = Date.now();
    const expiredSessionToken = createSignedSessionToken({
      secret: baseConfig.auth.sessionSecret,
      payload: {
        role: 'admin',
        email: 'admin@nyvoro-records.com',
        issuedAt: now - 120_000,
        expiresAt: now - 60_000,
        nonce: 'expired-session-token-test'
      }
    });

    const response = await request(app)
      .get('/api/v1/auth/session')
      .set('Cookie', [`nyvoro_secure_session=${encodeURIComponent(expiredSessionToken)}`]);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.authenticated).toBe(false);
    expect(response.body.code).toBe('session_expired');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('rejects invalid credentials with a generic auth error', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const invalidPayload = {
      ...buildLoginPayload('artist'),
      password: 'wrong-password-for-test'
    };

    const response = await request(app).post('/api/v1/auth/login').send(invalidPayload);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('invalid_credentials');
  });

  it('enforces auth rate limit independently', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: {
        ...baseConfig,
        auth: {
          ...baseConfig.auth,
          rateLimitMax: 1,
          rateLimitWindowMs: 60_000
        }
      },
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const payload = buildLoginPayload('artist');

    const first = await request(app).post('/api/v1/auth/login').send(payload);
    const second = await request(app).post('/api/v1/auth/login').send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.body.code).toBe('auth_rate_limited');
  });
});

describe('POST /api/v1/applications', () => {
  it('rejects honeypot submissions', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const payload = buildPayload();
    payload.honeypot = 'spam';

    const response = await request(app).post('/api/v1/applications').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('spam_detected');
  });

  it('rejects invalid captcha', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: false, errors: ['invalid-input-response'] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).post('/api/v1/applications').send(buildPayload());

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('captcha_invalid');
  });

  it('stores submission and marks as sent when email succeeds', async () => {
    const db = createDatabase(':memory:');
    const { app, getApplicationById } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).post('/api/v1/applications').send(buildPayload());

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('ok');
    expect(response.body.profileLinks.viewUrl).toContain('/en/application-profile/');
    expect(response.body.profileLinks.editUrl).toContain('/en/join?applicationId=');

    const stored = getApplicationById(response.body.applicationId);
    expect(stored?.email_status).toBe('sent');
  });

  it('stores submission even if email fails', async () => {
    const db = createDatabase(':memory:');
    const { app, getApplicationById } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => {
        throw new Error('smtp down');
      }
    });

    const response = await request(app).post('/api/v1/applications').send(buildPayload());

    expect(response.status).toBe(202);
    expect(response.body.status).toBe('stored_with_email_error');

    const stored = getApplicationById(response.body.applicationId);
    expect(stored?.email_status).toBe('failed');
  });

  it('enforces rate limit', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: {
        ...baseConfig,
        rateLimitMax: 1,
        rateLimitWindowMs: 60_000
      },
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const payload = buildPayload();

    const first = await request(app).post('/api/v1/applications').send(payload);
    const second = await request(app).post('/api/v1/applications').send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(429);
  });
});

describe('POST /api/v1/contact-messages', () => {
  it('stores a valid contact message', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).post('/api/v1/contact-messages').send(buildContactMessagePayload());

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.messageId).toBe('string');
    expect((response.body.messageId as string).length).toBeGreaterThan(8);
  });

  it('rejects honeypot contact messages', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const payload = buildContactMessagePayload();
    payload.honeypot = 'bot-spam';

    const response = await request(app).post('/api/v1/contact-messages').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('spam_detected');
  });

  it('rejects invalid captcha contact messages', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: {
        ...baseConfig,
        nodeEnv: 'production'
      },
      db,
      verifyCaptcha: async () => ({ success: false, errors: ['invalid-input-response'] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).post('/api/v1/contact-messages').send(buildContactMessagePayload());

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('captcha_invalid');
  });

  it('rejects invalid contact message payloads', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const invalidPayload = {
      ...buildContactMessagePayload(),
      subject: 'a'
    };

    const response = await request(app).post('/api/v1/contact-messages').send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('validation_error');
  });
});

describe('Admin dashboard endpoints', () => {
  it('returns 401 for unauthenticated admin dashboard requests', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).get('/api/v1/admin/dashboard');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('auth_required');
  });

  it('returns 403 when an artist session requests admin dashboard', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('artist'));
    expect(loginResponse.status).toBe(200);

    const response = await client.get('/api/v1/admin/dashboard');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('forbidden');
  });

  it('returns aggregated dashboard data for authenticated admin sessions', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => {
        throw new Error('smtp down');
      }
    });

    const createApplicationResponse = await request(app).post('/api/v1/applications').send(buildPayload());
    expect(createApplicationResponse.status).toBe(202);

    const createContactResponse = await request(app)
      .post('/api/v1/contact-messages')
      .send(buildContactMessagePayload());
    expect(createContactResponse.status).toBe(201);

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const dashboardResponse = await client.get('/api/v1/admin/dashboard');

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.status).toBe('ok');
    expect(dashboardResponse.body.summary.totalApplications).toBeGreaterThanOrEqual(1);
    expect(dashboardResponse.body.summary.applicationsLast7Days).toBeGreaterThanOrEqual(1);
    expect(dashboardResponse.body.summary.applicationsEmailPendingOrFailed).toBeGreaterThanOrEqual(1);
    expect(dashboardResponse.body.summary.openContactMessages).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(dashboardResponse.body.recentApplications)).toBe(true);
    expect(Array.isArray(dashboardResponse.body.recentContactMessages)).toBe(true);
    expect(dashboardResponse.body.recentApplications[0].artistName).toBe('Lumina Nova');
    expect(dashboardResponse.body.recentContactMessages[0].status).toBe('open');
  });

  it('returns the editable content catalog for authenticated admins', async () => {
    const db = createDatabase(':memory:');
    const contentStore = createMemoryContentStore(baseCatalogSnapshot);
    const { app } = createApp({
      config: baseConfig,
      db,
      contentStore,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const response = await client.get('/api/v1/admin/catalog');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.artists[0].name).toBe('Lúmeno');
    expect(response.body.releases[0].title.en).toBe('Noche Que Se Repite');
    expect(response.body.releases[0].tracks[0].title).toBe('Noche Que Se Repite');
  });

  it('saves catalog edits and new releases for authenticated admins', async () => {
    const db = createDatabase(':memory:');
    const contentStore = createMemoryContentStore(baseCatalogSnapshot);
    const { app } = createApp({
      config: baseConfig,
      db,
      contentStore,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const payload = cloneCatalogSnapshot(baseCatalogSnapshot);
    payload.releases.push({
      id: 'linea-roja',
      artistId: 'lumeno',
      title: {
        en: 'Línea Roja',
        fr: 'Línea Roja'
      },
      releaseDate: '2026-05-29',
      artwork: 'https://example.com/linea-roja.jpg',
      links: {
        spotify: 'https://open.spotify.com/track/linea-roja'
      },
      description: {
        en: 'The red-line moment of the narrative.',
        fr: 'Le point de bascule de la narration.'
      },
      format: 'single',
      status: 'scheduled',
      tracks: [
        {
          id: 'linea-roja-track-1',
          title: 'Línea Roja',
          isFocusTrack: true
        }
      ]
    });

    const response = await client.put('/api/v1/admin/catalog').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.releases).toHaveLength(2);
    expect(contentStore.getSnapshot().releases).toHaveLength(2);
    expect(contentStore.getSnapshot().releases[1]?.id).toBe('linea-roja');
  });

  it('marks a contact message as resolved with admin session', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const createContactResponse = await request(app)
      .post('/api/v1/contact-messages')
      .send(buildContactMessagePayload());
    expect(createContactResponse.status).toBe(201);
    const messageId = createContactResponse.body.messageId as string;

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const response = await client.patch(`/api/v1/admin/contact-messages/${messageId}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.messageId).toBe(messageId);
    expect(response.body.newStatus).toBe('resolved');
  });

  it('keeps resolve endpoint idempotent for already resolved messages', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const createContactResponse = await request(app)
      .post('/api/v1/contact-messages')
      .send(buildContactMessagePayload());
    expect(createContactResponse.status).toBe(201);
    const messageId = createContactResponse.body.messageId as string;

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const firstResponse = await client.patch(`/api/v1/admin/contact-messages/${messageId}`);
    const secondResponse = await client.patch(`/api/v1/admin/contact-messages/${messageId}`);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.newStatus).toBe('resolved');
  });

  it('returns 401 and 403 for resolve endpoint with missing or wrong role', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const createContactResponse = await request(app)
      .post('/api/v1/contact-messages')
      .send(buildContactMessagePayload());
    expect(createContactResponse.status).toBe(201);
    const messageId = createContactResponse.body.messageId as string;

    const unauthenticatedResponse = await request(app).patch(`/api/v1/admin/contact-messages/${messageId}`);
    expect(unauthenticatedResponse.status).toBe(401);

    const artistClient = request.agent(app);
    const artistLoginResponse = await artistClient.post('/api/v1/auth/login').send(buildLoginPayload('artist'));
    expect(artistLoginResponse.status).toBe(200);

    const forbiddenResponse = await artistClient.patch(`/api/v1/admin/contact-messages/${messageId}`);
    expect(forbiddenResponse.status).toBe(403);
    expect(forbiddenResponse.body.code).toBe('forbidden');
  });

  it('returns 404 when trying to resolve a missing contact message', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const response = await client.patch('/api/v1/admin/contact-messages/missing-id');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('not_found');
  });
});

describe('Account settings endpoints', () => {
  it('returns 401 for unauthenticated account profile requests', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).get('/api/v1/account/profile');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('auth_required');
  });

  it('reads and updates authenticated account profile', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const profileResponse = await client.get('/api/v1/account/profile');
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.role).toBe('admin');
    expect(profileResponse.body.email).toBe('admin@nyvoro-records.com');
    expect(profileResponse.body.shouldSetupTwoFactor).toBe(true);

    const updateResponse = await client.patch('/api/v1/account/profile').send({
      firstName: 'Raphael',
      lastName: 'Rouiller',
      email: 'admin-updated@nyvoro-records.com'
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.firstName).toBe('Raphael');
    expect(updateResponse.body.lastName).toBe('Rouiller');
    expect(updateResponse.body.displayName).toBe('Raphael Rouiller');
    expect(updateResponse.body.email).toBe('admin-updated@nyvoro-records.com');

    const sessionResponse = await client.get('/api/v1/auth/session');
    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body.authenticated).toBe(true);
    expect(sessionResponse.body.email).toBe('admin-updated@nyvoro-records.com');
    expect(sessionResponse.body.firstName).toBe('Raphael');
    expect(sessionResponse.body.lastName).toBe('Rouiller');
  });

  it('rejects profile email update when already used in same role scope', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    insertAuthUser(db, {
      id: 'another-admin-account',
      role: 'admin',
      email: 'already-used-admin@example.com',
      password_hash: createPasswordHash('AnotherStrongAdminPass!2026'),
      totp_secret: null,
      totp_enabled: false,
      is_temporary: false
    });

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const updateResponse = await client.patch('/api/v1/account/profile').send({
      firstName: '',
      lastName: '',
      email: 'already-used-admin@example.com'
    });

    expect(updateResponse.status).toBe(409);
    expect(updateResponse.body.code).toBe('email_in_use');
  });

  it('rejects password change when current password is invalid', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const response = await client.post('/api/v1/account/password').send({
      currentPassword: 'WrongCurrentPassword!2026',
      newPassword: 'AdminUpdatedStrongPassword!2026'
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_current_password');
  });

  it('updates password and invalidates the previous password', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const newPassword = 'AdminUpdatedStrongPassword!2026';
    const changePasswordResponse = await client.post('/api/v1/account/password').send({
      currentPassword: adminPassword,
      newPassword
    });

    expect(changePasswordResponse.status).toBe(200);
    expect(changePasswordResponse.body.status).toBe('ok');
    expect(changePasswordResponse.headers['set-cookie']).toBeDefined();

    const oldPasswordLogin = await request(app).post('/api/v1/auth/login').send({
      ...buildLoginPayload('admin'),
      password: adminPassword
    });
    expect(oldPasswordLogin.status).toBe(401);
    expect(oldPasswordLogin.body.code).toBe('invalid_credentials');

    const newPasswordLogin = await request(app).post('/api/v1/auth/login').send({
      ...buildLoginPayload('admin'),
      password: newPassword
    });
    expect(newPasswordLogin.status).toBe(200);
    expect(newPasswordLogin.body.status).toBe('ok');
  });

  it('handles MFA setup, verify and disable flow', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const client = request.agent(app);
    const loginResponse = await client.post('/api/v1/auth/login').send(buildLoginPayload('admin'));
    expect(loginResponse.status).toBe(200);

    const setupResponse = await client.post('/api/v1/account/mfa/setup');
    expect(setupResponse.status).toBe(200);
    expect(setupResponse.body.status).toBe('ok');
    expect(typeof setupResponse.body.secret).toBe('string');

    const invalidVerifyResponse = await client.post('/api/v1/account/mfa/verify').send({ code: '123456' });
    expect(invalidVerifyResponse.status).toBe(400);
    expect(invalidVerifyResponse.body.code).toBe('invalid_totp_code');

    const generatedCode = generateTotpCodeFromSecret({
      secret: setupResponse.body.secret as string
    });
    expect(generatedCode).toBeDefined();

    const verifyResponse = await client
      .post('/api/v1/account/mfa/verify')
      .send({ code: generatedCode });
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.mfaEnabled).toBe(true);

    const profileAfterVerify = await client.get('/api/v1/account/profile');
    expect(profileAfterVerify.status).toBe(200);
    expect(profileAfterVerify.body.shouldSetupTwoFactor).toBe(false);

    const disableResponse = await client.post('/api/v1/account/mfa/disable');
    expect(disableResponse.status).toBe(200);
    expect(disableResponse.body.mfaEnabled).toBe(false);

    const profileAfterDisable = await client.get('/api/v1/account/profile');
    expect(profileAfterDisable.status).toBe(200);
    expect(profileAfterDisable.body.shouldSetupTwoFactor).toBe(true);
  });
});

describe('Application profile magic links', () => {
  it('allows view with a view token and update with an edit token', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const createResponse = await request(app).post('/api/v1/applications').send(buildPayload());
    expect(createResponse.status).toBe(201);

    const applicationId = createResponse.body.applicationId as string;
    const viewToken = extractQueryParamFromLink(
      createResponse.body.profileLinks.viewUrl as string,
      'token'
    );
    const editToken = extractQueryParamFromLink(
      createResponse.body.profileLinks.editUrl as string,
      'editToken'
    );

    const viewResponse = await request(app)
      .get(`/api/v1/applications/${applicationId}/profile`)
      .query({ token: viewToken });

    expect(viewResponse.status).toBe(200);
    expect(viewResponse.body.status).toBe('ok');
    expect(viewResponse.body.canEdit).toBe(false);
    expect(viewResponse.body.payload.profile.artistName).toBe('Lumina Nova');

    const editablePayload = toEditablePayloadForTest();
    editablePayload.profile.artistName = 'Lumina Nova Updated';
    editablePayload.message = 'Updated profile from magic link.';

    const updateWithViewToken = await request(app)
      .put(`/api/v1/applications/${applicationId}/profile`)
      .query({ token: viewToken })
      .send(editablePayload);

    expect(updateWithViewToken.status).toBe(401);

    const updateWithEditToken = await request(app)
      .put(`/api/v1/applications/${applicationId}/profile`)
      .query({ token: editToken })
      .send(editablePayload);

    expect(updateWithEditToken.status).toBe(200);
    expect(updateWithEditToken.body.status).toBe('ok');

    const viewWithEditToken = await request(app)
      .get(`/api/v1/applications/${applicationId}/profile`)
      .query({ token: editToken });

    expect(viewWithEditToken.status).toBe(200);
    expect(viewWithEditToken.body.canEdit).toBe(true);
    expect(viewWithEditToken.body.payload.profile.artistName).toBe('Lumina Nova Updated');
    expect(viewWithEditToken.body.payload.message).toBe('Updated profile from magic link.');
  });

  it('rejects access with an invalid token', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const createResponse = await request(app).post('/api/v1/applications').send(buildPayload());
    expect(createResponse.status).toBe(201);

    const applicationId = createResponse.body.applicationId as string;

    const response = await request(app)
      .get(`/api/v1/applications/${applicationId}/profile`)
      .query({ token: 'invalid-token' });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('invalid_token');
  });
});

describe('Global error handling', () => {
  it('returns JSON for unknown routes', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).get('/api/v1/unknown-route').set('Accept', 'application/json');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('route_not_found');
  });

  it('returns HTML for unknown routes when browser accepts HTML', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app).get('/api/v1/unknown-route').set('Accept', 'text/html');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('Route not found.');
  });

  it('returns JSON 500 for unhandled server errors', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => {
        throw new Error('turnstile service unavailable');
      },
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app)
      .post('/api/v1/applications')
      .set('Accept', 'application/json')
      .send(buildPayload());

    expect(response.status).toBe(500);
    expect(response.body.code).toBe('internal_error');
  });

  it('returns HTML 500 for unhandled errors when browser accepts HTML', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => {
        throw new Error('turnstile service unavailable');
      },
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app)
      .post('/api/v1/applications')
      .set('Accept', 'text/html')
      .send(buildPayload());

    expect(response.status).toBe(500);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('Unexpected server error.');
  });

  it('returns 403 when CORS origin is not allowed', async () => {
    const db = createDatabase(':memory:');
    const { app } = createApp({
      config: baseConfig,
      db,
      verifyCaptcha: async () => ({ success: true, errors: [] }),
      sendApplicationNotification: async () => undefined
    });

    const response = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://forbidden-origin.example')
      .set('Accept', 'application/json');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('cors_blocked');
  });
});
