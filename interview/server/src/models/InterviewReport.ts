import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const interviewReportSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'InterviewSession', required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    overallScorePercentage: { type: Number, required: true, min: 0, max: 100 },
    rubricScaleScore: { type: Number, required: true, min: 0, max: 5 },

    // Category sub-scores (0-100 normalized)
    technicalKnowledgeScore: { type: Number, default: null },
    problemSolvingScore: { type: Number, default: null },
    communicationScore: { type: Number, default: null },
    answerStructureScore: { type: Number, default: null },

    topStrengths: [{ type: String }],
    criticalWeaknesses: [{ type: String }],
    recommendations: [{ type: String }],

    recommendedTopicIds: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
    evaluationModel: { type: String, default: 'gemini-2.5-flash' },

    evaluatedAt: { type: Date, default: Date.now },
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

interviewReportSchema.index({ userId: 1, evaluatedAt: -1 });

export type InterviewReportAttrs = InferSchemaType<typeof interviewReportSchema>;
export type InterviewReportDoc = HydratedDocument<InterviewReportAttrs>;

export const InterviewReport = model('InterviewReport', interviewReportSchema);

