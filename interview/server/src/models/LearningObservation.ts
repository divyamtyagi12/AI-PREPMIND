import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DIFFICULTY_LEVELS } from '../utils/constants';

export const OBSERVATION_SOURCE_TYPES = [
  'diagnostic',
  'assessment',
  'practice',
  'adaptive_practice',
] as const;

export type ObservationSourceType = (typeof OBSERVATION_SOURCE_TYPES)[number];

const learningObservationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },

    sourceType: {
      type: String,
      enum: OBSERVATION_SOURCE_TYPES,
      required: true,
      index: true,
    },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },

    // Stable deterministic identifier for event-level idempotency
    observationId: { type: String, required: true, unique: true, index: true },

    isCorrect: { type: Boolean, required: true },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, required: true },

    observedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date, default: null },

    parameterVersion: { type: String, required: true, default: 'bkt-v1' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        ret.userId = String(ret.userId);
        ret.topicId = String(ret.topicId);
        ret.questionId = String(ret.questionId);
        ret.sourceId = String(ret.sourceId);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

learningObservationSchema.index({ userId: 1, topicId: 1, observedAt: 1 });
learningObservationSchema.index({ userId: 1, observedAt: -1 });

export type LearningObservationAttrs = InferSchemaType<typeof learningObservationSchema>;
export type LearningObservationDoc = HydratedDocument<LearningObservationAttrs>;

export const LearningObservation = model('LearningObservation', learningObservationSchema);

