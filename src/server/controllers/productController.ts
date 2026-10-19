import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { AuditLog } from '../models/AuditLog';
import { isDbConnected } from '../config/db';
import { memoryStore } from '../config/memoryStore';
import { buildIdentifierQuery, escapeRegExp, isValidObjectId } from '../utils/resolveIdentifier';
import { Product as ProductType } from '../../types';
import {
  matchesCrossLingualSearch,
  expandCrossLingualTokenGroups,
  normalizeQuery,
  rankProductsWithCrossLingual,
} from '../../services/crossLingualSearch';

const productUpdateFields = [
  'name',
  'slug',
  'sku',
  'shortDescription',
  'description',
  'category',
  'subcategory',
  'brand',
  'price',
  'compareAtPrice',
  'discountPercent',
  'mainImage',
  'galleryImages',
  'variants',
  'inventory',
  'tags',
  'isFeatured',
  'isBestSeller',
  'isFlashDeal',
  'specifications',
  'materials',
  'careInstructions',
  'shippingInfo',
  'returnPolicy',
] as const;

const handleProductMutationError = (error: unknown, res: Response): void => {
  if (typeof error === 'object' && error !== null) {
    if ('code' in error && error.code === 11000) {
      res.status(409).json({ success: false, message: 'A product with that SKU, slug, or identifier already exists.' });
      return;
    }
    if ('name' in error && (error.name === 'ValidationError' || error.name === 'CastError')) {
      res.status(400).json({ success: false, message: 'The product data is invalid.' });
      return;
    }
  }
  console.error('[Product API]', error);
  res.status(500).json({ success: false, message: 'An unexpected error occurred while processing the product.' });
};

