import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  /** Seed/legacy identifier from the SPA dataset (e.g. 'ban_hero'). Persisted so admin mutations sent by the SPA resolve against Mongo. */
  legacyId?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  bgColor?: string;
  textColor?: string;
  active: boolean;
  position: 'hero' | 'flash_deal' | 'promotional_dual_left' | 'promotional_dual_right' | 'announcement';
}

const BannerSchema = new Schema<IBanner>(
  {
    legacyId: { type: String, unique: true, sparse: true, trim: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    badge: { type: String },
    ctaText: { type: String, required: true },
    ctaLink: { type: String, required: true },
    image: { type: String, required: true },
    bgColor: { type: String },
    textColor: { type: String },
    active: { type: Boolean, default: true, index: true },
    position: {
      type: String,
      enum: ['hero', 'flash_deal', 'promotional_dual_left', 'promotional_dual_right', 'announcement'],
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    // Expose the SPA's seed identifier as `id` so the local store can match documents.
    id: true,
  }
);

BannerSchema.virtual('id')
  .get(function (this: IBanner) {
    return this.legacyId || this._id?.toString();
  })
  .set(function (this: IBanner, value: string) {
    this.legacyId = value;
  });

export const Banner = mongoose.models.Banner || mongoose.model<IBanner>('Banner', BannerSchema);
