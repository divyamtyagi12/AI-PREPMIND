import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DIFFICULTY_LEVELS, EXTERNAL_PLATFORMS } from '../utils/constants';

const externalProblemSchema = new Schema(
  {
    sourcePlatform: { type: String, enum: EXTERNAL_PLATFORMS, required: true, index: true },
    externalProblemId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    sourceUrl: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, required: true, index: true },
    externalRating: { type: Number },
    topicIds: [{ type: Schema.Types.ObjectId, ref: 'Topic', index: true }],
    tags: { type: [String], default: [], index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['Published', 'Archived'], default: 'Published', index: true },
    licenseStatus: { type: String, default: 'metadata_only' },
    lastSyncedAt: { type: Date, default: Date.now },
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

externalProblemSchema.index({ sourcePlatform: 1, externalProblemId: 1 }, { unique: true });

export type ExternalProblemAttrs = InferSchemaType<typeof externalProblemSchema>;
export type ExternalProblemDoc = HydratedDocument<ExternalProblemAttrs>;

export const ExternalProblem = model('ExternalProblem', externalProblemSchema);

