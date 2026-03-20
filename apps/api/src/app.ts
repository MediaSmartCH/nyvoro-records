import path from 'node:path';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import {
  accountMfaVerifySchema,
  accountPasswordUpdateSchema,
  accountProfileUpdateSchema,
  adminCatalogResponseSchema,
  adminCatalogSnapshotSchema,
  adminDashboardResponseSchema,
  authLoginMfaVerifySchema,
  authLoginStartSchema,
  authRegisterSchema,
  contactMessageCreateSchema,
  contactMessageStatusSchema,
  joinApplicationEditableSchema,
  joinApplicationSchema,
  type AuthRole,
  type ContactMessageChannel,
  type JoinApplicationEditableInput,
  type JoinApplicationInput
} from '@nyvoro/shared-types';
import type Database from 'better-sqlite3';
import { appConfig, type AppConfig } from './config.js';
import { createFileContentStore, type ContentStore } from './content-store.js';
import {
  countApplications,
  countApplicationsByEmailStatuses,
  countApplicationsSince,
  countOpenContactMessages,
  createDatabase,
  disableAuthUserTotp,
  enableAuthUserTotp,
  getAuthUserById,
  getContactMessageById,
  getAuthUserByRoleAndEmail,
  listAuthUsersByEmail,
  getApplicationById,
  insertAuthUser,
  insertApplication,
  insertContactMessage,
  listRecentApplications,
  listRecentContactMessages,
  markContactMessageResolved,
  setAuthUserTotpSecret,
  updateAuthUserPasswordHash,
  updateAuthUserProfile,
  updateApplicationEmailStatus,
  updateApplicationPayload
} from './db.js';
import { createMailer } from './mailer.js';
import {
  createSignedMfaLoginToken,
  createPasswordHash,
  createSignedSessionToken,
  generateMagicLinkToken,
  generateTotpSecret,
  getClientIp,
  hashIpAddress,
  hashMagicLinkToken,
  normalizeLoginEmail,
  secureCompareHash,
  verifySignedMfaLoginTokenWithReason,
  verifyTotpCode,
  verifyPasswordHash,
  verifySignedSessionTokenWithReason
} from './security.js';
import { verifyTurnstileToken } from './turnstile.js';
import { renderApiHomePage } from './api-home-page.js';
import { renderApiErrorPage } from './api-error-page.js';
import type { ApplicationProfileLinks } from './application-email-template.js';

const authSessionCookieName = 'nyvoro_secure_session';

type CreateAppOptions = {
  config?: AppConfig;
  db?: Database.Database;
  contentStore?: ContentStore;
  verifyCaptcha?: typeof verifyTurnstileToken;
  sendApplicationNotification?: (input: {
    applicationId: string;
    payload: ReturnType<typeof joinApplicationSchema.parse>;
    profileLinks: ApplicationProfileLinks;
  }) => Promise<void>;
};

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolvePublicWebBaseUrl(req: express.Request, fallbackBaseUrl: string): string {
  const originHeader = req.headers.origin;
  if (typeof originHeader !== 'string') {
    return fallbackBaseUrl;
  }

  try {
    const parsedOrigin = new URL(originHeader);
    if (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') {
      return fallbackBaseUrl;
    }

    return normalizeBaseUrl(parsedOrigin.origin);
  } catch {
    return fallbackBaseUrl;
  }
}

function buildProfileLinks(input: {
  baseUrl: string;
  locale: JoinApplicationInput['locale'];
  applicationId: string;
  viewToken: string;
  editToken: string;
}): ApplicationProfileLinks {
  const { baseUrl, locale, applicationId, viewToken, editToken } = input;
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  return {
    viewUrl: `${normalizedBaseUrl}/${locale}/application-profile/${applicationId}?token=${encodeURIComponent(viewToken)}`,
    editUrl: `${normalizedBaseUrl}/${locale}/join?applicationId=${applicationId}&editToken=${encodeURIComponent(editToken)}`
  };
}

function extractToken(queryValue: unknown): string | undefined {
  if (typeof queryValue !== 'string') {
    return undefined;
  }

  const trimmed = queryValue.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toEditablePayload(payload: JoinApplicationInput): JoinApplicationEditableInput {
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

function toStoredPayload(payload: JoinApplicationEditableInput): JoinApplicationInput {
  return {
    ...payload,
    turnstileToken: 'profile_edit_token_1234567890',
    honeypot: ''
  };
}

function parseStoredPayload(payloadJson: string): JoinApplicationInput | undefined {
  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(payloadJson);
  } catch {
    return undefined;
  }

  const parsed = joinApplicationSchema.safeParse(parsedPayload);
  if (!parsed.success) {
    return undefined;
  }

  return parsed.data;
}

function resolveMagicAccessLevel(input: {
  token: string;
  viewTokenHash: string;
  editTokenHash: string;
  salt: string;
}): 'none' | 'view' | 'edit' {
  const { token, viewTokenHash, editTokenHash, salt } = input;
  const tokenHash = hashMagicLinkToken(token, salt);

  if (secureCompareHash(editTokenHash, tokenHash)) {
    return 'edit';
  }

  if (secureCompareHash(viewTokenHash, tokenHash)) {
    return 'view';
  }

  return 'none';
}

function requestWantsHtml(req: express.Request): boolean {
  const acceptHeader = req.headers.accept;
  if (typeof acceptHeader !== 'string') {
    return false;
  }

  return acceptHeader.toLowerCase().includes('text/html');
}

function mapUnhandledError(error: Error): { statusCode: number; code: string; message: string } {
  if (error.message === 'CORS origin is not allowed.') {
    return {
      statusCode: 403,
      code: 'cors_blocked',
      message: 'Request origin is not allowed by this API.'
    };
  }

  return {
    statusCode: 500,
    code: 'internal_error',
    message: 'Unexpected server error.'
  };
}

function createAsyncRouteHandler(
  handler: (req: express.Request, res: express.Response) => Promise<void>
): express.RequestHandler {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

function resolveApiPublicDir(): string | undefined {
  const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), 'apps/api/public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(currentFileDir, '../public')
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function parseCookieValue(cookieHeader: string | undefined, cookieName: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const chunk of cookieHeader.split(';')) {
    const [name, ...valueParts] = chunk.trim().split('=');
    if (name !== cookieName) {
      continue;
    }

    const encodedValue = valueParts.join('=').trim();
    if (!encodedValue) {
      return undefined;
    }

    try {
      return decodeURIComponent(encodedValue);
    } catch {
      return encodedValue;
    }
  }

  return undefined;
}

function clearAuthSessionCookie(res: express.Response, config: AppConfig): void {
  res.clearCookie(authSessionCookieName, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/'
  });
}

