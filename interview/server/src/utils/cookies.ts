import type { CookieOptions, Request, Response } from 'express';
import { getConfig } from '../config/env';
import { COOKIE_NAMES } from './constants';
import { generateCsrfToken } from './tokens';

function base(httpOnly: boolean, path: string, maxAgeMs: number): CookieOptions {
  return {
    httpOnly,
    secure: getConfig().isProd,
    sameSite: 'lax',
    path,
    maxAge: maxAgeMs,
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { access: string; refresh: string },
  refreshExpiresAt: Date,
): void {
  const c = getConfig();
  res.cookie(COOKIE_NAMES.access, tokens.access, base(true, '/', c.accessTtlSeconds * 1000));
  // Refresh cookie is only ever sent to the auth endpoints.
  res.cookie(
    COOKIE_NAMES.refresh,
    tokens.refresh,
    base(true, '/api/auth', Math.max(refreshExpiresAt.getTime() - Date.now(), 0)),
  );
  // CSRF token is intentionally readable by JS (double-submit cookie pattern).
  res.cookie(COOKIE_NAMES.csrf, generateCsrfToken(), base(false, '/', c.refreshTtlSeconds * 1000));
}

/** Ensures a CSRF cookie exists (needed before the first state-changing request). */
export function ensureCsrfCookie(req: Request, res: Response): void {
  if (!req.cookies?.[COOKIE_NAMES.csrf]) {
    res.cookie(COOKIE_NAMES.csrf, generateCsrfToken(), base(false, '/', getConfig().refreshTtlSeconds * 1000));
  }
}

export function clearAuthCookies(res: Response): void {
  const opts = (path: string, httpOnly: boolean) => ({
    httpOnly,
    secure: getConfig().isProd,
    sameSite: 'lax' as const,
    path,
  });
  res.clearCookie(COOKIE_NAMES.access, opts('/', true));
  res.clearCookie(COOKIE_NAMES.refresh, opts('/api/auth', true));
  res.clearCookie(COOKIE_NAMES.csrf, opts('/', false));
}

