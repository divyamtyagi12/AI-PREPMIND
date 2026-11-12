import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const REVISION_STATUSES = ['scheduled', 'due', 'completed'] as const;

const revisionScheduleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'LearningRoadmap', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },

    lastReviewedAt: { type: Date, required: true, default: Date.now },
    nextReviewAt: { type: Date, required: true, index: true },

    reviewIntervalDays: { type: Number, required: true, min: 1, default: 1 },
    successfulReviews: { type: Number, required: true, min: 0, default: 0 },

    status: { type: String, enum: REVISION_STATUSES, default: 'scheduled', index: true },
    performanceHistory: [
      {
        reviewedAt: { type: Date, required: true },
        isSuccessful: { type: Boolean, required: true },
        masteryAtReview: { type: Number },
      },
    ],
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

revisionScheduleSchema.index({ userId: 1, topicId: 1, roadmapId: 1 }, { unique: true });
revisionScheduleSchema.index({ userId: 1, nextReviewAt: 1, status: 1 });

export type RevisionScheduleAttrs = InferSchemaType<typeof revisionScheduleSchema>;
export type RevisionScheduleDoc = HydratedDocument<RevisionScheduleAttrs>;

export const RevisionSchedule = model('RevisionSchedule', revisionScheduleSchema);