type AuthenticatedSession = {
  role: AuthRole;
  email: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function issueAuthSessionCookie(input: {
  res: express.Response;
  config: AppConfig;
  role: AuthRole;
  email: string;
}): { expiresAt: number } {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + input.config.auth.sessionTtlMinutes * 60_000;
  const sessionToken = createSignedSessionToken({
    secret: input.config.auth.sessionSecret,
    payload: {
      role: input.role,
      email: normalizeLoginEmail(input.email),
      issuedAt,
      expiresAt,
      // Random nonce ensures every successful login has a unique signed token.
      nonce: crypto.randomBytes(14).toString('base64url')
    }
  });

  input.res.cookie(authSessionCookieName, sessionToken, {
    httpOnly: true,
    secure: input.config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: input.config.auth.sessionTtlMinutes * 60_000
  });

  return { expiresAt };
}

function issueMfaLoginToken(input: {
  config: AppConfig;
  role: 'admin';
  email: string;
}): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + input.config.auth.mfaChallengeTtlMinutes * 60_000;

  return createSignedMfaLoginToken({
    secret: input.config.auth.sessionSecret,
    payload: {
      purpose: 'mfa_login',
      role: input.role,
      email: normalizeLoginEmail(input.email),
      issuedAt,
      expiresAt,
      nonce: crypto.randomBytes(14).toString('base64url')
    }
  });
}

function mapMfaTokenFailureReasonToCode(reason: 'session_expired' | 'session_invalid'): string {
  return reason === 'session_expired' ? 'mfa_token_expired' : 'mfa_token_invalid';
}

function sanitizeProfileName(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.trim();
}

function buildDisplayName(input: {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  fallbackEmail: string;
}): string {
  const firstName = sanitizeProfileName(input.firstName);
  const lastName = sanitizeProfileName(input.lastName);
  const combinedName = `${firstName} ${lastName}`.trim();
  if (combinedName.length > 0) {
    return combinedName;
  }

  return input.fallbackEmail;
}

function buildAccountPayload(input: {
  role: AuthRole;
  email: string;
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  mfaEnabled: boolean;
  expiresAt?: number;
}) {
  const normalizedEmail = normalizeLoginEmail(input.email);
  const firstName = sanitizeProfileName(input.firstName);
  const lastName = sanitizeProfileName(input.lastName);

  return {
    status: 'ok' as const,
    role: input.role,
    email: normalizedEmail,
    firstName,
    lastName,
    displayName: buildDisplayName({
      firstName,
      lastName,
      fallbackEmail: normalizedEmail
    }),
    shouldSetupTwoFactor: !input.mfaEnabled,
    ...(typeof input.expiresAt === 'number'
      ? {
          expiresAt: new Date(input.expiresAt).toISOString()
        }
      : {})
  };
}

type SessionReadState =
  | {
      hasCookie: false;
    }
  | {
      hasCookie: true;
      session: AuthenticatedSession;
    }
  | {
      hasCookie: true;
      reason: 'session_expired' | 'session_invalid';
    };

function readSessionStateFromRequest(req: express.Request, config: AppConfig): SessionReadState {
  const sessionToken = parseCookieValue(req.headers.cookie, authSessionCookieName);
  if (!sessionToken) {
    return {
      hasCookie: false
    };
  }

  const verification = verifySignedSessionTokenWithReason({
    token: sessionToken,
    secret: config.auth.sessionSecret
  });

  if (verification.ok) {
    return {
      hasCookie: true,
      session: verification.payload
    };
  }

  return {
    hasCookie: true,
    reason: verification.reason === 'expired' ? 'session_expired' : 'session_invalid'
  };
}

function readAuthenticatedSessionFromRequest(
  req: express.Request,
  config: AppConfig
): AuthenticatedSession | undefined {
  const sessionState = readSessionStateFromRequest(req, config);
  if (!sessionState.hasCookie) {
    return undefined;
  }

  if ('session' in sessionState) {
    return sessionState.session;
  }

  return undefined;
}

