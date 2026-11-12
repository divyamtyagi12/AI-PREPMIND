import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { EVALUATION_STATUSES } from '../utils/constants';

const practiceAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    questionVersion: { type: Number, required: true, default: 1 },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
    submittedAnswer: { type: Schema.Types.Mixed, required: true },
    isCorrect: { type: Boolean, default: null }, // boolean for objective, null for conceptual
    evaluationStatus: { type: String, enum: EVALUATION_STATUSES, required: true, default: 'evaluated' },
    timeTakenSeconds: { type: Number, default: 0, min: 0 },
    attemptNumber: { type: Number, required: true, default: 1 },
    practiceSessionId: { type: String, trim: true },
    idempotencyKey: { type: String, trim: true, index: true },
    submittedAt: { type: Date, default: Date.now, index: true },
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

practiceAttemptSchema.index({ userId: 1, questionId: 1, submittedAt: -1 });
practiceAttemptSchema.index({ userId: 1, topicId: 1 });
practiceAttemptSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

export type PracticeAttemptAttrs = InferSchemaType<typeof practiceAttemptSchema>;
export type PracticeAttemptDoc = HydratedDocument<PracticeAttemptAttrs>;

export const PracticeAttempt = model('PracticeAttempt', practiceAttemptSchema);
