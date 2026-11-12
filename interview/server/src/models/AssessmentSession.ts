import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ASSESSMENT_ELIGIBLE_QUESTION_TYPES, ASSESSMENT_SESSION_STATUSES, DIFFICULTY_LEVELS } from '../utils/constants';

const snapshotOptionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const questionSnapshotSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    questionVersion: { type: Number, required: true, default: 1 },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    topicName: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryName: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ASSESSMENT_ELIGIBLE_QUESTION_TYPES, required: true },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, required: true },
    options: { type: [snapshotOptionSchema], required: true },
    // Private evaluation fields - MUST NEVER be serialized during active sessions
    correctAnswer: { type: Schema.Types.Mixed, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false },
);

const sessionAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedAnswer: { type: Schema.Types.Mixed, default: null },
    revision: { type: Number, required: true, default: 1, min: 1 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const scoringSnapshotSchema = new Schema(
  {
    correct: { type: Number, required: true, default: 1 },
    incorrect: { type: Number, required: true, default: 0 },
    unanswered: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const assessmentSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'AssessmentTemplate', required: true, index: true },
    templateTitle: { type: String, required: true },
    templateType: { type: String, required: true },

    status: {
      type: String,
      enum: ASSESSMENT_SESSION_STATUSES,
      default: 'in_progress',
      required: true,
      index: true,
    },

    questionSnapshots: { type: [questionSnapshotSchema], required: true },
    answers: { type: [sessionAnswerSchema], default: [] },

    scoringSnapshot: { type: scoringSnapshotSchema, required: true },
    reviewReleasePolicySnapshot: { type: String, default: 'immediate' },

    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    submittedAt: { type: Date, default: null },

    score: { type: Number, default: null },
    maximumScore: { type: Number, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        // Default safety: always strip correctAnswer and explanation from questionSnapshots in toJSON
        if (Array.isArray(ret.questionSnapshots)) {
          ret.questionSnapshots = ret.questionSnapshots.map((q: any) => {
            const safeQ = { ...q, questionId: String(q.questionId), topicId: String(q.topicId), subjectId: String(q.subjectId), categoryId: String(q.categoryId) };
            delete safeQ.correctAnswer;
            delete safeQ.explanation;
            return safeQ;
          });
        }
        if (Array.isArray(ret.answers)) {
          ret.answers = ret.answers.map((a: any) => ({
            ...a,
            questionId: String(a.questionId),
          }));
        }
        return ret;
      },
    },
  },
);

// Prevent duplicate active sessions per user + template at database level
assessmentSessionSchema.index(
  { userId: 1, templateId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'in_progress' },
  },
);

assessmentSessionSchema.index({ userId: 1, templateId: 1, status: 1, createdAt: -1 });

export type AssessmentSessionAttrs = InferSchemaType<typeof assessmentSessionSchema>;
export type AssessmentSessionDoc = HydratedDocument<AssessmentSessionAttrs>;

export const AssessmentSession = model('AssessmentSession', assessmentSessionSchema);

