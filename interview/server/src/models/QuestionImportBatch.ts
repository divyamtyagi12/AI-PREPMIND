import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { JOB_STATUSES } from '../utils/constants';

const questionImportBatchSchema = new Schema(
  {
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true, trim: true },
    totalRows: { type: Number, required: true, default: 0 },
    validRows: { type: Number, required: true, default: 0 },
    invalidRows: { type: Number, required: true, default: 0 },
    duplicateRows: { type: Number, required: true, default: 0 },
    errors: { type: Schema.Types.Mixed, default: [] },
    status: { type: String, enum: JOB_STATUSES, default: 'completed', index: true },
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

export type QuestionImportBatchAttrs = InferSchemaType<typeof questionImportBatchSchema>;
export type QuestionImportBatchDoc = HydratedDocument<QuestionImportBatchAttrs>;

export const QuestionImportBatch = model('QuestionImportBatch', questionImportBatchSchema);
