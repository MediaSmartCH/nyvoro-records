import { describe, expect, it } from 'vitest';
import { parseAppConfig } from '../src/config.js';

function buildProductionEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    PORT: '4000',
    API_ALLOWED_ORIGINS: 'https://www.nyvoro-records.com',
    DATABASE_URL: '/tmp/nyvoro.db',
    TURNSTILE_SECRET_KEY: 'turnstile_live_secret',
    TURNSTILE_VERIFY_URL: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    TURNSTILE_BYPASS: 'false',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX: '10',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'live_user',
    SMTP_PASS: 'live_password',
    SMTP_FROM: 'no-reply@nyvoro-records.com',
    APPLICATION_RECIPIENT_EMAIL: 'demo@nyvoro-records.com',
    MAIL_LOGO_URL: 'https://www.nyvoro-records.com/favicon.svg',
    IP_HASH_SALT: 'production-ip-salt',
    MAGIC_LINK_SALT: 'production-magic-salt',
    AUTH_SESSION_SECRET: 'production-session-secret-with-more-than-thirty-two-characters',
    AUTH_SESSION_TTL_MINUTES: '30',
    AUTH_RATE_LIMIT_WINDOW_MS: '600000',
    AUTH_RATE_LIMIT_MAX: '5',
    TRUST_PROXY: '1',
    PUBLIC_WEB_BASE_URL: 'https://www.nyvoro-records.com',
    WEB_DIST_DIR: '/workspace/apps/web/dist',
    SERVE_WEB_DIST: 'true',
    ...overrides
  };
}

describe('parseAppConfig', () => {
  it('rejects placeholder production secrets', () => {
    expect(() =>
      parseAppConfig(
        buildProductionEnv({
          TURNSTILE_SECRET_KEY: 'turnstile_secret_placeholder',
          IP_HASH_SALT: 'change-this-in-production',
          MAGIC_LINK_SALT: 'change-this-too',
          AUTH_SESSION_SECRET: 'change-this-auth-session-secret-in-production',
          SMTP_USER: 'placeholder_user',
          SMTP_PASS: 'placeholder_password'
        })
      )
    ).toThrow(/Insecure production configuration/);
  });

  it('rejects turnstile bypass in production', () => {
    expect(() =>
      parseAppConfig(
        buildProductionEnv({
          TURNSTILE_BYPASS: 'true'
        })
      )
    ).toThrow(/TURNSTILE_BYPASS/);
  });
});
