import mongoose from 'mongoose';

/**
 * Identifier resolution utilities.
 *
 * The storefront/admin SPA seeds its Redux store from `src/services/mockData.ts`,
 * where documents use human/seed identifiers (e.g. `'1'`, `'8'`, `'cat_fashion'`,
 * `'ord_1042'`). The MongoDB documents are stored with auto-generated ObjectIds and
 * do NOT retain those seed identifiers on the schema. As a result, the admin UI
 * sends seed-style identifiers to endpoints that historically only understood
 * ObjectIds, producing 404s (guarded paths) or 500 CastErrors (unguarded paths).
 *
 * These helpers build a Mongo query that resolves a document from EITHER a valid
 * ObjectId OR a custom/seed identifier carried in a unique field (slug, sku,
 * orderNumber, or an explicit `legacyId`/`id` field when present).
 */

export const isValidObjectId = (value: unknown): boolean =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);

/**
 * Build a `$or` query fragment for a given raw route identifier. Resolution order:
 *   1. Valid ObjectId → match `_id`.
 *   2. Seed/legacy identifiers carried by the SPA dataset (e.g. '1', 'cat_fashion') →
 *      match the persisted `legacyId` field on the schema.
 *   3. Unique string fields supplied by the caller (slug, sku, orderNumber, ...).
 * Always returns a non-empty query so callers never pass `null`/`undefined` into Mongo.
 */
export const buildIdentifierQuery = (
  rawId: string,
  fallbackFields: string[] = []
): Record<string, unknown> => {
  const id = String(rawId ?? '').trim();
  const or: Record<string, unknown>[] = [];

  if (isValidObjectId(id)) {
    or.push({ _id: id });
  }

  // Seed-style identifiers persist on documents as `legacyId`, so always probe it.
  or.push({ legacyId: id });
  or.push({ legacyId: new RegExp(`^${escapeRegExp(id)}$`, 'i') });

  // Always allow matching the same value against unique string fields. This covers
  // order numbers, slugs, SKUs and seed identifiers even when the id looks like an
  // ObjectId (defensive, harmless when the field is unique).
  for (const field of fallbackFields) {
    or.push({ [field]: id });
    // Case-insensitive match for slug/sku/orderNumber style identifiers.
    or.push({ [field]: new RegExp(`^${escapeRegExp(id)}$`, 'i') });
  }

  return or.length === 1 ? or[0] : { $or: or };
};

export const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
