import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DIFFICULTY_LEVELS, JOB_STATUSES, QUESTION_TYPES } from '../utils/constants';

const questionGenerationJobSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, required: true },
    questionType: { type: String, enum: QUESTION_TYPES, required: true },
    requestedCount: { type: Number, required: true, min: 1, max: 10 },
    generatedCount: { type: Number, default: 0 },
    generatedQuestionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    status: { type: String, enum: JOB_STATUSES, default: 'pending', index: true },
    error: { type: String, default: null },
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

export type QuestionGenerationJobAttrs = InferSchemaType<typeof questionGenerationJobSchema>;
export type QuestionGenerationJobDoc = HydratedDocument<QuestionGenerationJobAttrs>;

export const QuestionGenerationJob = model('QuestionGenerationJob', questionGenerationJobSchema);

