import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const TEST_CASE_VISIBILITY = ['sample', 'hidden'] as const;

const codingTestCaseSchema = new Schema(
  {
    problemId: { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true, index: true },
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    visibility: { type: String, enum: TEST_CASE_VISIBILITY, default: 'sample', index: true },
    weight: { type: Number, default: 1, min: 1 },
    order: { type: Number, default: 1 },
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

codingTestCaseSchema.index({ problemId: 1, visibility: 1 });

export type CodingTestCaseAttrs = InferSchemaType<typeof codingTestCaseSchema>;
export type CodingTestCaseDoc = HydratedDocument<CodingTestCaseAttrs>;

export const CodingTestCase = model('CodingTestCase', codingTestCaseSchema);