function requireAuthenticatedRole(input: {
  req: express.Request;
  res: express.Response;
  config: AppConfig;
  requiredRole: AuthRole;
}): AuthenticatedSession | undefined {
  const sessionToken = parseCookieValue(input.req.headers.cookie, authSessionCookieName);
  if (!sessionToken) {
    input.res.status(401).json({
      status: 'error',
      code: 'auth_required',
      message: 'Authentication required.'
    });
    return undefined;
  }

  const session = readAuthenticatedSessionFromRequest(input.req, input.config);
  if (!session) {
    clearAuthSessionCookie(input.res, input.config);
    input.res.status(401).json({
      status: 'error',
      code: 'auth_required',
      message: 'Authentication required.'
    });
    return undefined;
  }

  if (session.role !== input.requiredRole) {
    input.res.status(403).json({
      status: 'error',
      code: 'forbidden',
      message: 'Forbidden.'
    });
    return undefined;
  }

  return session;
}

function requireAuthenticatedSession(input: {
  req: express.Request;
  res: express.Response;
  config: AppConfig;
}): AuthenticatedSession | undefined {
  const sessionToken = parseCookieValue(input.req.headers.cookie, authSessionCookieName);
  if (!sessionToken) {
    input.res.status(401).json({
      status: 'error',
      code: 'auth_required',
      message: 'Authentication required.'
    });
    return undefined;
  }

  const session = readAuthenticatedSessionFromRequest(input.req, input.config);
  if (!session) {
    clearAuthSessionCookie(input.res, input.config);
    input.res.status(401).json({
      status: 'error',
      code: 'auth_required',
      message: 'Authentication required.'
    });
    return undefined;
  }

  return session;
}

function extractApplicationPreview(payloadJson: string): {
  artistName: string;
  email: string;
} {
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payloadJson);
  } catch {
    return {
      artistName: 'Unknown artist',
      email: ''
    };
  }

  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return {
      artistName: 'Unknown artist',
      email: ''
    };
  }

  const maybeProfile = (parsedPayload as { profile?: unknown }).profile;
  if (!maybeProfile || typeof maybeProfile !== 'object') {
    return {
      artistName: 'Unknown artist',
      email: ''
    };
  }

  const profile = maybeProfile as { artistName?: unknown; email?: unknown };
  return {
    artistName:
      typeof profile.artistName === 'string' && profile.artistName.trim().length > 0
        ? profile.artistName.trim()
        : 'Unknown artist',
    email: typeof profile.email === 'string' ? profile.email.trim() : ''
  };
}

