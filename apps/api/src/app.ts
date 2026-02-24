import path from 'node:path';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { joinApplicationSchema } from '@nyvoro/shared-types';
import type Database from 'better-sqlite3';
import { appConfig, type AppConfig } from './config.js';
import {
  createDatabase,
  getApplicationById,
  insertApplication,
  updateApplicationEmailStatus
} from './db.js';
import { createMailer } from './mailer.js';
import { getClientIp, hashIpAddress } from './security.js';
import { verifyTurnstileToken } from './turnstile.js';

type CreateAppOptions = {
  config?: AppConfig;
  db?: Database.Database;
  verifyCaptcha?: typeof verifyTurnstileToken;
  sendApplicationNotification?: (input: {
    applicationId: string;
    payload: ReturnType<typeof joinApplicationSchema.parse>;
  }) => Promise<void>;
};

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

  app.post('/api/v1/applications', applicationRateLimiter, async (req, res) => {
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

    const ipAddress = getClientIp(req.headers['x-forwarded-for'] as string | undefined ?? req.ip);
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

    insertApplication(db, {
      id: applicationId,
      locale: payload.locale,
      payload_json: JSON.stringify(payload),
      email_status: 'pending',
      ip_hash: ipHash
    });

    try {
      await sendNotification({
        applicationId,
        payload
      });

      updateApplicationEmailStatus(db, applicationId, 'sent');

      res.status(201).json({
        status: 'ok',
        applicationId
      });
      return;
    } catch (error) {
      updateApplicationEmailStatus(db, applicationId, 'failed');

      res.status(202).json({
        status: 'stored_with_email_error',
        applicationId,
        message: 'Application stored, notification email failed.'
      });

      if (config.nodeEnv !== 'test') {
        // We keep the submission successful because data persistence is the primary requirement.
        console.error('[application-email] failed to send notification', error);
      }
    }
  });

  const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
  const webDistDir = path.resolve(runtimeDir, '../../web/dist');
  const webIndexPath = path.resolve(webDistDir, 'index.html');

  if (existsSync(webIndexPath)) {
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
  } else if (config.nodeEnv !== 'test') {
    console.warn(`[api] web dist not found at ${webDistDir}. Only API routes will be served.`);
  }

  app.use((error: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    void next;
    if (config.nodeEnv !== 'test') {
      console.error('[api] unhandled error', error);
    }

    res.status(500).json({
      status: 'error',
      code: 'internal_error',
      message: 'Unexpected server error.'
    });
  });

  return {
    app,
    db,
    getApplicationById: (id: string) => getApplicationById(db, id)
  };
}
