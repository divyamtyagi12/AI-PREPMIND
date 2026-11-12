import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const TUTOR_ROLES = ['user', 'model', 'system'] as const;
export const TUTOR_MODES = ['explain', 'hint', 'guided', 'solution', 'quiz', 'review'] as const;

const tutorMessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'TutorConversation', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: TUTOR_ROLES, required: true },
    content: { type: String, required: true, maxlength: 20000 },
    mode: { type: String, enum: TUTOR_MODES, default: 'explain' },
    hintLevel: { type: Number, min: 1, max: 4, default: null },

    // Metadata & AI Telemetry
    modelUsed: { type: String, default: null },
    tokenUsage: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    latencyMs: { type: Number, default: 0 },

    // Optional structured payloads for Quiz or Code snippets
    structuredData: {
      type: Schema.Types.Mixed,
      default: null,
    },
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

tutorMessageSchema.index({ conversationId: 1, createdAt: 1 });
tutorMessageSchema.index({ userId: 1, createdAt: -1 });

export type TutorMessageAttrs = InferSchemaType<typeof tutorMessageSchema>;
export type TutorMessageDoc = HydratedDocument<TutorMessageAttrs>;

export const TutorMessage = model('TutorMessage', tutorMessageSchema);

