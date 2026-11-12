import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { getConfig } from '../config/env';
import { Session } from '../models/Session';
import { User, type UserDoc } from '../models/User';
import { AppError } from '../utils/AppError';
import {
  safeEqual,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens';

const BCRYPT_ROUNDS = 12;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_ROUNDS);

// Pre-computed hash so login takes similar time whether or not the email exists.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash('not-a-real-password', BCRYPT_ROUNDS));

export interface IssuedSession {
  user: UserDoc;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

async function createSession(user: UserDoc, userAgent?: string): Promise<IssuedSession> {
  const expiresAt = new Date(Date.now() + getConfig().refreshTtlSeconds * 1000);
  const sessionId = new Types.ObjectId();
  const refreshToken = signRefreshToken(user.id, sessionId.toString(), expiresAt);
  await Session.create({
    _id: sessionId,
    userId: user._id,
    refreshTokenHash: sha256(refreshToken),
    userAgent: userAgent?.slice(0, 300),
    expiresAt,
  });
  return {
    user,
    accessToken: signAccessToken(user.id, sessionId.toString()),
    refreshToken,
    expiresAt,
  };
}

export async function registerUser(
  input: { name: string; email: string; password: string },
  userAgent?: string,
): Promise<IssuedSession> {
  if (await User.exists({ email: input.email })) {
    throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN', {
      email: 'An account with this email already exists',
    });
  }
  let user: UserDoc;
  try {
    user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });
  } catch (err) {
    // Unique index guards against a race between the check above and the insert.
    if ((err as { code?: number }).code === 11000) {
      throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN', {
        email: 'An account with this email already exists',
      });
    }
    throw err;
  }
  return createSession(user, userAgent);
}

export async function loginUser(
  input: { email: string; password: string },
  userAgent?: string,
): Promise<IssuedSession> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const ok = await bcrypt.compare(input.password, user ? user.passwordHash : await getDummyHash());
  if (!user || !ok) {
    throw new AppError(401, 'Incorrect email or password', 'INVALID_CREDENTIALS');
  }
  return createSession(user, userAgent);
}

/**
 * Rotates the refresh token. If a token that is not the session's current one is presented
 * (i.e. an already-rotated token was replayed), the whole session is revoked.
 */
export async function refreshSession(refreshToken: string): Promise<IssuedSession> {
  const claims = verifyRefreshToken(refreshToken);
  const session = Types.ObjectId.isValid(claims.sid) ? await Session.findById(claims.sid) : null;
  if (!session || session.revokedAt || session.expiresAt <= new Date() || String(session.userId) !== claims.sub) {
    throw new AppError(401, 'Session is no longer valid', 'SESSION_REVOKED');
  }
  if (!safeEqual(session.refreshTokenHash, sha256(refreshToken))) {
    session.revokedAt = new Date();
    await session.save();
    throw new AppError(401, 'Refresh token reuse detected; session revoked', 'SESSION_REVOKED');
  }
  const user = await User.findById(session.userId);
  if (!user) throw new AppError(401, 'Session is no longer valid', 'SESSION_REVOKED');

  const newRefresh = signRefreshToken(user.id, session.id, session.expiresAt);
  session.refreshTokenHash = sha256(newRefresh);
  await session.save();
  return {
    user,
    accessToken: signAccessToken(user.id, session.id),
    refreshToken: newRefresh,
    expiresAt: session.expiresAt,
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  if (!Types.ObjectId.isValid(sessionId)) return;
  await Session.updateOne({ _id: sessionId, revokedAt: null }, { revokedAt: new Date() });
}

/** Revokes all of a user's sessions, optionally keeping one (used after a password change). */
export async function revokeOtherSessions(userId: string, keepSessionId?: string): Promise<void> {
  const filter: Record<string, unknown> = { userId, revokedAt: null };
  if (keepSessionId) filter._id = { $ne: keepSessionId };
  await Session.updateMany(filter, { revokedAt: new Date() });
}

/** Validates that a session is active and belongs to the user. */
export async function isSessionActive(sessionId: string, userId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(sessionId)) return false;
  const s = await Session.findOne({
    _id: sessionId,
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select('_id');
  return Boolean(s);
}

