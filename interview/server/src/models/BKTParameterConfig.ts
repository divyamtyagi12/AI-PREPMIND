import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { DEFAULT_BKT_PARAMETERS } from './KnowledgeState';

const bktParameterConfigSchema = new Schema(
  {
    version: { type: String, required: true, unique: true, trim: true },

    initialMastery: {
      type: Number,
      required: true,
      min: 0.01,
      max: 0.99,
      default: DEFAULT_BKT_PARAMETERS.initialMastery,
    },
    slip: {
      type: Number,
      required: true,
      min: 0.0,
      max: 0.49,
      default: DEFAULT_BKT_PARAMETERS.slip,
    },
    guess: {
      type: Number,
      required: true,
      min: 0.0,
      max: 0.49,
      default: DEFAULT_BKT_PARAMETERS.guess,
    },
    learning: {
      type: Number,
      required: true,
      min: 0.01,
      max: 0.99,
      default: DEFAULT_BKT_PARAMETERS.learning,
    },

    // Difficulty recommendation cutoffs
    difficultyThresholds: {
      easyMax: { type: Number, required: true, default: 0.4 },
      mediumMax: { type: Number, required: true, default: 0.7 },
    },

    isActive: { type: Boolean, default: true },
    description: { type: String, default: 'Standard initial placement preparation BKT model' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
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

export type BKTParameterConfigAttrs = InferSchemaType<typeof bktParameterConfigSchema>;
export type BKTParameterConfigDoc = HydratedDocument<BKTParameterConfigAttrs>;

export const BKTParameterConfig = model('BKTParameterConfig', bktParameterConfigSchema);

