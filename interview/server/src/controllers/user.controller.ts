import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { getAuth } from '../middleware/auth';
import { User, isOnboardingComplete } from '../models/User';
import { hashPassword, revokeOtherSessions } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import type { ChangePasswordInput, UpdateProfileInput } from '../validators/user.validators';

export async function getProfile(req: Request, res: Response): Promise<void> {
  const { user } = getAuth(req);
  res.json({ success: true, data: { user: user.toJSON() } });
}

/** Always operates on the authenticated user; there is no way to address another user's id. */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { user } = getAuth(req);
  const input = req.body as UpdateProfileInput;
  user.set(input);
  user.onboardingCompleted = isOnboardingComplete(user);
  await user.save();
  res.json({ success: true, data: { user: user.toJSON() } });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { user: authUser, sessionId } = getAuth(req);
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  const user = await User.findById(authUser._id).select('+passwordHash');
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(400, 'Current password is incorrect', 'VALIDATION_ERROR', {
      currentPassword: 'Current password is incorrect',
    });
  }
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  // Sign out every other device; the current session stays valid.
  await revokeOtherSessions(user.id, sessionId);
  res.json({ success: true, data: { message: 'Password updated' } });
}

