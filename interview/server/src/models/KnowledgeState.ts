import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Standard default parameters for Bayesian Knowledge Tracing (BKT).
 * Prior: P(L_0) - initial probability of topic mastery before observations
 * Slip: P(S) - probability of answering incorrectly despite mastery
 * Guess: P(G) - probability of answering correctly by guessing without mastery
 * Learning: P(T) - probability of transitioning from non-mastery to mastery after an opportunity
 */
export const DEFAULT_BKT_PARAMETERS = {
  prior: 0.20,
  slip: 0.10,
  guess: 0.20,
  learning: 0.15,
} as const;

const knowledgeStateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },

    // Latent posterior probability of topic mastery: P(L_t)
    masteryProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: DEFAULT_BKT_PARAMETERS.prior,
    },

    // Population or diagnostic prior baseline: P(L_0)
    priorProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: DEFAULT_BKT_PARAMETERS.prior,
    },

    // BKT operational parameters
    slipProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: DEFAULT_BKT_PARAMETERS.slip,
    },
    guessProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: DEFAULT_BKT_PARAMETERS.guess,
    },
    learningProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: DEFAULT_BKT_PARAMETERS.learning,
    },

    // Total practice or diagnostic events incorporated into this mastery estimate
    observationsProcessed: { type: Number, required: true, min: 0, default: 0 },

    // Unique event or attempt identifiers processed to prevent double-counting
    processedEventIds: { type: [String], default: [] },

    // Source assessment that established or last calibrated this state
    sourceAssessmentId: { type: Schema.Types.ObjectId, ref: 'AssessmentResult' },

    lastUpdatedAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        ret.userId = String(ret.userId);
        ret.topicId = String(ret.topicId);
        if (ret.sourceAssessmentId) {
          ret.sourceAssessmentId = String(ret.sourceAssessmentId);
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// One knowledge state per student per topic
knowledgeStateSchema.index({ userId: 1, topicId: 1 }, { unique: true });

export type KnowledgeStateAttrs = InferSchemaType<typeof knowledgeStateSchema>;
export type KnowledgeStateDoc = HydratedDocument<KnowledgeStateAttrs>;

export const KnowledgeState = model('KnowledgeState', knowledgeStateSchema);

