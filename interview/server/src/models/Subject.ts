import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const subjectSchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, default: '', maxlength: 500 },
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

subjectSchema.index({ categoryId: 1, slug: 1 }, { unique: true });

export type SubjectAttrs = InferSchemaType<typeof subjectSchema>;
export type SubjectDoc = HydratedDocument<SubjectAttrs>;

export const Subject = model('Subject', subjectSchema);

