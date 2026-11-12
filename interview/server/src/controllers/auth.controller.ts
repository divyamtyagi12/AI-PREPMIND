import type { Request, Response } from 'express';
import { getAuth } from '../middleware/auth';
import {
  loginUser,
  refreshSession,
  registerUser,
  revokeSession,
  type IssuedSession,
} from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { clearAuthCookies, ensureCsrfCookie, setAuthCookies } from '../utils/cookies';
import { COOKIE_NAMES } from '../utils/constants';
import { verifyAccessToken, verifyRefreshToken } from '../utils/tokens';

function respondWithSession(res: Response, issued: IssuedSession, status = 200): void {
  setAuthCookies(res, { access: issued.accessToken, refresh: issued.refreshToken }, issued.expiresAt);
  res.status(status).json({ success: true, data: { user: issued.user.toJSON() } });
}

export async function register(req: Request, res: Response): Promise<void> {
  const issued = await registerUser(req.body, req.get('user-agent'));
  respondWithSession(res, issued, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const issued = await loginUser(req.body, req.get('user-agent'));
  respondWithSession(res, issued);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[COOKIE_NAMES.refresh];
  if (!token || typeof token !== 'string') {
    clearAuthCookies(res);
    throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  try {
    respondWithSession(res, await refreshSession(token));
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
}

/**
 * Logout works even when the access token has expired: the session is located from whichever
 * token is still readable, revoked server-side, and all cookies are cleared. Always succeeds.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const sessionIds = new Set<string>();
  const refresh = req.cookies?.[COOKIE_NAMES.refresh];
  const access = req.cookies?.[COOKIE_NAMES.access];
  if (typeof refresh === 'string') {
    try {
      sessionIds.add(verifyRefreshToken(refresh, true).sid);
    } catch {
      /* ignore invalid token */
    }
  }
  if (typeof access === 'string') {
    try {
      sessionIds.add(verifyAccessToken(access).sid);
    } catch {
      /* ignore invalid / expired token */
    }
  }
  await Promise.all([...sessionIds].map(revokeSession));
  clearAuthCookies(res);
  res.json({ success: true, data: { message: 'Logged out' } });
}

export async function me(req: Request, res: Response): Promise<void> {
  const { user } = getAuth(req);
  ensureCsrfCookie(req, res);
  res.json({ success: true, data: { user: user.toJSON() } });
}

