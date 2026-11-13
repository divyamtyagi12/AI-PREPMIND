import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { EXTERNAL_PROGRESS_STATUSES } from '../utils/constants';

const externalProblemProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    externalProblemId: { type: Schema.Types.ObjectId, ref: 'ExternalProblem', required: true, index: true },
    status: { type: String, enum: EXTERNAL_PROGRESS_STATUSES, default: 'Not Started', index: true },
    isBookmarked: { type: Boolean, default: false, index: true },
    isRevision: { type: Boolean, default: false, index: true },
    notes: { type: String, trim: true, default: '', maxlength: 2000 },
    solvedAt: { type: Date },
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

externalProblemProgressSchema.index({ userId: 1, externalProblemId: 1 }, { unique: true });

export type ExternalProblemProgressAttrs = InferSchemaType<typeof externalProblemProgressSchema>;
export type ExternalProblemProgressDoc = HydratedDocument<ExternalProblemProgressAttrs>;

export const ExternalProblemProgress = model('ExternalProblemProgress', externalProblemProgressSchema);

