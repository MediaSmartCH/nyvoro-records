import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/db.js';
import type { AppConfig } from '../src/config.js';

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
    recipientEmail: 'contact@nyvoro-records.com'
  },
  ipHashSalt: 'test-salt',
  webDistDir: '/tmp/does-not-exist',
  serveWebDist: false
};

afterEach(() => {
  vi.restoreAllMocks();
});

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
