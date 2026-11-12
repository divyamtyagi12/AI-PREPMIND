import type { Request, RequestHandler } from 'express';
import { User, type UserDoc } from '../models/User';
import { isSessionActive } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { COOKIE_NAMES } from '../utils/constants';
import { verifyAccessToken } from '../utils/tokens';

export interface AuthContext {
  user: UserDoc;
  sessionId: string;
}

/** Returns the authenticated context attached by requireAuth. */
export function getAuth(req: Request): AuthContext {
  const auth = (req as Request & { auth?: AuthContext }).auth;
  if (!auth) throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  return auth;
}

/**
 * Authenticates from the HTTP-only access cookie and verifies the server-side session is
 * still active, so logout / password change / revocation take effect immediately.
 */
export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAMES.access];
  if (!token || typeof token !== 'string') {
    throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  const claims = verifyAccessToken(token);
  if (!(await isSessionActive(claims.sid, claims.sub))) {
    throw new AppError(401, 'Session is no longer valid', 'SESSION_REVOKED');
  }
  const user = await User.findById(claims.sub);
  if (!user) throw new AppError(401, 'Session is no longer valid', 'SESSION_REVOKED');
  (req as Request & { auth?: AuthContext }).auth = { user, sessionId: claims.sid };
  next();
});

/** Authorization guard for role-restricted routes (no admin routes yet; ready for later phases). */
export const requireRole =
  (...roles: Array<'student' | 'admin'>): RequestHandler =>
  (req, _res, next) => {
    const { user } = getAuth(req);
    if (!roles.includes(user.role as 'student' | 'admin')) {
      return next(new AppError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
    }
    next();
  };

