import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ASSESSMENT_STATUSES, ASSESSMENT_TYPES } from '../utils/constants';

const difficultyDistributionSchema = new Schema(
  {
    Easy: { type: Number, required: true, min: 0, default: 0 },
    Medium: { type: Number, required: true, min: 0, default: 0 },
    Hard: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const scoringSchema = new Schema(
  {
    correct: { type: Number, required: true, default: 1 },
    incorrect: { type: Number, required: true, default: 0 },
    unanswered: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const topicAllocationSchema = new Schema(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    count: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const assessmentTemplateSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: '', maxlength: 2000 },
    type: { type: String, enum: ASSESSMENT_TYPES, required: true, index: true },

    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    subjectIds: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    topicIds: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
    topicAllocations: { type: [topicAllocationSchema], default: [] },

    durationMinutes: { type: Number, required: true, min: 1, max: 360 },
    totalQuestions: { type: Number, required: true, min: 1, max: 200 },

    difficultyDistribution: { type: difficultyDistributionSchema, required: true },
    scoring: { type: scoringSchema, required: true },

    maxAttempts: { type: Number, default: null },
    cooldownHours: { type: Number, default: 0, min: 0 },

    shuffleQuestions: { type: Boolean, default: true },
    shuffleOptions: { type: Boolean, default: false },

    reviewReleasePolicy: { type: String, default: 'immediate', trim: true },

    status: { type: String, enum: ASSESSMENT_STATUSES, default: 'Draft', index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
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

assessmentTemplateSchema.index({ status: 1, type: 1 });

export type AssessmentTemplateAttrs = InferSchemaType<typeof assessmentTemplateSchema>;
export type AssessmentTemplateDoc = HydratedDocument<AssessmentTemplateAttrs>;

export const AssessmentTemplate = model('AssessmentTemplate', assessmentTemplateSchema);

