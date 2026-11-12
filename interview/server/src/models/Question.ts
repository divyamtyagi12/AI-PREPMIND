import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DIFFICULTY_LEVELS, QUESTION_STATUSES, QUESTION_TYPES } from '../utils/constants';

const optionSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    type: { type: String, enum: QUESTION_TYPES, required: true, index: true },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, required: true, index: true },
    options: { type: [optionSchema], default: [] },
    // Stored as an array of option IDs for MCQs or reference text for conceptual questions
    correctAnswer: { type: Schema.Types.Mixed, required: true, select: false },
    explanation: { type: String, required: true, trim: true, select: false, maxlength: 5000 },
    hints: { type: [String], default: [] },
    tags: { type: [String], default: [], index: true },
    evaluationCriteria: { type: [String], default: [], select: false },
    status: { type: String, enum: QUESTION_STATUSES, default: 'Draft', index: true },
    contentOrigin: {
      type: String,
      enum: ['internal', 'ai_generated', 'external_metadata', 'bulk_imported'],
      default: 'internal',
      index: true,
    },
    referencePlatform: { type: String, trim: true, default: '' },
    reviewStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved', index: true },
    reviewFeedback: { type: String, trim: true, default: '' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 },
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

export type QuestionAttrs = InferSchemaType<typeof questionSchema>;
export type QuestionDoc = HydratedDocument<QuestionAttrs>;

export const Question = model('Question', questionSchema);

