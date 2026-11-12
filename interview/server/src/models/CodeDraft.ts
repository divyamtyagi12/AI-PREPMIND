import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const codeDraftSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true, index: true },
    language: { type: String, required: true },
    sourceCode: { type: String, required: true, maxlength: 50000 },
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

codeDraftSchema.index({ userId: 1, problemId: 1, language: 1 }, { unique: true });

export type CodeDraftAttrs = InferSchemaType<typeof codeDraftSchema>;
export type CodeDraftDoc = HydratedDocument<CodeDraftAttrs>;

export const CodeDraft = model('CodeDraft', codeDraftSchema);

