import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DIFFICULTY_LEVELS } from '../utils/constants';

const topicSchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    parentTopicId: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, default: '', maxlength: 1000 },
    difficulty: { type: String, enum: DIFFICULTY_LEVELS, default: 'Medium' },
    estimatedLearningTime: { type: String, trim: true, default: '1 hour', maxlength: 50 },
    prerequisites: { type: [String], default: [] },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
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

topicSchema.index({ subjectId: 1, slug: 1 }, { unique: true });

export type TopicAttrs = InferSchemaType<typeof topicSchema>;
export type TopicDoc = HydratedDocument<TopicAttrs>;

export const Topic = model('Topic', topicSchema);

