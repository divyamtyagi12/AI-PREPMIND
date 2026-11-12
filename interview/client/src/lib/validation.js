import { z } from 'zod';
import {
  DEGREES,
  PREFERRED_LANGUAGES,
  PREPARATION_GOALS,
  PREPARATION_LEVELS,
} from './constants';

const currentYear = new Date().getFullYear();

const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be at most 80 characters');
const email = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');
const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name,
    email,
    password: newPassword,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const req = (label, max) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);

export const academicSchema = z.object({
  college: req('College', 120),
  degree: z.enum(DEGREES, { error: 'Select your degree' }),
  branch: req('Branch', 80),
  graduationYear: z.coerce
    .number({ error: 'Enter a valid graduation year' })
    .int('Enter a valid graduation year')
    .min(currentYear - 10, 'Graduation year is too far in the past')
    .max(currentYear + 8, 'Graduation year is too far in the future'),
});

export const goalsSchema = z.object({
  targetRole: req('Target role', 80),
  preparationLevel: z.enum(PREPARATION_LEVELS, { error: 'Select your preparation level' }),
  preferredLanguage: z.enum(PREFERRED_LANGUAGES, { error: 'Select a language' }),
  preparationGoals: z.array(z.enum(PREPARATION_GOALS)).min(1, 'Select at least one goal'),
});

export const profileSchema = z.object({ name }).extend(academicSchema.shape).extend(goalsSchema.shape);

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

/** Runs a zod schema and returns `{ data }` or `{ errors: { field: message } }`. */
export function validate(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { errors };
}

