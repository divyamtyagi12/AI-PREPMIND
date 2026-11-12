import { z } from 'zod';
import {
  DEGREES,
  PREFERRED_LANGUAGES,
  PREPARATION_GOALS,
  PREPARATION_LEVELS,
} from '../utils/constants';
import { nameSchema, passwordSchema } from './auth.validators';

const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);

const currentYear = new Date().getFullYear();

/**
 * Strict: unknown keys (email, role, passwordHash, id, ...) are rejected, so a client
 * can never use this endpoint to escalate privileges or touch other fields.
 */
export const updateProfileSchema = z
  .object({
    name: nameSchema,
    college: text('College', 120),
    degree: z.enum(DEGREES, { error: 'Select a valid degree' }),
    branch: text('Branch', 80),
    graduationYear: z.coerce
      .number({ error: 'Graduation year must be a number' })
      .int()
      .min(currentYear - 10, 'Graduation year is too far in the past')
      .max(currentYear + 8, 'Graduation year is too far in the future'),
    targetRole: text('Target role', 80),
    preparationLevel: z.enum(PREPARATION_LEVELS, { error: 'Select a valid preparation level' }),
    preferredLanguage: z.enum(PREFERRED_LANGUAGES, { error: 'Select a valid language' }),
    preparationGoals: z
      .array(z.enum(PREPARATION_GOALS, { error: 'Invalid preparation goal' }))
      .min(1, 'Select at least one preparation goal')
      .max(PREPARATION_GOALS.length)
      .transform((goals) => [...new Set(goals)]),
  })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: 'Current password is required' }).min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string({ error: 'Please confirm your new password' }),
  })
  .strict()
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
