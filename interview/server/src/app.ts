import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { getConfig } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { createRateLimiters, type RateLimitOptions } from './middleware/rateLimiters';
import { buildApiRouter } from './routes';

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
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );
  // Logs method, URL and status only. No headers/cookies/bodies.
  if (config.env !== 'test') app.use(morgan(config.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use('/api', buildApiRouter(createRateLimiters(rateLimits)));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