export function createApp(options: CreateAppOptions = {}) {
  const config = options.config ?? appConfig;
  const db = options.db ?? createDatabase(config.databaseUrl);
  const contentStore = options.contentStore ?? createFileContentStore();

  const mailer = createMailer(config.smtp);
  const verifyCaptcha = options.verifyCaptcha ?? verifyTurnstileToken;
  const sendNotification = options.sendApplicationNotification ?? mailer.sendApplicationNotification;
  const isCaptchaBypassed = config.nodeEnv !== 'production' || config.turnstileBypass;

  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"]
        }
      }
    })
  );

  app.use(
    cors({
      credentials: true,
      origin: (origin, callback) => {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('CORS origin is not allowed.'));
      }
    })
  );

  app.use(express.json({ limit: '1mb' }));

  const apiPublicDir = resolveApiPublicDir();
  if (apiPublicDir) {
    app.use('/api-assets', express.static(apiPublicDir, { index: false }));
  }

  function sendErrorResponse(input: {
    req: express.Request;
    res: express.Response;
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  }): void {
    const { req, res, statusCode, code, message, details } = input;

    if (requestWantsHtml(req)) {
      res.status(statusCode).type('html').send(
        renderApiErrorPage({
          statusCode,
          environment: config.nodeEnv,
          message,
          requestPath: req.originalUrl
        })
      );
      return;
    }

    res.status(statusCode).json({
      status: 'error',
      code,
      message,
      ...(details !== undefined ? { details } : {})
    });
  }

  const applicationRateLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      code: 'rate_limited',
      message: 'Too many application requests. Try again later.'
    }
  });

  const authLoginRateLimiter = rateLimit({
    windowMs: config.auth.rateLimitWindowMs,
    max: config.auth.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      code: 'auth_rate_limited',
      message: 'Too many authentication attempts. Try again later.'
    }
  });

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString()
    });
  });

  app.post(
    '/api/v1/auth/register',
    authLoginRateLimiter,
    createAsyncRouteHandler(async (req, res) => {
      const parsed = authRegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          status: 'error',
          code: 'validation_error',
          details: parsed.error.flatten()
        });
        return;
      }

      const payload = parsed.data;

      if (payload.role !== 'artist') {
        res.status(403).json({
          status: 'error',
          code: 'registration_closed_for_role',
          message: 'Public registration is only available for artist accounts.'
        });
        return;
      }

      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        res.status(400).json({
          status: 'error',
          code: 'spam_detected',
          message: 'Spam detected.'
        });
        return;
      }

      const ipAddress = getClientIp(req.ip);
      const captchaResult = await verifyCaptcha({
        token: payload.turnstileToken,
        secretKey: config.turnstileSecretKey,
        verificationUrl: config.turnstileVerifyUrl,
        ipAddress,
        bypass: isCaptchaBypassed
      });

      if (!captchaResult.success) {
        res.status(400).json({
          status: 'error',
          code: 'captcha_invalid',
          message: 'Captcha verification failed.',
          errors: captchaResult.errors
        });
        return;
      }

      const normalizedEmail = normalizeLoginEmail(payload.email);
      const existingUser = getAuthUserByRoleAndEmail(db, {
        role: payload.role,
        email: normalizedEmail
      });

      if (existingUser) {
        res.status(409).json({
          status: 'error',
          code: 'account_exists',
          message: 'An account already exists for this role and email.'
        });
        return;
      }

      insertAuthUser(db, {
        id: crypto.randomUUID(),
        role: 'artist',
        email: normalizedEmail,
        password_hash: createPasswordHash(payload.password),
        totp_secret: null,
        totp_enabled: false,
        is_temporary: false
      });

      res.status(201).json({
        status: 'ok',
        role: 'artist',
        email: normalizedEmail
      });
    })
  );

  app.post(
    '/api/v1/auth/login',
    authLoginRateLimiter,
    createAsyncRouteHandler(async (req, res) => {
      const parsed = authLoginStartSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          status: 'error',
          code: 'validation_error',
          details: parsed.error.flatten()
        });
        return;
      }

      const payload = parsed.data;

      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        res.status(400).json({
          status: 'error',
          code: 'spam_detected',
          message: 'Spam detected.'
        });
        return;
      }

      const ipAddress = getClientIp(req.ip);
      const captchaResult = await verifyCaptcha({
        token: payload.turnstileToken,
        secretKey: config.turnstileSecretKey,
        verificationUrl: config.turnstileVerifyUrl,
        ipAddress,
        bypass: isCaptchaBypassed
      });

      if (!captchaResult.success) {
        res.status(400).json({
          status: 'error',
          code: 'captcha_invalid',
          message: 'Captcha verification failed.',
          errors: captchaResult.errors
        });
        return;
      }

      const normalizedSubmittedEmail = normalizeLoginEmail(payload.email);
      const matchingAccounts = listAuthUsersByEmail(db, normalizedSubmittedEmail).filter((candidate) =>
        verifyPasswordHash({
          password: payload.password,
          encodedHash: candidate.password_hash
        })
      );

      if (matchingAccounts.length === 0) {
        res.status(401).json({
          status: 'error',
          code: 'invalid_credentials',
          message: 'Invalid login credentials.'
        });
        return;
      }

      if (matchingAccounts.length > 1) {
        res.status(409).json({
          status: 'error',
          code: 'ambiguous_credentials',
          message: 'Multiple accounts match these credentials. Contact support to reset one account.'
        });
        return;
      }

      const account = matchingAccounts[0];
      if (!account) {
        res.status(401).json({
          status: 'error',
          code: 'invalid_credentials',
          message: 'Invalid login credentials.'
        });
        return;
      }

      if (account.role === 'admin' && account.totp_enabled === 1) {
        if (!account.totp_secret) {
          res.status(500).json({
            status: 'error',
            code: 'mfa_configuration_invalid',
            message: 'MFA is enabled but the account configuration is invalid.'
          });
          return;
        }

        res.status(200).json({
          status: 'mfa_required',
          role: 'admin',
          email: normalizeLoginEmail(account.email),
          mfaToken: issueMfaLoginToken({
            config,
            role: 'admin',
            email: account.email
          })
        });
        return;
      }

      const { expiresAt } = issueAuthSessionCookie({
        res,
        config,
        role: account.role,
        email: account.email
      });

      res.status(200).json({
        ...buildAccountPayload({
          role: account.role,
          email: account.email,
          firstName: account.first_name,
          lastName: account.last_name,
          mfaEnabled: account.totp_enabled === 1,
          expiresAt
        })
      });
    })
  );

  app.post('/api/v1/auth/login/verify-mfa', authLoginRateLimiter, (req, res) => {
    const parsed = authLoginMfaVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        code: 'validation_error',
        details: parsed.error.flatten()
      });
      return;
    }

    const verification = verifySignedMfaLoginTokenWithReason({
      token: parsed.data.mfaToken,
      secret: config.auth.sessionSecret
    });

    if (!verification.ok) {
      res.status(401).json({
        status: 'error',
        code: mapMfaTokenFailureReasonToCode(
          verification.reason === 'expired' ? 'session_expired' : 'session_invalid'
        ),
        message: 'The MFA login challenge is invalid or expired.'
      });
      return;
    }

    const account = getAuthUserByRoleAndEmail(db, {
      role: verification.payload.role,
      email: normalizeLoginEmail(verification.payload.email)
    });

    if (!account || account.role !== 'admin' || account.totp_enabled !== 1 || !account.totp_secret) {
      res.status(401).json({
        status: 'error',
        code: 'mfa_token_invalid',
        message: 'The MFA login challenge is invalid or expired.'
      });
      return;
    }

    const isValidTotp = verifyTotpCode({
      code: parsed.data.code,
      secret: account.totp_secret
    });

    if (!isValidTotp) {
      res.status(400).json({
        status: 'error',
        code: 'invalid_totp_code',
        message: 'Invalid authentication code.'
      });
      return;
    }

    const { expiresAt } = issueAuthSessionCookie({
      res,
      config,
      role: account.role,
      email: account.email
    });

    res.status(200).json(
      buildAccountPayload({
        role: account.role,
        email: account.email,
        firstName: account.first_name,
        lastName: account.last_name,
        mfaEnabled: account.totp_enabled === 1,
        expiresAt
      })
    );
  });

  app.get('/api/v1/auth/session', (req, res) => {
    const sessionState = readSessionStateFromRequest(req, config);
    if (!sessionState.hasCookie) {
      res.status(200).json({
        status: 'ok',
        authenticated: false
      });
      return;
    }

    if (!('session' in sessionState)) {
      clearAuthSessionCookie(res, config);
      res.status(200).json({
        status: 'ok',
        authenticated: false,
        code: sessionState.reason
      });
      return;
    }

    const session = sessionState.session;

    const account = getAuthUserByRoleAndEmail(db, {
      role: session.role,
      email: normalizeLoginEmail(session.email)
    });

    if (!account) {
      clearAuthSessionCookie(res, config);
      res.status(200).json({
        status: 'ok',
        authenticated: false,
        code: 'session_invalid'
      });
      return;
    }

    res.status(200).json({
      authenticated: true,
      ...buildAccountPayload({
        role: account.role,
        email: account.email,
        firstName: account.first_name,
        lastName: account.last_name,
        mfaEnabled: account.totp_enabled === 1,
        expiresAt: session.expiresAt
      })
    });
  });

  app.post('/api/v1/auth/logout', (_req, res) => {
    clearAuthSessionCookie(res, config);
    res.status(200).json({
      status: 'ok'
    });
  });

  app.get('/api/v1/account/profile', (req, res) => {
    const session = requireAuthenticatedSession({
      req,
      res,
      config
    });
    if (!session) {
      return;
    }

    const account = getAuthUserByRoleAndEmail(db, {
      role: session.role,
      email: normalizeLoginEmail(session.email)
    });

    if (!account) {
      clearAuthSessionCookie(res, config);
      res.status(401).json({
        status: 'error',
        code: 'auth_required',
        message: 'Authentication required.'
      });
      return;
    }

    res.status(200).json(
      buildAccountPayload({
        role: account.role,
        email: account.email,
        firstName: account.first_name,
        lastName: account.last_name,
        mfaEnabled: account.totp_enabled === 1,
        expiresAt: session.expiresAt
      })
    );
  });

  app.patch('/api/v1/account/profile', (req, res) => {
    const session = requireAuthenticatedSession({
      req,
      res,
      config
    });
    if (!session) {
      return;
    }

    const parsed = accountProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        code: 'validation_error',
        details: parsed.error.flatten()
      });
      return;
    }

    const account = getAuthUserByRoleAndEmail(db, {
      role: session.role,
      email: normalizeLoginEmail(session.email)
    });

    if (!account) {
      clearAuthSessionCookie(res, config);
      res.status(401).json({
        status: 'error',
        code: 'auth_required',
        message: 'Authentication required.'
      });
      return;
    }

    const normalizedEmail = normalizeLoginEmail(parsed.data.email);
    const firstName = parsed.data.firstName.trim();
    const lastName = parsed.data.lastName.trim();

    try {
      updateAuthUserProfile(db, {
        id: account.id,
        email: normalizedEmail,
        first_name: firstName.length > 0 ? firstName : null,
        last_name: lastName.length > 0 ? lastName : null
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        res.status(409).json({
          status: 'error',
          code: 'email_in_use',
          message: 'Email already used by another account.'
        });
        return;
      }

      throw error;
    }

    const updatedAccount = getAuthUserById(db, account.id);
    if (!updatedAccount) {
      clearAuthSessionCookie(res, config);
      res.status(401).json({
        status: 'error',
        code: 'auth_required',
        message: 'Authentication required.'
      });
      return;
    }

    const { expiresAt } = issueAuthSessionCookie({
      res,
      config,
      role: updatedAccount.role,
      email: updatedAccount.email
    });

    res.status(200).json(
      buildAccountPayload({
        role: updatedAccount.role,
        email: updatedAccount.email,
        firstName: updatedAccount.first_name,
        lastName: updatedAccount.last_name,
        mfaEnabled: updatedAccount.totp_enabled === 1,
        expiresAt
      })
    );
  });

  app.post('/api/v1/account/password', (req, res) => {
    const session = requireAuthenticatedSession({
      req,
      res,
      config
    });
    if (!session) {
      return;
    }

    const parsed = accountPasswordUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        code: 'validation_error',
        details: parsed.error.flatten()
      });
      return;
    }

    const account = getAuthUserByRoleAndEmail(db, {
      role: session.role,
      email: normalizeLoginEmail(session.email)
    });

    if (!account) {
      clearAuthSessionCookie(res, config);
      res.status(401).json({
        status: 'error',
        code: 'auth_required',
        message: 'Authentication required.'
      });
      return;
    }

    const isCurrentPasswordValid = verifyPasswordHash({
      password: parsed.data.currentPassword,
      encodedHash: account.password_hash
    });

    if (!isCurrentPasswordValid) {
      res.status(400).json({
        status: 'error',
        code: 'invalid_current_password',
        message: 'Current password is invalid.'
      });
      return;
    }

    updateAuthUserPasswordHash(db, {
      id: account.id,
      password_hash: createPasswordHash(parsed.data.newPassword)
    });

    issueAuthSessionCookie({
      res,
      config,
      role: account.role,
      email: account.email
    });

    res.status(200).json({
      status: 'ok'
    });
  });

  app.post('/api/v1/account/mfa/setup', (req, res) => {
    const session = requireAuthenticatedSession({
      req,
      res,
      config
    });
    if (!session) {
      return;
    }

    const account = getAuthUserByRoleAndEmail(db, {
      role: session.role,
      email: normalizeLoginEmail(session.email)
    });

    if (!account) {
      clearAuthSessionCookie(res, config);
      res.status(401).json({
        status: 'error',
        code: 'auth_required',
        message: 'Authentication required.'
      });
      return;
    }

    if (account.totp_enabled === 1) {
      res.status(409).json({
        status: 'error',
        code: 'mfa_already_enabled',
        message: 'MFA is already enabled.'
      });
      return;
    }

    const secret = generateTotpSecret();
    setAuthUserTotpSecret(db, {
      id: account.id,
      secret
    });

    const issuer = 'Nyvoro Records';
    const accountLabel = normalizeLoginEmail(account.email);
    const otpauthUri = `otpauth://totp/${encodeURIComponent(`${issuer}:${accountLabel}`)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;

    res.status(200).json({
      status: 'ok',
      secret,
      issuer,
      accountLabel,
      otpauthUri
    });
  });

  app.post('/api/v1/account/mfa/verify', (req, res) => {
    const session = requireAuthenticatedSession({
      req,
      res,
      config
    });
    if (!session) {
      return;
    }

    const parsed = accountMfaVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        code: 'validation_error',
        details: parsed.error.flatten()
      });
      return;
    }

    const account = getAuthUserByRoleAndEmail(db, {
      role: session.role,
      email: normalizeLoginEmail(session.email)
    });

    if (!account) {
      clearAuthSessionCookie(res, config);
      res.status(401).json({
        status: 'error',
        code: 'auth_required',
        message: 'Authentication required.'
      });
      return;
    }

    if (!account.totp_secret) {
      res.status(400).json({
        status: 'error',
        code: 'mfa_not_initialized',
        message: 'MFA setup must be initialized first.'
      });
      return;
    }

    const isValidTotp = verifyTotpCode({
      code: parsed.data.code,
      secret: account.totp_secret
    });

    if (!isValidTotp) {
      res.status(400).json({
        status: 'error',
        code: 'invalid_totp_code',
        message: 'Invalid authentication code.'
      });
      return;
    }

    enableAuthUserTotp(db, account.id);

    res.status(200).json({
      status: 'ok',
      mfaEnabled: true
    });
  });

  app.post('/api/v1/account/mfa/disable', (req, res) => {
    const session = requireAuthenticatedSession({
      req,
      res,
      config
    });
    if (!session) {
      return;
    }

    const account = getAuthUserByRoleAndEmail(db, {
      role: session.role,
      email: normalizeLoginEmail(session.email)
    });

    if (!account) {
      clearAuthSessionCookie(res, config);
      res.status(401).json({
        status: 'error',
        code: 'auth_required',
        message: 'Authentication required.'
      });
      return;
    }

    disableAuthUserTotp(db, account.id);

    res.status(200).json({
      status: 'ok',
      mfaEnabled: false
    });
  });

  app.post(
    '/api/v1/contact-messages',
    applicationRateLimiter,
    createAsyncRouteHandler(async (req, res) => {
      const parsed = contactMessageCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          status: 'error',
          code: 'validation_error',
          details: parsed.error.flatten()
        });
        return;
      }

      const payload = parsed.data;

      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        res.status(400).json({
          status: 'error',
          code: 'spam_detected',
          message: 'Spam detected.'
        });
        return;
      }

      const ipAddress = getClientIp(req.ip);
      const captchaResult = await verifyCaptcha({
        token: payload.turnstileToken,
        secretKey: config.turnstileSecretKey,
        verificationUrl: config.turnstileVerifyUrl,
        ipAddress,
        bypass: isCaptchaBypassed
      });

      if (!captchaResult.success) {
        res.status(400).json({
          status: 'error',
          code: 'captcha_invalid',
          message: 'Captcha verification failed.',
          errors: captchaResult.errors
        });
        return;
      }

      const messageId = crypto.randomUUID();
      insertContactMessage(db, {
        id: messageId,
        locale: payload.locale,
        channel: payload.channel,
        full_name: payload.fullName,
        email: normalizeLoginEmail(payload.email),
        subject: payload.subject,
        message: payload.message,
        status: 'open',
        ip_hash: hashIpAddress(ipAddress, config.ipHashSalt)
      });

      res.status(201).json({
        status: 'ok',
        messageId
      });
    })
  );

  app.get('/api/v1/admin/dashboard', (req, res) => {
    if (
      !requireAuthenticatedRole({
        req,
        res,
        config,
        requiredRole: 'admin'
      })
    ) {
      return;
    }

    const summary = {
      totalApplications: countApplications(db),
      applicationsLast7Days: countApplicationsSince(
        db,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ),
      applicationsEmailPendingOrFailed: countApplicationsByEmailStatuses(db, ['pending', 'failed']),
      openContactMessages: countOpenContactMessages(db)
    };

    const recentApplications = listRecentApplications(db, 12).map((record) => {
      const preview = extractApplicationPreview(record.payload_json);
      return {
        id: record.id,
        createdAt: record.created_at,
        locale: record.locale === 'fr' ? 'fr' : 'en',
        artistName: preview.artistName,
        email: preview.email,
        emailStatus: record.email_status
      };
    });

    const recentContactMessages = listRecentContactMessages(db, 12).map((record) => {
      const parsedStatus = contactMessageStatusSchema.safeParse(record.status);
      return {
        id: record.id,
        createdAt: record.created_at,
        locale: record.locale === 'fr' ? 'fr' : 'en',
        channel:
          record.channel === 'general' || record.channel === 'press' || record.channel === 'demos'
            ? (record.channel as ContactMessageChannel)
            : 'general',
        fullName: record.full_name,
        email: record.email,
        subject: record.subject,
        status: parsedStatus.success ? parsedStatus.data : 'open'
      };
    });

    const responsePayload = {
      status: 'ok' as const,
      summary,
      recentApplications,
      recentContactMessages
    };

    const parsedResponse = adminDashboardResponseSchema.safeParse(responsePayload);
    if (!parsedResponse.success) {
      res.status(500).json({
        status: 'error',
        code: 'dashboard_payload_invalid',
        message: 'Unexpected dashboard payload.'
      });
      return;
    }

    res.status(200).json(parsedResponse.data);
  });

  app.get('/api/v1/admin/catalog', (req, res) => {
    if (
      !requireAuthenticatedRole({
        req,
        res,
        config,
        requiredRole: 'admin'
      })
    ) {
      return;
    }

    try {
      const catalogSnapshot = contentStore.readCatalog();
      const responsePayload = {
        status: 'ok' as const,
        ...catalogSnapshot
      };
      const parsedResponse = adminCatalogResponseSchema.safeParse(responsePayload);

      if (!parsedResponse.success) {
        res.status(500).json({
          status: 'error',
          code: 'catalog_payload_invalid',
          message: 'Unexpected catalog payload.'
        });
        return;
      }

      res.status(200).json(parsedResponse.data);
    } catch (error) {
      if (config.nodeEnv !== 'test') {
        console.error('[api] catalog read failed', error);
      }

      res.status(500).json({
        status: 'error',
        code: 'catalog_unavailable',
        message: 'Catalog is unavailable right now.'
      });
    }
  });

  app.put('/api/v1/admin/catalog', (req, res) => {
    if (
      !requireAuthenticatedRole({
        req,
        res,
        config,
        requiredRole: 'admin'
      })
    ) {
      return;
    }

    const parsed = adminCatalogSnapshotSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        code: 'validation_error',
        details: parsed.error.flatten()
      });
      return;
    }

    try {
      const savedSnapshot = contentStore.writeCatalog(parsed.data);
      const responsePayload = {
        status: 'ok' as const,
        ...savedSnapshot
      };
      const parsedResponse = adminCatalogResponseSchema.safeParse(responsePayload);

      if (!parsedResponse.success) {
        res.status(500).json({
          status: 'error',
          code: 'catalog_payload_invalid',
          message: 'Unexpected catalog payload.'
        });
        return;
      }

      res.status(200).json(parsedResponse.data);
    } catch (error) {
      if (config.nodeEnv !== 'test') {
        console.error('[api] catalog write failed', error);
      }

      res.status(500).json({
        status: 'error',
        code: 'catalog_write_failed',
        message: 'Unable to save catalog changes.'
      });
    }
  });

  app.patch('/api/v1/admin/contact-messages/:messageId', (req, res) => {
    const session = requireAuthenticatedRole({
      req,
      res,
      config,
      requiredRole: 'admin'
    });

    if (!session) {
      return;
    }

    const messageId = req.params.messageId;
    if (!messageId) {
      res.status(400).json({
        status: 'error',
        code: 'message_id_required',
        message: 'Message id is required.'
      });
      return;
    }

    const existingMessage = getContactMessageById(db, messageId);
    if (!existingMessage) {
      res.status(404).json({
        status: 'error',
        code: 'not_found',
        message: 'Contact message not found.'
      });
      return;
    }

    const updatedMessage = markContactMessageResolved(db, {
      id: messageId,
      resolved_by: normalizeLoginEmail(session.email)
    });

    if (!updatedMessage) {
      res.status(404).json({
        status: 'error',
        code: 'not_found',
        message: 'Contact message not found.'
      });
      return;
    }

    res.status(200).json({
      status: 'ok',
      messageId: updatedMessage.id,
      newStatus: 'resolved'
    });
  });

  app.get('/api/v1/applications/:applicationId/profile', (req, res) => {
    const applicationId = req.params.applicationId;
    if (!applicationId) {
      res.status(400).json({
        status: 'error',
        code: 'application_id_required',
        message: 'Application id is required.'
      });
      return;
    }

    const token = extractToken(req.query.token);

    if (!token) {
      res.status(400).json({
        status: 'error',
        code: 'token_required',
        message: 'Magic link token is required.'
      });
      return;
    }

    const application = getApplicationById(db, applicationId);
    if (!application) {
      res.status(404).json({
        status: 'error',
        code: 'not_found',
        message: 'Application not found.'
      });
      return;
    }

    const accessLevel = resolveMagicAccessLevel({
      token,
      viewTokenHash: application.view_token_hash,
      editTokenHash: application.edit_token_hash,
      salt: config.magicLinkSalt
    });

    if (accessLevel === 'none') {
      res.status(401).json({
        status: 'error',
        code: 'invalid_token',
        message: 'Invalid or expired magic link token.'
      });
      return;
    }

    const storedPayload = parseStoredPayload(application.payload_json);
    if (!storedPayload) {
      res.status(500).json({
        status: 'error',
        code: 'payload_corrupted',
        message: 'Stored application payload is invalid.'
      });
      return;
    }

    res.status(200).json({
      status: 'ok',
      applicationId: application.id,
      createdAt: application.created_at,
      updatedAt: application.updated_at,
      canEdit: accessLevel === 'edit',
      payload: toEditablePayload(storedPayload)
    });
  });

  app.put(
    '/api/v1/applications/:applicationId/profile',
    createAsyncRouteHandler(async (req, res) => {
      const applicationId = req.params.applicationId;
      if (!applicationId) {
        res.status(400).json({
          status: 'error',
          code: 'application_id_required',
          message: 'Application id is required.'
        });
        return;
      }

      const token = extractToken(req.query.token);

      if (!token) {
        res.status(400).json({
          status: 'error',
          code: 'token_required',
          message: 'Magic link token is required.'
        });
        return;
      }

      const application = getApplicationById(db, applicationId);
      if (!application) {
        res.status(404).json({
          status: 'error',
          code: 'not_found',
          message: 'Application not found.'
        });
        return;
      }

      const accessLevel = resolveMagicAccessLevel({
        token,
        viewTokenHash: application.view_token_hash,
        editTokenHash: application.edit_token_hash,
        salt: config.magicLinkSalt
      });

      if (accessLevel !== 'edit') {
        res.status(401).json({
          status: 'error',
          code: 'invalid_token',
          message: 'Edit token is required to modify this profile.'
        });
        return;
      }

      const parsed = joinApplicationEditableSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          status: 'error',
          code: 'validation_error',
          details: parsed.error.flatten()
        });
        return;
      }

      const updatedPayload = toStoredPayload(parsed.data);

      updateApplicationPayload(db, {
        id: applicationId,
        locale: parsed.data.locale,
        payload_json: JSON.stringify(updatedPayload)
      });

      res.status(200).json({
        status: 'ok',
        applicationId
      });
    })
  );

  app.post(
    '/api/v1/applications',
    applicationRateLimiter,
    createAsyncRouteHandler(async (req, res) => {
      const parsed = joinApplicationSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          status: 'error',
          code: 'validation_error',
          details: parsed.error.flatten()
        });
        return;
      }

      const payload = parsed.data;

      if (payload.honeypot && payload.honeypot.trim().length > 0) {
        res.status(400).json({
          status: 'error',
          code: 'spam_detected',
          message: 'Spam detected.'
        });
        return;
      }

      const ipAddress = getClientIp(req.ip);
      const captchaResult = await verifyCaptcha({
        token: payload.turnstileToken,
        secretKey: config.turnstileSecretKey,
        verificationUrl: config.turnstileVerifyUrl,
        ipAddress,
        bypass: isCaptchaBypassed
      });

      if (!captchaResult.success) {
        res.status(400).json({
          status: 'error',
          code: 'captcha_invalid',
          message: 'Captcha verification failed.',
          errors: captchaResult.errors
        });
        return;
      }

      const applicationId = crypto.randomUUID();
      const ipHash = hashIpAddress(ipAddress, config.ipHashSalt);
      const viewToken = generateMagicLinkToken();
      const editToken = generateMagicLinkToken();
      const viewTokenHash = hashMagicLinkToken(viewToken, config.magicLinkSalt);
      const editTokenHash = hashMagicLinkToken(editToken, config.magicLinkSalt);

      const publicWebBaseUrl = resolvePublicWebBaseUrl(req, config.publicWebBaseUrl);
      const profileLinks = buildProfileLinks({
        baseUrl: publicWebBaseUrl,
        locale: payload.locale,
        applicationId,
        viewToken,
        editToken
      });

      insertApplication(db, {
        id: applicationId,
        locale: payload.locale,
        payload_json: JSON.stringify(payload),
        email_status: 'pending',
        ip_hash: ipHash,
        view_token_hash: viewTokenHash,
        edit_token_hash: editTokenHash
      });

      try {
        await sendNotification({
          applicationId,
          payload,
          profileLinks
        });

        updateApplicationEmailStatus(db, applicationId, 'sent');

        res.status(201).json({
          status: 'ok',
          applicationId,
          profileLinks
        });
        return;
      } catch (error) {
        updateApplicationEmailStatus(db, applicationId, 'failed');

        res.status(202).json({
          status: 'stored_with_email_error',
          applicationId,
          profileLinks,
          message: 'Application stored, notification email failed.'
        });

        if (config.nodeEnv !== 'test') {
          // We keep the submission successful because data persistence is the primary requirement.
          console.error('[application-email] failed to send notification', error);
        }
      }
    })
  );

  const webDistDir = path.isAbsolute(config.webDistDir)
    ? config.webDistDir
    : path.resolve(process.cwd(), config.webDistDir);
  const webIndexPath = path.resolve(webDistDir, 'index.html');

  if (config.serveWebDist && existsSync(webIndexPath)) {
    app.use(express.static(webDistDir, { index: false }));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }

      res.sendFile(webIndexPath, (error) => {
        if (error) {
          next();
        }
      });
    });
  } else {
    app.get('/', (_req, res) => {
      res.status(200).type('html').send(
        renderApiHomePage({
          environment: config.nodeEnv
        })
      );
    });

    if (config.nodeEnv !== 'test') {
      console.warn(
        `[api] web dist not served. serveWebDist=${config.serveWebDist}, path=${webDistDir}`
      );
    }
  }

  app.use((req, res) => {
    sendErrorResponse({
      req,
      res,
      statusCode: 404,
      code: 'route_not_found',
      message: 'Requested route does not exist.'
    });
  });

  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (config.nodeEnv !== 'test') {
      console.error('[api] unhandled error', error);
    }

    const mappedError = mapUnhandledError(error);

    sendErrorResponse({
      req,
      res,
      statusCode: mappedError.statusCode,
      code: mappedError.code,
      message: mappedError.message
    });
  });

  return {
    app,
    db,
    getApplicationById: (id: string) => getApplicationById(db, id)
  };
}
