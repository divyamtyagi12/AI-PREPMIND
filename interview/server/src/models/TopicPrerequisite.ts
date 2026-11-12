import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const DEPENDENCY_TYPES = ['mandatory', 'recommended'] as const;

const topicPrerequisiteSchema = new Schema(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
    prerequisiteTopicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
    dependencyType: { type: String, enum: DEPENDENCY_TYPES, default: 'mandatory' },
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

topicPrerequisiteSchema.index({ topicId: 1, prerequisiteTopicId: 1 }, { unique: true });

export type TopicPrerequisiteAttrs = InferSchemaType<typeof topicPrerequisiteSchema>;
export type TopicPrerequisiteDoc = HydratedDocument<TopicPrerequisiteAttrs>;

export const TopicPrerequisite = model('TopicPrerequisite', topicPrerequisiteSchema);