const resolveCategoryName = async (value: unknown): Promise<string | null> => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const identifier = value.trim();
  if (isDbConnected()) {
    const caseInsensitiveIdentifier = new RegExp(`^${escapeRegExp(identifier)}$`, 'i');
    const candidates: Record<string, unknown>[] = [
      { name: caseInsensitiveIdentifier },
      { slug: caseInsensitiveIdentifier },
      { legacyId: caseInsensitiveIdentifier },
    ];
    if (isValidObjectId(identifier)) candidates.push({ _id: identifier });
    const category = await Category.findOne({ $or: candidates });
    return category?.name ?? null;
  }
  const category = memoryStore.categories.find(
    (item) =>
      item.name.toLowerCase() === identifier.toLowerCase() ||
      item.slug.toLowerCase() === identifier.toLowerCase() ||
      item.id === identifier
  );
  return category?.name ?? null;
};

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, brand, search, minPrice, maxPrice, sortBy, sale, deals, bestseller, limit = 50, page = 1 } = req.query;

    if (isDbConnected()) {
      const query: any = {};
      const disjunctions: Record<string, unknown>[] = [];
      if (category) query.category = new RegExp(`^${category}$`, 'i');
      if (brand) query.brand = new RegExp(`^${brand}$`, 'i');
      if (search) {
        const term = String(search).trim();
        const tokenGroups = expandCrossLingualTokenGroups(term);
        const translatedFields = ['name', 'brand', 'subcategory', 'tags', 'sku'];
        const directFields = [
          ...translatedFields,
          'description',
          'shortDescription',
          'category',
        ];
        const translatedMatches = tokenGroups.map((group) => ({
          $or: group.flatMap((token) => {
            const pattern = escapeRegExp(token);
            return translatedFields.map((field) => ({
              [field]: { $regex: pattern, $options: 'i' },
            }));
          }),
        }));
        const directPattern = escapeRegExp(normalizeQuery(term));
        const searchClause = {
          $or: [
            { $and: translatedMatches },
            {
              $or: directFields.map((field) => ({
                [field]: { $regex: directPattern, $options: 'i' },
              })),
            },
          ],
        };
        disjunctions.push(searchClause);
      }
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }
      if (sale === 'true') query.discountPercent = { $gt: 0 };
      if (deals === 'true') {
        disjunctions.push({ $or: [{ isFlashDeal: true }, { discountPercent: { $gt: 0 } }] });
      }
      if (disjunctions.length === 1) Object.assign(query, disjunctions[0]);
      else if (disjunctions.length > 1) query.$and = disjunctions;
      if (bestseller === 'true') query.isBestSeller = true;

      let sort: any = { createdAt: -1 };
      if (sortBy === 'price-low') sort = { price: 1 };
      else if (sortBy === 'price-high') sort = { price: -1 };
      else if (sortBy === 'rating') sort = { rating: -1 };
      else if (sortBy === 'featured') sort = { isFeatured: -1, createdAt: -1 };

      const items = await Product.find(query)
        .sort(sort)
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));
      const total = await Product.countDocuments(query);

      res.json({
        success: true,
        data: items,
        meta: { total: total || items.length, page: Number(page), limit: Number(limit) },
      });
      return;
    }

    // In-memory fallback
    let items = [...memoryStore.products];

    if (category) {
      const catLower = String(category).toLowerCase();
      items = items.filter((p) => p.category.toLowerCase() === catLower);
    }
    if (brand) {
      const brandLower = String(brand).toLowerCase();
      items = items.filter((p) => p.brand.toLowerCase() === brandLower);
    }
    if (search) {
      const term = String(search).trim();
      items = items.filter((p) => matchesCrossLingualSearch(p, term));
    }
    if (minPrice) items = items.filter((p) => p.price >= Number(minPrice));
    if (maxPrice) items = items.filter((p) => p.price <= Number(maxPrice));
    if (sale === 'true') items = items.filter((p) => p.discountPercent && p.discountPercent > 0);
    if (deals === 'true') items = items.filter((p) => p.isFlashDeal || (p.discountPercent && p.discountPercent > 0));
    if (bestseller === 'true') items = items.filter((p) => p.isBestSeller);

    if (search && (!sortBy || sortBy === 'featured')) {
      items = rankProductsWithCrossLingual(items, String(search));
    } else if (sortBy === 'price-low') {
      items.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      items.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      items.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'featured') {
      items.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }

    const total = items.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = items.slice(startIndex, startIndex + Number(limit));

    res.json({
      success: true,
      data: paginated,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    if (isDbConnected()) {
      const product = await Product.findOne(buildIdentifierQuery(slug, ['slug', 'sku']));
      if (product) {
        res.json({ success: true, data: product });
        return;
      }
    }

    const memoryProduct = memoryStore.products.find(
      (p) => p.slug === slug || p.id === slug || p.sku.toUpperCase() === slug.toUpperCase()
    );

    if (!memoryProduct) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.json({ success: true, data: memoryProduct });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Fetch a single product by any canonical identifier the SPA may hold:
 * Mongo ObjectId, seed/legacy id (e.g. '1'), slug, or SKU.
 * Returns 404 for genuinely unknown identifiers and never a 500 CastError.
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const product = await Product.findOne(buildIdentifierQuery(id, ['slug', 'sku', 'legacyId']));
      if (product) {
        res.json({ success: true, data: product });
        return;
      }
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const memoryProduct = memoryStore.products.find(
      (p) => p.id === id || p.slug === id || p.sku?.toUpperCase() === String(id).toUpperCase()
    );
    if (!memoryProduct) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.json({ success: true, data: memoryProduct });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getRelatedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const current = await Product.findOne(buildIdentifierQuery(id, ['slug', 'sku']));
      if (current) {
        const related = await Product.find({
          _id: { $ne: current._id },
          $or: [{ category: current.category }, { brand: current.brand }],
        }).limit(4);
        res.json({ success: true, data: related });
        return;
      }
    }

    const current = memoryStore.products.find((p) => p.id === id || p.slug === id);
    const related = memoryStore.products
      .filter((p) => p.id !== id && (current ? p.category === current.category || p.brand === current.brand : true))
      .slice(0, 4);

    res.json({ success: true, data: related });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const data = req.body;
    if (
      typeof data?.name !== 'string' ||
      !data.name.trim() ||
      data.price === undefined ||
      !Number.isFinite(Number(data.price)) ||
      Number(data.price) < 0 ||
      typeof data.category !== 'string'
    ) {
      res.status(400).json({ success: false, message: 'Name, price, and category are required.' });
      return;
    }

    const categoryName = await resolveCategoryName(data.category);
    if (!categoryName) {
      res.status(400).json({ success: false, message: 'A valid product category is required.' });
      return;
    }

    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const sku = data.sku || 'MKT-' + Math.floor(1000 + Math.random() * 9000);

    if (isDbConnected()) {
      const { id, _id, legacyId, ...productFields } = data;
      const product = await Product.create({
        ...productFields,
        slug,
        sku,
        category: categoryName,
        // The SPA addresses documents by its own seed-style `id`; persist it as legacyId.
        legacyId: typeof id === 'string' ? id : typeof legacyId === 'string' ? legacyId : undefined,
        inventory: Number(data.inventory) || 0,
        price: Number(data.price),
        compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : undefined,
      });

      await AuditLog.create({
        actor: req.user?.name || 'Admin',
        action: 'Product Created',
        resource: product.name,
        details: `SKU: ${product.sku}, Stock: ${product.inventory}, Price: $${product.price}`,
      });

      res.status(201).json({ success: true, data: product });
      return;
    }

    const newProd: ProductType = {
      ...data,
      id: 'prod_' + Date.now(),
      slug,
      sku,
      category: categoryName,
      inventory: Number(data.inventory) || 0,
      price: Number(data.price),
      compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : undefined,
      rating: 5.0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };

    memoryStore.products.unshift(newProd);
    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Product Created',
      newProd.name,
      `SKU: ${newProd.sku}, Stock: ${newProd.inventory}, Price: $${newProd.price}`
    );

    res.status(201).json({ success: true, data: newProd });
  } catch (error: unknown) {
    handleProductMutationError(error, res);
  }
};

