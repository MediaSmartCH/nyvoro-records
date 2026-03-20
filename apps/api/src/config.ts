import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

loadDotenv();

const AUTH_MFA_CHALLENGE_TTL_MINUTES = 5;
const PLACEHOLDER_VALUES = {
  turnstileSecretKey: 'turnstile_secret_placeholder',
  smtpUser: 'placeholder_user',
  smtpPass: 'placeholder_password',
  ipHashSalt: 'change-this-in-production',
  magicLinkSalt: 'change-this-too',
  authSessionSecret: 'change-this-auth-session-secret-in-production'
} as const;

const defaultDatabaseUrl = process.env.VERCEL
  ? '/tmp/nyvoro.db'
  : path.resolve(process.cwd(), 'apps/api/data/nyvoro.db');

const defaultPublicWebBaseUrl = process.env.NODE_ENV === 'production'
  ? 'https://www.nyvoro-records.com'
  : 'http://localhost:5173';

export type TrustProxySetting = boolean | number | string;

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  allowedOrigins: string[];
  databaseUrl: string;
  turnstileSecretKey: string;
  turnstileVerifyUrl: string;
  turnstileBypass: boolean;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
    recipientEmail: string;
    logoUrl: string;
  };
  ipHashSalt: string;
  magicLinkSalt: string;
  trustProxy: TrustProxySetting;
  auth: {
    sessionSecret: string;
    sessionTtlMinutes: number;
    rateLimitWindowMs: number;
    rateLimitMax: number;
    mfaChallengeTtlMinutes: number;
  };
  publicWebBaseUrl: string;
  webDistDir: string;
  serveWebDist: boolean;
};

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseTrustProxy(value: string | undefined): TrustProxySetting {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return false;
  }

  if (/^\d+$/.test(normalized)) {
    const parsedNumber = Number.parseInt(normalized, 10);
    return parsedNumber === 0 ? false : parsedNumber;
  }

  const lowerCased = normalized.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(lowerCased)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(lowerCased)) {
    return false;
  }

  return normalized;
}

