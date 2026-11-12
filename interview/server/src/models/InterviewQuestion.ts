import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const interviewQuestionSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
    questionText: { type: String, required: true, trim: true, maxlength: 2000 },
    questionType: { type: String, required: true, default: 'technical' },

    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', default: null },
    topicName: { type: String, default: null },
    difficulty: { type: String, default: 'intermediate' },

    expectedCompetencies: [{ type: String, trim: true }],
    evaluationRubric: { type: Schema.Types.Mixed, default: {} },

    questionOrder: { type: Number, required: true, min: 1 },
    parentQuestionId: { type: Schema.Types.ObjectId, ref: 'InterviewQuestion', default: null },
    isFollowUp: { type: Boolean, default: false },

    generatedBy: { type: String, enum: ['gemini', 'question_bank'], default: 'gemini' },
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

interviewQuestionSchema.index({ sessionId: 1, questionOrder: 1 });

export type InterviewQuestionAttrs = InferSchemaType<typeof interviewQuestionSchema>;
export type InterviewQuestionDoc = HydratedDocument<InterviewQuestionAttrs>;

export const InterviewQuestion = model('InterviewQuestion', interviewQuestionSchema);

