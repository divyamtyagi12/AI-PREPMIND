import type { RequestHandler } from 'express';
import { getConfig } from '../config/env';
import { AppError } from '../utils/AppError';
import { COOKIE_NAMES, CSRF_HEADER } from '../utils/constants';
import { safeEqual } from '../utils/tokens';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// No session cookie exists yet for these; they are protected by the Origin check and SameSite=Lax.
const EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/register']);

/**
 * CSRF protection for cookie-authenticated state-changing requests:
 *  1. If an Origin header is present it must be an allowed client origin.
 *  2. Double-submit cookie: the X-CSRF-Token header must equal the pm_csrf cookie.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin;
  if (origin && !getConfig().clientOrigins.includes(origin.replace(/\/$/, ''))) {
    return next(new AppError(403, 'Request origin not allowed', 'CSRF_ORIGIN'));
  }

  if (EXEMPT_PATHS.has(req.originalUrl.split('?')[0])) return next();

  const cookie = req.cookies?.[COOKIE_NAMES.csrf];
  const header = req.headers[CSRF_HEADER];
  if (typeof cookie !== 'string' || typeof header !== 'string' || !cookie || !safeEqual(cookie, header)) {
    return next(new AppError(403, 'Invalid or missing CSRF token', 'CSRF_INVALID'));
  }
  next();
};

