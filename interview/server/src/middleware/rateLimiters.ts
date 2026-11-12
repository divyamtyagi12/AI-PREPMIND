import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export interface RateLimitOptions {
  loginMax?: number;
  registerMax?: number;
  apiMax?: number;
}

const handler = (message: string) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message },
});

/** Creates fresh limiter instances (each with its own in-memory store). */
export function createRateLimiters({ loginMax = 10, registerMax = 20, apiMax = 600 }: RateLimitOptions = {}) {
  const common = { standardHeaders: 'draft-7' as const, legacyHeaders: false };

  return {
    /** Brute-force protection: only FAILED logins count, keyed per IP + email. */
    login: rateLimit({
      ...common,
      windowMs: 15 * 60 * 1000,
      limit: loginMax,
      skipSuccessfulRequests: true,
      keyGenerator: (req: Request) => {
        const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        return `${ipKeyGenerator(req.ip ?? '')}|${email}`;
      },
      message: handler('Too many login attempts. Please try again in 15 minutes.'),
    }),
    register: rateLimit({
      ...common,
      windowMs: 60 * 60 * 1000,
      limit: registerMax,
      keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
      message: handler('Too many accounts created from this network. Please try again later.'),
    }),
    api: rateLimit({
      ...common,
      windowMs: 15 * 60 * 1000,
      limit: apiMax,
      keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
      message: handler('Too many requests. Please slow down.'),
    }),
  };
}

