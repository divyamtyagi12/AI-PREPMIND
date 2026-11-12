import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const INTERVIEW_TYPES = [
  'technical',
  'dsa',
  'hr',
  'behavioral',
  'project',
  'mixed',
] as const;

export const INTERVIEW_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export const INTERVIEW_RESPONSE_MODES = ['text', 'voice'] as const;
export const INTERVIEW_STATUSES = [
  'created',
  'in_progress',
  'evaluating',
  'completed',
  'abandoned',
] as const;

const interviewSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    interviewType: { type: String, enum: INTERVIEW_TYPES, required: true, index: true },
    targetRole: { type: String, required: true, trim: true, maxlength: 100 },
    difficulty: { type: String, enum: INTERVIEW_DIFFICULTIES, default: 'intermediate', index: true },
    responseMode: { type: String, enum: INTERVIEW_RESPONSE_MODES, default: 'text' },

    durationMinutes: { type: Number, required: true, min: 5, max: 60, default: 20 },
    status: { type: String, enum: INTERVIEW_STATUSES, default: 'created', index: true },

    currentQuestionIndex: { type: Number, default: 0, min: 0 },
    totalQuestions: { type: Number, default: 5, min: 1, max: 15 },
    answeredQuestions: { type: Number, default: 0, min: 0 },

    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },

    personalized: { type: Boolean, default: true },
    evaluationVersion: { type: String, default: 'v1.0' },

    // Optional project description for project-based interviews
    projectDetails: { type: String, trim: true, default: '' },
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

interviewSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });

export type InterviewSessionAttrs = InferSchemaType<typeof interviewSessionSchema>;
export type InterviewSessionDoc = HydratedDocument<InterviewSessionAttrs>;

export const InterviewSession = model('InterviewSession', interviewSessionSchema);

