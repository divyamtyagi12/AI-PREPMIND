import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const PREPARATION_GOALS = [
  'General Campus Placements',
  'Software Development Engineer',
  'Backend Developer',
  'Frontend Developer',
  'Full-Stack Developer',
  'Data Analyst',
  'Custom Preparation Goal',
] as const;

export const STUDY_PREFERENCES = ['balanced', 'dsa', 'core_cs', 'aptitude'] as const;
export const ROADMAP_STATUSES = ['active', 'completed', 'paused', 'archived'] as const;

const weeklyAvailabilitySchema = new Schema(
  {
    monday: { type: Number, required: true, min: 0, max: 720, default: 60 },
    tuesday: { type: Number, required: true, min: 0, max: 720, default: 60 },
    wednesday: { type: Number, required: true, min: 0, max: 720, default: 60 },
    thursday: { type: Number, required: true, min: 0, max: 720, default: 60 },
    friday: { type: Number, required: true, min: 0, max: 720, default: 60 },
    saturday: { type: Number, required: true, min: 0, max: 720, default: 120 },
    sunday: { type: Number, required: true, min: 0, max: 720, default: 120 },
  },
  { _id: false },
);

const learningRoadmapSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    preparationGoal: { type: String, enum: PREPARATION_GOALS, required: true },
    targetDate: { type: Date, required: true, index: true },
    studyPreference: { type: String, enum: STUDY_PREFERENCES, default: 'balanced' },

    dailyStudyMinutes: { type: Number, required: true, min: 15, max: 720, default: 60 },
    weeklyAvailability: { type: weeklyAvailabilitySchema, required: true },

    status: { type: String, enum: ROADMAP_STATUSES, default: 'active', index: true },
    generationVersion: { type: String, default: 'v1' },
    isProvisional: { type: Boolean, default: false },

    totalEstimatedMinutes: { type: Number, required: true, default: 0, min: 0 },
    completedMinutes: { type: Number, required: true, default: 0, min: 0 },
    progressPercentage: { type: Number, required: true, default: 0, min: 0, max: 100 },

    timezone: { type: String, default: 'UTC', trim: true },
    planningHorizonDays: { type: Number, default: 60, min: 7, max: 365 },

    activeTopicIds: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
    excludedTopicIds: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],

    lastReplannedAt: { type: Date, default: null },
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
learningRoadmapSchema.index({ userId: 1, status: 1 });

export type LearningRoadmapAttrs = InferSchemaType<typeof learningRoadmapSchema>;
export type LearningRoadmapDoc = HydratedDocument<LearningRoadmapAttrs>;

export const LearningRoadmap = model('LearningRoadmap', learningRoadmapSchema);