function hasUnsafePlaceholder(value: string, disallowedValues: string[]): boolean {
  const normalized = value.trim().toLowerCase();
  return disallowedValues.some((candidate) => normalized === candidate.toLowerCase());
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:4173'),
  // Vercel functions run on a read-only filesystem, so SQLite needs /tmp by default.
  DATABASE_URL: z.string().default(defaultDatabaseUrl),
  TURNSTILE_SECRET_KEY: z.string().default(PLACEHOLDER_VALUES.turnstileSecretKey),
  TURNSTILE_VERIFY_URL: z
    .string()
    .url()
    .default('https://challenges.cloudflare.com/turnstile/v0/siteverify'),
  TURNSTILE_BYPASS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  SMTP_HOST: z.string().default('smtp.example.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().default(PLACEHOLDER_VALUES.smtpUser),
  SMTP_PASS: z.string().default(PLACEHOLDER_VALUES.smtpPass),
  SMTP_FROM: z.string().email().default('no-reply@nyvoro-records.com'),
  APPLICATION_RECIPIENT_EMAIL: z.string().email().default('demo@nyvoro-records.com'),
  MAIL_LOGO_URL: z.string().url().optional(),
  IP_HASH_SALT: z.string().default(PLACEHOLDER_VALUES.ipHashSalt),
  MAGIC_LINK_SALT: z.string().optional(),
  AUTH_SESSION_SECRET: z.string().min(32).default(PLACEHOLDER_VALUES.authSessionSecret),
  AUTH_SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(10 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  TRUST_PROXY: z.string().optional(),
  PUBLIC_WEB_BASE_URL: z.string().url().default(defaultPublicWebBaseUrl),
  WEB_DIST_DIR: z.string().default(path.resolve(process.cwd(), 'apps/web/dist')),
  SERVE_WEB_DIST: z.string().optional()
});

type ParsedEnv = z.infer<typeof envSchema>;

function assertSecureProductionConfig(parsed: ParsedEnv): void {
  if (parsed.NODE_ENV !== 'production') {
    return;
  }

  const errors: string[] = [];
  const turnstileBypass = parseBoolean(parsed.TURNSTILE_BYPASS, false);

  if (turnstileBypass) {
    errors.push('TURNSTILE_BYPASS must be disabled in production.');
  }

  if (hasUnsafePlaceholder(parsed.TURNSTILE_SECRET_KEY, [PLACEHOLDER_VALUES.turnstileSecretKey])) {
    errors.push('TURNSTILE_SECRET_KEY must be replaced with a real secret in production.');
  }

  if (hasUnsafePlaceholder(parsed.AUTH_SESSION_SECRET, [PLACEHOLDER_VALUES.authSessionSecret])) {
    errors.push('AUTH_SESSION_SECRET must be replaced with a strong random secret in production.');
  }

  if (hasUnsafePlaceholder(parsed.IP_HASH_SALT, [PLACEHOLDER_VALUES.ipHashSalt])) {
    errors.push('IP_HASH_SALT must be replaced with a unique secret salt in production.');
  }

  const magicLinkSalt = parsed.MAGIC_LINK_SALT?.trim();
  if (!magicLinkSalt) {
    errors.push('MAGIC_LINK_SALT must be explicitly set in production.');
  } else {
    if (hasUnsafePlaceholder(magicLinkSalt, [PLACEHOLDER_VALUES.magicLinkSalt, PLACEHOLDER_VALUES.ipHashSalt])) {
      errors.push('MAGIC_LINK_SALT must be replaced with a unique secret salt in production.');
    }

    if (magicLinkSalt === parsed.IP_HASH_SALT) {
      errors.push('MAGIC_LINK_SALT must differ from IP_HASH_SALT in production.');
    }
  }

  if (hasUnsafePlaceholder(parsed.SMTP_USER, [PLACEHOLDER_VALUES.smtpUser])) {
    errors.push('SMTP_USER must be replaced with a real SMTP username in production.');
  }

  if (hasUnsafePlaceholder(parsed.SMTP_PASS, [PLACEHOLDER_VALUES.smtpPass])) {
    errors.push('SMTP_PASS must be replaced with a real SMTP password in production.');
  }

  if (errors.length > 0) {
    throw new Error(`[config] Insecure production configuration:\n- ${errors.join('\n- ')}`);
  }
}

export function parseAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  assertSecureProductionConfig(parsed);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    allowedOrigins: parsed.API_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
    databaseUrl: parsed.DATABASE_URL,
    turnstileSecretKey: parsed.TURNSTILE_SECRET_KEY,
    turnstileVerifyUrl: parsed.TURNSTILE_VERIFY_URL,
    turnstileBypass: parseBoolean(parsed.TURNSTILE_BYPASS, parsed.NODE_ENV === 'test'),
    rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    smtp: {
      host: parsed.SMTP_HOST,
      port: parsed.SMTP_PORT,
      secure: parseBoolean(parsed.SMTP_SECURE, false),
      user: parsed.SMTP_USER,
      pass: parsed.SMTP_PASS,
      from: parsed.SMTP_FROM,
      recipientEmail: parsed.APPLICATION_RECIPIENT_EMAIL,
      logoUrl: parsed.MAIL_LOGO_URL ?? `${normalizeBaseUrl(parsed.PUBLIC_WEB_BASE_URL)}/favicon.svg`
    },
    ipHashSalt: parsed.IP_HASH_SALT,
    magicLinkSalt: parsed.MAGIC_LINK_SALT?.trim() || parsed.IP_HASH_SALT,
    trustProxy: parseTrustProxy(parsed.TRUST_PROXY),
    auth: {
      sessionSecret: parsed.AUTH_SESSION_SECRET,
      sessionTtlMinutes: parsed.AUTH_SESSION_TTL_MINUTES,
      rateLimitWindowMs: parsed.AUTH_RATE_LIMIT_WINDOW_MS,
      rateLimitMax: parsed.AUTH_RATE_LIMIT_MAX,
      mfaChallengeTtlMinutes: AUTH_MFA_CHALLENGE_TTL_MINUTES
    },
    publicWebBaseUrl: normalizeBaseUrl(parsed.PUBLIC_WEB_BASE_URL),
    webDistDir: parsed.WEB_DIST_DIR,
    serveWebDist: parseBoolean(parsed.SERVE_WEB_DIST, parsed.NODE_ENV === 'production')
  };
}

export const appConfig = parseAppConfig(process.env);
