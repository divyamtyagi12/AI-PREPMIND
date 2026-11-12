import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const criterionScoreSchema = new Schema(
  {
    criterion: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 5 },
    weight: { type: Number, required: true, default: 1 },
    evidence: { type: String, default: '' },
    feedback: { type: String, default: '' },
  },
  { _id: false },
);

const interviewEvaluationSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'InterviewQuestion', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    evaluationRubricVersion: { type: String, default: 'v1.0' },
    criterionScores: { type: [criterionScoreSchema], default: [] },
    overallQuestionScore: { type: Number, required: true, min: 0, max: 5 },

    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    suggestedImprovements: [{ type: String }],

    evaluationModel: { type: String, default: 'gemini-2.5-flash' },
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

interviewEvaluationSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

export type InterviewEvaluationAttrs = InferSchemaType<typeof interviewEvaluationSchema>;
export type InterviewEvaluationDoc = HydratedDocument<InterviewEvaluationAttrs>;

export const InterviewEvaluation = model('InterviewEvaluation', interviewEvaluationSchema);

