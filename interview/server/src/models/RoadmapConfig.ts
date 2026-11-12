import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const DEFAULT_ROADMAP_CONFIG = {
  version: 'roadmap-v1',
  minSessionDuration: 15,
  maxDailyWorkload: 360,
  defaultRevisionIntervals: [1, 3, 7, 14, 30] as number[],
  replanningCooldownHours: 12,
  priorityWeights: {
    masteryGap: 0.35,
    placementWeight: 0.25,
    prerequisiteImportance: 0.15,
    revisionUrgency: 0.15,
    preferenceWeight: 0.10,
  },
  isActive: true,
};

const priorityWeightsSchema = new Schema(
  {
    masteryGap: { type: Number, required: true, default: 0.35 },
    placementWeight: { type: Number, required: true, default: 0.25 },
    prerequisiteImportance: { type: Number, required: true, default: 0.15 },
    revisionUrgency: { type: Number, required: true, default: 0.15 },
    preferenceWeight: { type: Number, required: true, default: 0.10 },
  },
  { _id: false },
);

const roadmapConfigSchema = new Schema(
  {
    version: { type: String, required: true, unique: true, trim: true },
    minSessionDuration: { type: Number, required: true, default: 15, min: 5, max: 60 },
    maxDailyWorkload: { type: Number, required: true, default: 360, min: 30, max: 720 },
    defaultRevisionIntervals: { type: [Number], default: [1, 3, 7, 14, 30] },
    replanningCooldownHours: { type: Number, default: 12, min: 0, max: 72 },
    priorityWeights: { type: priorityWeightsSchema, required: true, default: () => ({ ...DEFAULT_ROADMAP_CONFIG.priorityWeights }) },
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String, trim: true, default: 'Default Phase 5 Roadmap Configuration' },
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

export type RoadmapConfigAttrs = InferSchemaType<typeof roadmapConfigSchema>;
export type RoadmapConfigDoc = HydratedDocument<RoadmapConfigAttrs>;

export const RoadmapConfig = model('RoadmapConfig', roadmapConfigSchema);
