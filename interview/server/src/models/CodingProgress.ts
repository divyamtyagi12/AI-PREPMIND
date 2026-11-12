import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const CODING_SOLVE_STATUSES = ['unattempted', 'attempted', 'solved'] as const;

const codingProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true, index: true },

    status: { type: String, enum: CODING_SOLVE_STATUSES, default: 'unattempted', index: true },
    attemptCount: { type: Number, default: 0, min: 0 },
    bestVerdict: { type: String, default: null },

    firstAcceptedAt: { type: Date, default: null },
    lastAttemptedAt: { type: Date, default: null },

    languagesUsed: [{ type: String }],
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

codingProgressSchema.index({ userId: 1, problemId: 1 }, { unique: true });
codingProgressSchema.index({ userId: 1, status: 1 });

export type CodingProgressAttrs = InferSchemaType<typeof codingProgressSchema>;
export type CodingProgressDoc = HydratedDocument<CodingProgressAttrs>;

export const CodingProgress = model('CodingProgress', codingProgressSchema);

