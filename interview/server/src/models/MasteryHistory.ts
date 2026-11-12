import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const masteryHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },

    observationId: { type: String, required: true, unique: true, index: true },

    previousMastery: { type: Number, required: true, min: 0, max: 1 },
    posteriorMastery: { type: Number, required: true, min: 0, max: 1 },
    updatedMastery: { type: Number, required: true, min: 0, max: 1 },

    isCorrect: { type: Boolean, required: true },
    parameterVersion: { type: String, required: true, default: 'bkt-v1' },

    recordedAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        ret.userId = String(ret.userId);
        ret.topicId = String(ret.topicId);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

masteryHistorySchema.index({ userId: 1, topicId: 1, recordedAt: 1 });
masteryHistorySchema.index({ userId: 1, recordedAt: -1 });

export type MasteryHistoryAttrs = InferSchemaType<typeof masteryHistorySchema>;
export type MasteryHistoryDoc = HydratedDocument<MasteryHistoryAttrs>;

export const MasteryHistory = model('MasteryHistory', masteryHistorySchema);

