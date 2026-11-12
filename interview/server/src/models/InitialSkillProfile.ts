import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { SKILL_BASELINE_LEVELS } from '../utils/constants';

const initialSkillProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
    topicName: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryName: { type: String, required: true },
    sourceAssessmentId: { type: Schema.Types.ObjectId, ref: 'AssessmentResult', required: true },

    totalQuestionsAssessed: { type: Number, required: true, min: 0, default: 0 },
    questionsAttempted: { type: Number, required: true, min: 0, default: 0 },
    correctAnswers: { type: Number, required: true, min: 0, default: 0 },
    accuracy: { type: Number, required: true, min: 0, max: 100, default: 0 },
    baselineLevel: {
      type: String,
      enum: SKILL_BASELINE_LEVELS,
      required: true,
      default: 'Insufficient Data',
    },
    lastAssessedAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        ret.userId = String(ret.userId);
        ret.topicId = String(ret.topicId);
        ret.subjectId = String(ret.subjectId);
        ret.categoryId = String(ret.categoryId);
        ret.sourceAssessmentId = String(ret.sourceAssessmentId);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

initialSkillProfileSchema.index({ userId: 1, topicId: 1 }, { unique: true });

export type InitialSkillProfileAttrs = InferSchemaType<typeof initialSkillProfileSchema>;
export type InitialSkillProfileDoc = HydratedDocument<InitialSkillProfileAttrs>;

export const InitialSkillProfile = model('InitialSkillProfile', initialSkillProfileSchema);

