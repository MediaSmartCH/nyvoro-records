import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

loadDotenv();

const defaultDatabaseUrl = process.env.VERCEL
  ? '/tmp/nyvoro.db'
  : path.resolve(process.cwd(), 'apps/api/data/nyvoro.db');

const defaultPublicWebBaseUrl = process.env.NODE_ENV === 'production'
  ? 'https://www.nyvoro-records.com'
  : 'http://localhost:5173';

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:4173'),
  // Vercel functions run on a read-only filesystem, so SQLite needs /tmp by default.
  DATABASE_URL: z.string().default(defaultDatabaseUrl),
  TURNSTILE_SECRET_KEY: z.string().default('turnstile_secret_placeholder'),
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
  SMTP_USER: z.string().default('placeholder_user'),
  SMTP_PASS: z.string().default('placeholder_password'),
  SMTP_FROM: z.string().email().default('no-reply@nyvoro-records.com'),
  APPLICATION_RECIPIENT_EMAIL: z.string().email().default('demo@nyvoro-records.com'),
  MAIL_LOGO_URL: z.string().url().optional(),
  IP_HASH_SALT: z.string().default('change-this-in-production'),
  MAGIC_LINK_SALT: z.string().optional(),
  PUBLIC_WEB_BASE_URL: z.string().url().default(defaultPublicWebBaseUrl),
  WEB_DIST_DIR: z.string().default(path.resolve(process.cwd(), 'apps/web/dist')),
  SERVE_WEB_DIST: z.string().optional()
});

const parsed = envSchema.parse(process.env);

export const appConfig = {
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
  magicLinkSalt: parsed.MAGIC_LINK_SALT ?? parsed.IP_HASH_SALT,
  publicWebBaseUrl: normalizeBaseUrl(parsed.PUBLIC_WEB_BASE_URL),
  webDistDir: parsed.WEB_DIST_DIR,
  serveWebDist: parseBoolean(parsed.SERVE_WEB_DIST, parsed.NODE_ENV === 'production')
};

export type AppConfig = typeof appConfig;
