import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { SKILL_BASELINE_LEVELS } from '../utils/constants';

const topicPerformanceSchema = new Schema(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    topicName: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryName: { type: String, required: true },
    totalQuestions: { type: Number, required: true, min: 0 },
    attempted: { type: Number, required: true, min: 0 },
    correct: { type: Number, required: true, min: 0 },
    incorrect: { type: Number, required: true, min: 0 },
    unanswered: { type: Number, required: true, min: 0 },
    accuracy: { type: Number, required: true, min: 0, max: 100 },
    baselineLevel: { type: String, enum: SKILL_BASELINE_LEVELS, required: true },
  },
  { _id: false },
);

const categoryPerformanceSchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryName: { type: String, required: true },
    totalQuestions: { type: Number, required: true, min: 0 },
    attempted: { type: Number, required: true, min: 0 },
    correct: { type: Number, required: true, min: 0 },
    incorrect: { type: Number, required: true, min: 0 },
    unanswered: { type: Number, required: true, min: 0 },
    accuracy: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const assessmentResultSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'AssessmentSession', required: true, unique: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'AssessmentTemplate', required: true, index: true },
    templateTitle: { type: String, required: true },
    templateType: { type: String, required: true, index: true },

    totalQuestions: { type: Number, required: true, min: 1 },
    attemptedQuestions: { type: Number, required: true, min: 0 },
    correctAnswers: { type: Number, required: true, min: 0 },
    incorrectAnswers: { type: Number, required: true, min: 0 },
    unansweredQuestions: { type: Number, required: true, min: 0 },

    rawScore: { type: Number, required: true },
    maximumScore: { type: Number, required: true },
    scorePercentage: { type: Number, required: true },
    accuracy: { type: Number, required: true, min: 0, max: 100 },

    topicPerformance: { type: [topicPerformanceSchema], default: [] },
    categoryPerformance: { type: [categoryPerformanceSchema], default: [] },

    timeTakenSeconds: { type: Number, required: true, min: 0 },
    completionTrigger: {
      type: String,
      enum: ['manual_submit', 'timer_expired'],
      default: 'manual_submit',
    },
    completedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        ret.sessionId = String(ret.sessionId);
        ret.templateId = String(ret.templateId);
        ret.userId = String(ret.userId);
        if (Array.isArray(ret.topicPerformance)) {
          ret.topicPerformance = ret.topicPerformance.map((tp: any) => ({
            ...tp,
            topicId: String(tp.topicId),
            subjectId: String(tp.subjectId),
            categoryId: String(tp.categoryId),
          }));
        }
        if (Array.isArray(ret.categoryPerformance)) {
          ret.categoryPerformance = ret.categoryPerformance.map((cp: any) => ({
            ...cp,
            categoryId: String(cp.categoryId),
          }));
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

assessmentResultSchema.index({ userId: 1, completedAt: -1 });

export type AssessmentResultAttrs = InferSchemaType<typeof assessmentResultSchema>;
export type AssessmentResultDoc = HydratedDocument<AssessmentResultAttrs>;

export const AssessmentResult = model('AssessmentResult', assessmentResultSchema);

