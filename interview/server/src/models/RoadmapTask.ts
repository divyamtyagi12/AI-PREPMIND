import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DIFFICULTY_LEVELS } from '../utils/constants';

export const TASK_TYPES = ['learn', 'practice', 'revision', 'assessment', 'coding_practice'] as const;
export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const;

const roadmapTaskSchema = new Schema(
  {
    roadmapId: { type: Schema.Types.ObjectId, ref: 'LearningRoadmap', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 250 },
    description: { type: String, trim: true, default: '', maxlength: 2000 },

    taskType: { type: String, enum: TASK_TYPES, required: true, index: true },
    difficulty: { type: String, enum: [...DIFFICULTY_LEVELS, null], default: null },

    estimatedMinutes: { type: Number, required: true, min: 5, max: 240, default: 30 },
    scheduledDate: { type: Date, required: true, index: true },

    status: { type: String, enum: TASK_STATUSES, default: 'pending', index: true },
    priority: { type: Number, default: 1, index: true }, // higher number = higher priority

    prerequisiteTaskIds: [{ type: Schema.Types.ObjectId, ref: 'RoadmapTask' }],
    linkedResourceIds: [{ type: Schema.Types.ObjectId }],
    linkedRoute: { type: String, trim: true, default: null },

    completedAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
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

// Indexes
roadmapTaskSchema.index({ roadmapId: 1, scheduledDate: 1 });
roadmapTaskSchema.index({ userId: 1, status: 1, scheduledDate: 1 });
roadmapTaskSchema.index({ roadmapId: 1, status: 1 });
roadmapTaskSchema.index({ roadmapId: 1, topicId: 1, taskType: 1 });

export type RoadmapTaskAttrs = InferSchemaType<typeof roadmapTaskSchema>;
export type RoadmapTaskDoc = HydratedDocument<RoadmapTaskAttrs>;

export const RoadmapTask = model('RoadmapTask', roadmapTaskSchema);

