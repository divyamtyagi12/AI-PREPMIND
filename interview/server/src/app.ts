import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { getConfig } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { createRateLimiters, type RateLimitOptions } from './middleware/rateLimiters';
import { buildApiRouter } from './routes';

function sanitizeNoSqlPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeNoSqlPayload);
  }
  if (value && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      cleaned[key] = sanitizeNoSqlPayload(val);
    }
    return cleaned;
  }
  return value;
}

export function createApp(rateLimits?: RateLimitOptions): Express {
  const config = getConfig();
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin / non-browser requests carry no Origin header.
        if (!origin || config.clientOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      exposedHeaders: ['X-CSRF-Token'],
    }),
  );
  // Logs method, URL and status only. No headers/cookies/bodies.
  if (config.env !== 'test') app.use(morgan(config.isProd ? 'combined' : 'dev'));
  app.use(['/api/coding', '/api/admin'], express.json({ limit: '100kb' }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  // Strip NoSQL operator keys ($gt, $ne, $where, etc.) from body, query, and params
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeNoSqlPayload(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      const cleanedQuery = sanitizeNoSqlPayload(req.query) as Record<string, unknown>;
      for (const k of Object.keys(req.query)) {
        delete (req.query as Record<string, unknown>)[k];
      }
      Object.assign(req.query, cleanedQuery);
    }
    next();
  });

  app.use('/api', buildApiRouter(createRateLimiters(rateLimits)));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

