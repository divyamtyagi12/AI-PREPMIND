import { Schema, model, type Types } from 'mongoose';

/**
 * Server-managed login session. Only a SHA-256 hash of the current refresh token is stored.
 * Revoking a session (logout, password change, refresh-token reuse) instantly invalidates
 * both its access and refresh tokens because every request checks the session.
 */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String, maxlength: 300 },
    revokedAt: { type: Date, default: null },
    // Absolute session lifetime; Mongo's TTL monitor deletes the document afterwards.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);

export interface SessionAttrs {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  refreshTokenHash: string;
  revokedAt: Date | null;
  expiresAt: Date;
}

export const Session = model('Session', sessionSchema);

