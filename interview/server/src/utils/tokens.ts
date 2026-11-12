import crypto from 'crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { getConfig } from '../config/env';
import { AppError } from './AppError';

const ISSUER = 'prepmind-ai';

export interface AccessClaims {
  sub: string; // user id
  sid: string; // session id
}

export function signAccessToken(userId: string, sessionId: string): string {
  const c = getConfig();
  return jwt.sign({ sid: sessionId }, c.accessSecret, {
    algorithm: 'HS256',
    subject: userId,
    issuer: ISSUER,
    expiresIn: c.accessTtlSeconds,
  });
}

/** Refresh tokens carry a random jti so every rotation yields a unique token. */
export function signRefreshToken(userId: string, sessionId: string, expiresAt: Date): string {
  const c = getConfig();
  const exp = Math.floor(expiresAt.getTime() / 1000);
  return jwt.sign({ sid: sessionId, exp }, c.refreshSecret, {
    algorithm: 'HS256',
    subject: userId,
    issuer: ISSUER,
    jwtid: crypto.randomUUID(),
  });
}

function verify(token: string, secret: string, ignoreExpiration = false): AccessClaims {
  const payload = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    ignoreExpiration,
  }) as JwtPayload;
  if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
    throw new jwt.JsonWebTokenError('Malformed claims');
  }
  return { sub: payload.sub, sid: payload.sid };
}

export function verifyAccessToken(token: string): AccessClaims {
  try {
    return verify(token, getConfig().accessSecret);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'Access token expired', 'TOKEN_EXPIRED');
    }
    throw new AppError(401, 'Invalid authentication token', 'INVALID_TOKEN');
  }
}

export function verifyRefreshToken(token: string, ignoreExpiration = false): AccessClaims {
  try {
    return verify(token, getConfig().refreshSecret, ignoreExpiration);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }
}

export const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export const generateCsrfToken = (): string => crypto.randomBytes(32).toString('hex');

