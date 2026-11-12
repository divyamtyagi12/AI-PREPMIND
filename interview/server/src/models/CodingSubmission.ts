import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const CODING_SUBMISSION_VERDICTS = [
  'queued',
  'running',
  'accepted',
  'wrong_answer',
  'compilation_error',
  'runtime_error',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'system_error',
] as const;

const testCaseResultSchema = new Schema(
  {
    testCaseId: { type: Schema.Types.ObjectId, ref: 'CodingTestCase' },
    status: { type: String, required: true },
    visibility: { type: String, enum: ['sample', 'hidden'], required: true },
    executionTimeMs: { type: Number, default: null },
    memoryUsedKb: { type: Number, default: null },
    // Only populated for sample test cases; hidden test details are never disclosed
    input: { type: String, default: null },
    expectedOutput: { type: String, default: null },
    actualOutput: { type: String, default: null },
    errorMessage: { type: String, default: null },
  },
  { _id: false },
);

const codingSubmissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true, index: true },

    language: { type: String, required: true },
    sourceCode: { type: String, required: true, maxlength: 50000 },

    verdict: {
      type: String,
      enum: CODING_SUBMISSION_VERDICTS,
      default: 'queued',
      index: true,
    },

    passedTestCases: { type: Number, default: 0, min: 0 },
    totalTestCases: { type: Number, default: 0, min: 0 },

    executionTimeMs: { type: Number, default: null },
    memoryUsedKb: { type: Number, default: null },

    compileOutput: { type: String, default: null },
    executionProvider: { type: String, default: 'judge0' },
    testCaseResults: { type: [testCaseResultSchema], default: [] },

    submittedAt: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date, default: null },
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

codingSubmissionSchema.index({ userId: 1, problemId: 1, verdict: 1 });
codingSubmissionSchema.index({ userId: 1, submittedAt: -1 });

export type CodingSubmissionAttrs = InferSchemaType<typeof codingSubmissionSchema>;
export type CodingSubmissionDoc = HydratedDocument<CodingSubmissionAttrs>;

export const CodingSubmission = model('CodingSubmission', codingSubmissionSchema);

