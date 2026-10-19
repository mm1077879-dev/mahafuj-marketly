import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Brand } from '../models/Brand';
import { Banner } from '../models/Banner';
import { Media } from '../models/Media';
import {
  initialProducts,
  initialCategories,
  initialBrands,
  initialBanners,
  initialMediaAssets,
} from '../../services/mockData';

/**
 * Idempotent, non-destructive backfill of the SPA's seed identifiers onto documents
 * that were persisted before the `legacyId` field was introduced.
 *
 * The storefront/admin SPA addresses documents with its own human/seed identifiers
 * (e.g. product `'1'`, category `'cat_fashion'`). Those identifiers are NOT Mongo
 * ObjectIds, so without a persisted `legacyId` the API cannot resolve them and
 * admin mutations (PUT/DELETE) return 404 even though the document exists.
 *
 * This migration assigns `legacyId` by matching each mock/seed record against the
 * persisted document via its UNIQUE natural key (slug for categories/brands/banners,
 * slug+sku for products). It only fills documents whose `legacyId` is currently
 * missing, never overwrites an existing value, and never deletes or reseeds data.
 */
type SeedItem = { id?: string; slug?: string; sku?: string; name?: string; title?: string };

const backfillCollection = async (
  model: mongoose.Model<any>,
  seedItems: SeedItem[],
  matchKeys: string[],
  label: string
): Promise<number> => {
  let updated = 0;
  for (const seed of seedItems) {
    if (!seed.id) continue;

    const or: Record<string, unknown>[] = [];
    for (const key of matchKeys) {
      const value = (seed as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.length > 0) {
        or.push({ [key]: value });
      }
    }
    if (or.length === 0) continue;

    const query: Record<string, unknown> = {
      legacyId: { $in: [null, undefined] },
      ...(or.length === 1 ? or[0] : { $or: or }),
    };

    const result = await model.updateMany(query, { $set: { legacyId: seed.id } });
    updated += result.modifiedCount ?? 0;
  }
  if (updated > 0) {
    console.log(`🔗 Backfilled ${updated} ${label} legacyId value(s).`);
  }
  return updated;
};

export const backfillLegacyIds = async (): Promise<void> => {
  // Only run against a live MongoDB connection; the in-memory store already carries `id`.
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    await backfillCollection(Product, initialProducts, ['slug', 'sku'], 'product');
    await backfillCollection(Category, initialCategories, ['slug'], 'category');
    await backfillCollection(Brand, initialBrands, ['slug'], 'brand');
    await backfillCollection(Banner, initialBanners, ['title'], 'banner');
    await backfillCollection(Media, initialMediaAssets, ['name'], 'media');

    if (process.env.NODE_ENV !== 'production') {
      await ensureSeedCategories();
    }
  } catch (error: any) {
    console.warn(`LegacyId backfill notice: ${error.message}`);
  }
};

/**
 * Ensure every seed category referenced by the SPA exists in the database.
 * The original seed only ran when the products collection was empty, so a partially
 * seeded database (e.g. missing `fashion`/`beauty`) leaves the admin UI addressing
 * categories that do not exist → 404. This inserts ONLY genuinely missing categories
 * (matched by unique slug) and never deletes or overwrites existing data.
 */
const ensureSeedCategories = async (): Promise<void> => {
  let inserted = 0;
  for (const seed of initialCategories) {
    if (!seed.id || !seed.slug) continue;
    const existing = await Category.findOne({ slug: seed.slug });
    if (existing) {
      if (!existing.legacyId) {
        existing.legacyId = seed.id;
        await existing.save();
      }
      continue;
    }
    const { id, ...rest } = seed as SeedItem;
    await Category.create({ ...rest, legacyId: id });
    inserted += 1;
  }
  if (inserted > 0) {
    console.log(`🌱 Ensured ${inserted} missing seed category(ies) exist.`);
  }
};
