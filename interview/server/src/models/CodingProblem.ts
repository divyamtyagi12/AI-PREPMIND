import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DIFFICULTY_LEVELS } from '../utils/constants.js';

export const CODING_PROBLEM_STATUSES = ['Draft', 'Published', 'Archived'] as const;
export const CODING_SOURCE_TYPES = ['original', 'licensed', 'external_reference'] as const;
export const CODING_REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;

const exampleSchema = new Schema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false },
);

const starterCodeSchema = new Schema(
  {
    cpp: { type: String, default: '' },
    java: { type: String, default: '' },
    python: { type: String, default: '' },
    javascript: { type: String, default: '' },
  },
  { _id: false },
);

const codingProblemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, required: true, index: true },

    topicIds: [{ type: Schema.Types.ObjectId, ref: 'Topic', index: true }],

    constraints: [{ type: String, trim: true }],
    examples: { type: [exampleSchema], default: [] },
    starterCode: { type: starterCodeSchema, default: () => ({}) },

    executionMode: { type: String, default: 'stdin_stdout' },
    timeLimitMs: { type: Number, default: 2000, min: 500, max: 10000 },
    memoryLimitKb: { type: Number, default: 262144, min: 32768, max: 524288 }, // 256MB

    sourceType: { type: String, enum: CODING_SOURCE_TYPES, default: 'original', index: true },
    sourceUrl: { type: String, trim: true, default: '' },

    status: { type: String, enum: CODING_PROBLEM_STATUSES, default: 'Draft', index: true },
    reviewStatus: { type: String, enum: CODING_REVIEW_STATUSES, default: 'pending', index: true },

    referenceSolution: {
      type: Map,
      of: String,
      default: {},
      select: false, // Never expose reference solutions in student queries
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.referenceSolution;
        return ret;
      },
    },
  },
);

codingProblemSchema.index({ status: 1, difficulty: 1 });
codingProblemSchema.index({ status: 1, topicIds: 1 });

export type CodingProblemAttrs = InferSchemaType<typeof codingProblemSchema>;
export type CodingProblemDoc = HydratedDocument<CodingProblemAttrs>;

export const CodingProblem = model('CodingProblem', codingProblemSchema);

