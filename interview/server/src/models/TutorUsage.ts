import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const tutorUsageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    requestCount: { type: Number, default: 0, min: 0 },
    promptTokens: { type: Number, default: 0, min: 0 },
    completionTokens: { type: Number, default: 0, min: 0 },
    totalTokens: { type: Number, default: 0, min: 0 },
    failedRequests: { type: Number, default: 0, min: 0 },
    rateLimitHits: { type: Number, default: 0, min: 0 },
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

tutorUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export type TutorUsageAttrs = InferSchemaType<typeof tutorUsageSchema>;
export type TutorUsageDoc = HydratedDocument<TutorUsageAttrs>;

export const TutorUsage = model('TutorUsage', tutorUsageSchema);

