import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PREFERRED_LANGUAGES, PREPARATION_LEVELS, ROLES } from '../utils/constants';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: ROLES, default: 'student' },

    college: { type: String, trim: true, maxlength: 120 },
    degree: { type: String, trim: true, maxlength: 60 },
    branch: { type: String, trim: true, maxlength: 80 },
    graduationYear: { type: Number, min: 2000, max: 2100 },

    targetRole: { type: String, trim: true, maxlength: 80 },
    preparationLevel: { type: String, enum: [...PREPARATION_LEVELS, undefined] },

    preferredLanguage: { type: String, enum: [...PREFERRED_LANGUAGES, undefined] },

    preparationGoals: { type: [String], default: [] },

    onboardingCompleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs>;

export const User = model('User', userSchema);

/** Fields a student must fill in to be considered onboarded. */
export function isOnboardingComplete(u: {
  college?: string | null;
  degree?: string | null;
  branch?: string | null;
  graduationYear?: number | null;
  targetRole?: string | null;
  preparationLevel?: string | null;
  preferredLanguage?: string | null;
  preparationGoals?: string[] | null;
}): boolean {
  return Boolean(
    u.college &&
      u.degree &&
      u.branch &&
      u.graduationYear &&
      u.targetRole &&
      u.preparationLevel &&
      u.preferredLanguage &&
      u.preparationGoals &&
      u.preparationGoals.length > 0,
  );
}

