import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const TUTOR_CONTEXT_TYPES = ['general', 'topic', 'practice', 'assessment_review', 'roadmap'] as const;
export const CONVERSATION_STATUSES = ['active', 'archived'] as const;

const tutorConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150, default: 'New Conversation' },

    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },
    contextType: { type: String, enum: TUTOR_CONTEXT_TYPES, default: 'general', index: true },
    contextReferenceId: { type: Schema.Types.ObjectId, default: null },

    status: { type: String, enum: CONVERSATION_STATUSES, default: 'active', index: true },
    messageCount: { type: Number, default: 0, min: 0 },
    lastMessageAt: { type: Date, default: Date.now, index: true },
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
tutorConversationSchema.index({ userId: 1, status: 1, lastMessageAt: -1 });

export type TutorConversationAttrs = InferSchemaType<typeof tutorConversationSchema>;
export type TutorConversationDoc = HydratedDocument<TutorConversationAttrs>;

export const TutorConversation = model('TutorConversation', tutorConversationSchema);

