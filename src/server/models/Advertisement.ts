import mongoose, { Schema, Document } from 'mongoose';

export interface IAdvertisement extends Document {
  title: string;
  placement: 'below_hero' | 'between_collections' | 'before_footer';
  imageUrl: string;
  destinationUrl?: string;
  openInNewTab?: boolean;
  priority: number;
  startDate?: Date;
  endDate?: Date;
  active: boolean;
  provider?: 'custom_banner' | 'adsense';
  adSenseSlot?: string;
  adSenseClient?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdvertisementSchema = new Schema<IAdvertisement>(
  {
    title: { type: String, required: true, trim: true },
    placement: {
      type: String,
      enum: ['below_hero', 'between_collections', 'before_footer'],
      required: true,
      index: true,
    },
    imageUrl: { type: String, required: true },
    destinationUrl: { type: String, trim: true },
    openInNewTab: { type: Boolean, default: true },
    priority: { type: Number, default: 1, index: true },
    startDate: { type: Date },
    endDate: { type: Date },
    active: { type: Boolean, default: true, index: true },
    provider: {
      type: String,
      enum: ['custom_banner', 'adsense'],
      default: 'custom_banner',
    },
    adSenseSlot: { type: String },
    adSenseClient: { type: String },
  },
  { timestamps: true }
);

export const Advertisement =
  mongoose.models.Advertisement ||
  mongoose.model<IAdvertisement>('Advertisement', AdvertisementSchema);
