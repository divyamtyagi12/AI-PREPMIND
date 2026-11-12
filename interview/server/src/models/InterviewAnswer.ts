import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const interviewAnswerSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'InterviewQuestion', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    answerText: { type: String, required: true, trim: true, maxlength: 10000 },
    responseMode: { type: String, enum: ['text', 'voice'], default: 'text' },
    responseDurationSeconds: { type: Number, default: null },

    submittedAt: { type: Date, default: Date.now },
    evaluationStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
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

interviewAnswerSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

export type InterviewAnswerAttrs = InferSchemaType<typeof interviewAnswerSchema>;
export type InterviewAnswerDoc = HydratedDocument<InterviewAnswerAttrs>;

export const InterviewAnswer = model('InterviewAnswer', interviewAnswerSchema);

