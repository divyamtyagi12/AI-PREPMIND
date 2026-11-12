import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const MILESTONE_STATUSES = ['pending', 'completed'] as const;

const roadmapMilestoneSchema = new Schema(
  {
    roadmapId: { type: Schema.Types.ObjectId, ref: 'LearningRoadmap', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: '', maxlength: 1000 },

    targetDate: { type: Date, required: true, index: true },
    relatedTopics: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],

    completionCriteria: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: MILESTONE_STATUSES, default: 'pending', index: true },
    completionDate: { type: Date, default: null },

    progressRatio: { type: Number, default: 0, min: 0, max: 1 },
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

roadmapMilestoneSchema.index({ roadmapId: 1, targetDate: 1 });
roadmapMilestoneSchema.index({ userId: 1, status: 1 });

export type RoadmapMilestoneAttrs = InferSchemaType<typeof roadmapMilestoneSchema>;
export type RoadmapMilestoneDoc = HydratedDocument<RoadmapMilestoneAttrs>;

export const RoadmapMilestone = model('RoadmapMilestone', roadmapMilestoneSchema);

