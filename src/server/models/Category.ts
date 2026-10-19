import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  /** Seed/legacy identifier from the SPA dataset (e.g. 'cat_fashion'). Persisted so admin mutations sent by the SPA resolve against Mongo. */
  legacyId?: string;
  name: string;
  slug: string;
  iconName?: string;
  image?: string;
  itemCount: number;
  featured: boolean;
}

const CategorySchema = new Schema<ICategory>(
  {
    legacyId: { type: String, unique: true, sparse: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    iconName: { type: String },
    image: { type: String },
    itemCount: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    // Expose the SPA's seed identifier as `id` so the local store can match documents.
    id: true,
  }
);

// Mongoose reserves `id` as a read-only virtual (mapped to `_id` by default). When the
// document carries a seed `legacyId`, expose that instead so the SPA's `p.id === id`
// lookups (edit/delete flows) resolve against the value the backend will honor.
CategorySchema.virtual('id')
  .get(function (this: ICategory) {
    return this.legacyId || this._id?.toString();
  })
  .set(function (this: ICategory, value: string) {
    this.legacyId = value;
  });

export const Category = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
