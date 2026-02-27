import path from 'node:path';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import {
  joinApplicationEditableSchema,
  joinApplicationSchema,
  type JoinApplicationEditableInput,
  type JoinApplicationInput
} from '@nyvoro/shared-types';
import type Database from 'better-sqlite3';
import { appConfig, type AppConfig } from './config.js';
import {
  createDatabase,
  getApplicationById,
  insertApplication,
  updateApplicationEmailStatus,
  updateApplicationPayload
} from './db.js';
import { createMailer } from './mailer.js';
import {
  generateMagicLinkToken,
  getClientIp,
  hashIpAddress,
  hashMagicLinkToken,
  secureCompareHash
} from './security.js';
import { verifyTurnstileToken } from './turnstile.js';
import { renderApiHomePage } from './api-home-page.js';
import { renderApiErrorPage } from './api-error-page.js';
import type { ApplicationProfileLinks } from './application-email-template.js';

type CreateAppOptions = {
  config?: AppConfig;
  db?: Database.Database;
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

export function createApp(options: CreateAppOptions = {}) {
  const config = options.config ?? appConfig;
  const db = options.db ?? createDatabase(config.databaseUrl);

  const mailer = createMailer(config.smtp);
  const verifyCaptcha = options.verifyCaptcha ?? verifyTurnstileToken;
  const sendNotification = options.sendApplicationNotification ?? mailer.sendApplicationNotification;

  const app = express();

  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  app.use(
    cors({
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

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString()
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

      const ipAddress = getClientIp((req.headers['x-forwarded-for'] as string | undefined) ?? req.ip);
      const captchaResult = await verifyCaptcha({
        token: payload.turnstileToken,
        secretKey: config.turnstileSecretKey,
        verificationUrl: config.turnstileVerifyUrl,
        ipAddress,
        bypass: config.turnstileBypass
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
