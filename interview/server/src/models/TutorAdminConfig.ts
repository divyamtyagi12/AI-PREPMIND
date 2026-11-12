import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const tutorAdminConfigSchema = new Schema(
  {
    version: { type: Number, default: 1, unique: true },
    isActive: { type: Boolean, default: true },
    dailyRequestLimit: { type: Number, default: 30, min: 1, max: 200 },
    allowedModes: {
      type: [String],
      default: ['explain', 'hint', 'guided', 'solution', 'quiz', 'review'],
    },
    defaultModel: { type: String, default: 'gemini-2.5-flash' },
    temperature: { type: Number, default: 0.6, min: 0.0, max: 2.0 },
    maxOutputTokens: { type: Number, default: 1500, min: 256, max: 4096 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export type TutorAdminConfigAttrs = InferSchemaType<typeof tutorAdminConfigSchema>;
export type TutorAdminConfigDoc = HydratedDocument<TutorAdminConfigAttrs>;

export const TutorAdminConfig = model('TutorAdminConfig', tutorAdminConfigSchema);

