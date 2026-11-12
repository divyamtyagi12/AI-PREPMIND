import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const roadmapAdjustmentLogSchema = new Schema(
  {
    roadmapId: { type: Schema.Types.ObjectId, ref: 'LearningRoadmap', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    adjustmentReason: { type: String, required: true, trim: true, maxlength: 500 },
    previousSchedule: { type: Schema.Types.Mixed, default: {} },
    updatedSchedule: { type: Schema.Types.Mixed, default: {} },

    affectedTaskIds: [{ type: Schema.Types.ObjectId, ref: 'RoadmapTask' }],
    triggeringEvent: { type: String, required: true, trim: true },

    adjustmentTimestamp: { type: Date, required: true, default: Date.now, index: true },
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

roadmapAdjustmentLogSchema.index({ roadmapId: 1, adjustmentTimestamp: -1 });

export type RoadmapAdjustmentLogAttrs = InferSchemaType<typeof roadmapAdjustmentLogSchema>;
export type RoadmapAdjustmentLogDoc = HydratedDocument<RoadmapAdjustmentLogAttrs>;

export const RoadmapAdjustmentLog = model('RoadmapAdjustmentLog', roadmapAdjustmentLogSchema);

