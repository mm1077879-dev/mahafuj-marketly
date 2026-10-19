import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
  /** Seed/legacy identifier from the SPA dataset (e.g. 'med_1'). Persisted so admin mutations sent by the SPA resolve against Mongo. */
  legacyId?: string;
  name: string;
  url: string;
  publicId?: string;
  format: string;
  size: number;
  dimensions?: string;
  folder?: string;
  createdAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    legacyId: { type: String, unique: true, sparse: true, trim: true, index: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String },
    format: { type: String, default: 'JPG' },
    size: { type: Number, required: true },
    dimensions: { type: String },
    folder: { type: String, default: 'Storefront' },
  },
  {
    timestamps: true,
    // Expose the SPA's seed identifier as `id` so the local store can match documents.
    id: true,
  }
);

MediaSchema.virtual('id')
  .get(function (this: IMedia) {
    return this.legacyId || this._id?.toString();
  })
  .set(function (this: IMedia, value: string) {
    this.legacyId = value;
  });

export const Media = mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);
