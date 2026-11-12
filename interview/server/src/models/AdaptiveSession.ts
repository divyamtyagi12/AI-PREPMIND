import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DIFFICULTY_LEVELS } from '../utils/constants';

const adaptiveSelectionEntrySchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, required: true },
    targetMastery: { type: Number, required: true },
    reason: { type: String, required: true },
    selectedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const adaptiveAnswerEntrySchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedAnswer: { type: Schema.Types.Mixed, required: true },
    isCorrect: { type: Boolean, required: true },
    masteryBefore: { type: Number, required: true },
    masteryAfter: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const adaptiveSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', default: null },

    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      required: true,
      default: 'in_progress',
      index: true,
    },

    maxQuestions: { type: Number, required: true, default: 5, min: 1, max: 20 },

    questionIds: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    currentQuestionId: { type: Schema.Types.ObjectId, ref: 'Question', default: null },

    answeredCount: { type: Number, required: true, default: 0 },
    correctCount: { type: Number, required: true, default: 0 },

    selectionHistory: { type: [adaptiveSelectionEntrySchema], default: [] },
    answers: { type: [adaptiveAnswerEntrySchema], default: [] },

    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        ret.userId = String(ret.userId);
        if (ret.categoryId) ret.categoryId = String(ret.categoryId);
        if (ret.subjectId) ret.subjectId = String(ret.subjectId);
        if (ret.topicId) ret.topicId = String(ret.topicId);
        if (ret.currentQuestionId) ret.currentQuestionId = String(ret.currentQuestionId);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

adaptiveSessionSchema.index({ userId: 1, status: 1 });
adaptiveSessionSchema.index({ userId: 1, topicId: 1, status: 1 });

export type AdaptiveSessionAttrs = InferSchemaType<typeof adaptiveSessionSchema>;
export type AdaptiveSessionDoc = HydratedDocument<AdaptiveSessionAttrs>;

export const AdaptiveSession = model('AdaptiveSession', adaptiveSessionSchema);