export const updateProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const updates: Record<string, unknown> = {};
    for (const field of productUpdateFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: 'No valid product fields provided for update.' });
      return;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'category')) {
      const categoryName = await resolveCategoryName(updates.category);
      if (!categoryName) {
        res.status(400).json({ success: false, message: 'A valid product category is required.' });
        return;
      }
      updates.category = categoryName;
    }

    if (isDbConnected()) {
      const product = await Product.findOneAndUpdate(
        buildIdentifierQuery(id, ['slug', 'sku', 'legacyId']),
        updates,
        { new: true, runValidators: true }
      );
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }
      await AuditLog.create({
        actor: req.user?.name || 'Admin',
        action: 'Product Updated',
        resource: product.name,
        details: `Stock: ${product.inventory}, Price: $${product.price}`,
      });
      res.json({ success: true, data: product });
      return;
    }

    const index = memoryStore.products.findIndex(
      (p) => p.id === id || p.slug === id || p.sku.toUpperCase() === String(id).toUpperCase()
    );
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    memoryStore.products[index] = {
      ...memoryStore.products[index],
      ...updates,
    };

    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Product Updated',
      memoryStore.products[index].name,
      `Stock: ${memoryStore.products[index].inventory}, Price: $${memoryStore.products[index].price}`
    );

    res.json({ success: true, data: memoryStore.products[index] });
  } catch (error: unknown) {
    handleProductMutationError(error, res);
  }
};

export const deleteProduct = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const product = await Product.findOneAndDelete(buildIdentifierQuery(id, ['slug', 'sku', 'legacyId']));
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }
      await AuditLog.create({
        actor: req.user?.name || 'Admin',
        action: 'Product Archived/Deleted',
        resource: product.name,
        details: `Removed product ID ${id}`,
      });
      res.json({ success: true, message: 'Product removed successfully' });
      return;
    }

    const index = memoryStore.products.findIndex(
      (p) => p.id === id || p.slug === id || p.sku.toUpperCase() === String(id).toUpperCase()
    );
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    const removed = memoryStore.products.splice(index, 1)[0];
    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Product Archived/Deleted',
      removed.name,
      `Removed product ID ${id}`
    );

    res.json({ success: true, message: 'Product removed successfully' });
  } catch (error: unknown) {
    handleProductMutationError(error, res);
  }
};
