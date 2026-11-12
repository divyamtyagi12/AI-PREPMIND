import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Standard default parameters for Bayesian Knowledge Tracing (BKT).
 * Prior: P(L_0) - initial probability of topic mastery before observations
 * Slip: P(S) - probability of answering incorrectly despite mastery
 * Guess: P(G) - probability of answering correctly by guessing without mastery
 * Learning: P(T) - probability of transitioning from non-mastery to mastery after an opportunity
 */
export const DEFAULT_BKT_PARAMETERS = {
  initialMastery: 0.20,
  slip: 0.10,
  guess: 0.20,
  learning: 0.15,
  version: 'bkt-v1',
} as const;

export type BKTParameters = {
  initialMastery: number;
  slip: number;
  guess: number;
  learning: number;
  version?: string;
};

const knowledgeStateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },

    // Latent posterior probability of topic mastery: P(L_t) in [0, 1]
    masteryProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: DEFAULT_BKT_PARAMETERS.initialMastery,
    },

    // Initial baseline prior: P(L_0)
    initialMasteryProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: DEFAULT_BKT_PARAMETERS.initialMastery,
    },
    priorProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: DEFAULT_BKT_PARAMETERS.initialMastery,
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

    // Timestamp of the latest processed learning observation
    lastObservationAt: { type: Date, default: null },

    // Whether this state received calibration from diagnostic assessment
    initializedFromDiagnostic: { type: Boolean, default: false },

    // Configuration version of BKT parameters used
    parameterVersion: { type: String, required: true, default: DEFAULT_BKT_PARAMETERS.version },

    // Unique event or attempt identifiers processed to prevent double-counting
    processedEventIds: { type: [String], default: [] },

    // Source assessment that established or last calibrated this state
    sourceAssessmentId: { type: Schema.Types.ObjectId, ref: 'AssessmentResult' },

    // Optimistic concurrency sequence number
    stateVersion: { type: Number, default: 1 },

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
knowledgeStateSchema.index({ userId: 1, masteryProbability: 1 });

export type KnowledgeStateAttrs = InferSchemaType<typeof knowledgeStateSchema>;
export type KnowledgeStateDoc = HydratedDocument<KnowledgeStateAttrs>;

export const KnowledgeState = model('KnowledgeState', knowledgeStateSchema);
