import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Brand } from '../models/Brand';
import { isDbConnected } from '../config/db';
import { memoryStore } from '../config/memoryStore';
import { buildIdentifierQuery, escapeRegExp } from '../utils/resolveIdentifier';
import { Category as CategoryType } from '../../types';

const handleCategoryError = (error: unknown, res: Response): void => {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    res.status(409).json({ success: false, message: 'A category with that name or slug already exists.' });
    return;
  }
  console.error('[Category API]', error);
  res.status(500).json({ success: false, message: 'An unexpected error occurred while processing the category.' });
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isDbConnected()) {
      const categories = await Category.find().sort({ itemCount: -1 });
      res.json({ success: true, data: categories });
      return;
    }
    res.json({ success: true, data: memoryStore.categories });
  } catch (error: unknown) {
    handleCategoryError(error, res);
  }
};

/**
 * Fetch a single category by any canonical identifier the SPA may hold:
 * Mongo ObjectId, seed/legacy id (e.g. 'cat_fashion'), or slug.
 * Returns 404 for genuinely unknown identifiers and never a 500 CastError.
 */
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const category = await Category.findOne(buildIdentifierQuery(id, ['slug', 'legacyId']));
      if (category) {
        res.json({ success: true, data: category });
        return;
      }
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const memoryCategory = memoryStore.categories.find((c) => c.id === id || c.slug === id);
    if (!memoryCategory) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    res.json({ success: true, data: memoryCategory });
  } catch (error: unknown) {
    handleCategoryError(error, res);
  }
};

export const createCategory = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, image, iconName } = req.body;
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'Category name is required' });
      return;
    }
    const normalizedName = name.trim();
    const slug = normalizedName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    if (isDbConnected()) {
      const category = await Category.create({
        name: normalizedName,
        slug,
        image,
        iconName: iconName || 'Shirt',
        // The SPA addresses documents by its own seed-style `id`; persist it as legacyId.
        legacyId: req.body?.id || req.body?.legacyId,
        itemCount: 0,
        featured: true,
      });
      res.status(201).json({ success: true, data: category });
      return;
    }

    if (memoryStore.categories.some((category) => category.slug.toLowerCase() === slug)) {
      res.status(409).json({ success: false, message: 'A category with that name or slug already exists.' });
      return;
    }
    const newCat: CategoryType = {
      id: 'cat_' + Date.now(),
      name,
      slug,
      image,
      iconName: iconName || 'Shirt',
      itemCount: 0,
      featured: true,
    };
    memoryStore.categories.push(newCat);
    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Category Created',
      newCat.name,
      `Created category ${newCat.name}`
    );

    res.status(201).json({ success: true, data: newCat });
  } catch (error: unknown) {
    handleCategoryError(error, res);
  }
};

export const deleteCategory = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const category = await Category.findOne(buildIdentifierQuery(id, ['slug', 'legacyId']));
      if (!category) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }
      const linkedProducts = await Product.exists({
        category: new RegExp(`^${escapeRegExp(category.name)}$`, 'i'),
      });
      if (linkedProducts) {
        res.status(409).json({
          success: false,
          message: 'This category is assigned to products and cannot be deleted.',
        });
        return;
      }
      await Category.deleteOne({ _id: category._id });
      res.json({ success: true, message: 'Category deleted', data: category });
      return;
    }

    const idx = memoryStore.categories.findIndex((c) => c.id === id || c.slug === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    const categoryToRemove = memoryStore.categories[idx];
    if (memoryStore.products.some((product) => product.category.toLowerCase() === categoryToRemove.name.toLowerCase())) {
      res.status(409).json({
        success: false,
        message: 'This category is assigned to products and cannot be deleted.',
      });
      return;
    }
    const removed = memoryStore.categories.splice(idx, 1)[0];
    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Category Deleted',
      removed.name,
      `Removed category ${removed.name}`
    );
    res.json({ success: true, message: 'Category deleted', data: removed });
  } catch (error: unknown) {
    handleCategoryError(error, res);
  }
};

/**
 * Update an existing category by any canonical identifier (ObjectId, seed/legacy id,
 * or slug). Only allowlisted fields are written to prevent unintended document changes.
 */
export const updateCategory = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Safe field allowlist — never spread the raw body into the document.
    const updates: Record<string, unknown> = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim();
    if (typeof req.body?.image === 'string') updates.image = req.body.image;
    if (typeof req.body?.iconName === 'string') updates.iconName = req.body.iconName;
    if (typeof req.body?.featured === 'boolean') updates.featured = req.body.featured;
    if (typeof req.body?.slug === 'string' && req.body.slug.length > 0) {
      updates.slug = req.body.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    } else if (typeof req.body?.name === 'string') {
      updates.slug = req.body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields provided for update' });
      return;
    }

    if (isDbConnected()) {
      const session = await mongoose.startSession();
      const savedCategory = { id: '' };
      try {
        await session.withTransaction(async () => {
          const current = await Category.findOne(buildIdentifierQuery(id, ['slug', 'legacyId'])).session(session);
          if (!current) return;

          const category = await Category.findOneAndUpdate(
            { _id: current._id },
            updates,
            { new: true, runValidators: true, session }
          );
          if (category) savedCategory.id = category._id.toString();
          if (category && typeof updates.name === 'string' && updates.name !== current.name) {
            await Product.updateMany(
              { category: new RegExp(`^${escapeRegExp(current.name)}$`, 'i') },
              { $set: { category: updates.name } },
              { session }
            );
          }
        });
      } finally {
        await session.endSession();
      }
      if (!savedCategory.id) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }
      const category = await Category.findById(savedCategory.id);
      if (!category) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }
      memoryStore.logAudit(
        req.user?.name || 'Admin',
        'Category Updated',
        category.name,
        `Updated category ${category.name}`
      );
      res.json({ success: true, data: category });
      return;
    }

    const idx = memoryStore.categories.findIndex((c) => c.id === id || c.slug === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    const current = memoryStore.categories[idx];
    const nextSlug = typeof updates.slug === 'string' ? updates.slug : current.slug;
    if (memoryStore.categories.some(
      (category, categoryIndex) => categoryIndex !== idx && category.slug.toLowerCase() === nextSlug.toLowerCase()
    )) {
      res.status(409).json({ success: false, message: 'A category with that name or slug already exists.' });
      return;
    }
    const updated = { ...current, ...updates };
    if (updated.name !== current.name) {
      memoryStore.products.forEach((product) => {
        if (product.category.toLowerCase() === current.name.toLowerCase()) {
          product.category = updated.name;
        }
      });
    }
    memoryStore.categories[idx] = updated;
    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Category Updated',
      memoryStore.categories[idx].name,
      `Updated category ${memoryStore.categories[idx].name}`
    );
    res.json({ success: true, data: memoryStore.categories[idx] });
  } catch (error: unknown) {
    handleCategoryError(error, res);
  }
};

export const getBrands = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isDbConnected()) {
      let brands = await Brand.find().sort({ name: 1 });
      if (brands.length === 0) brands = memoryStore.brands as any;
      res.json({ success: true, data: brands });
      return;
    }
    res.json({ success: true, data: memoryStore.brands });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBrand = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, logo, description } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'Brand name is required' });
      return;
    }

    const normalizedName = name.trim();
    const slug = normalizedName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

    if (isDbConnected()) {
      const duplicateQuery: Record<string, unknown>[] = [
        { name: new RegExp(`^${escapeRegExp(normalizedName)}$`, 'i') },
        { slug: new RegExp(`^${escapeRegExp(slug)}$`, 'i') },
      ];
      const legacyId = req.body?.id || req.body?.legacyId;
      if (typeof legacyId === 'string' && legacyId.trim()) {
        duplicateQuery.push({ legacyId: new RegExp(`^${escapeRegExp(legacyId.trim())}$`, 'i') });
      }
      const duplicate = await Brand.findOne({ $or: duplicateQuery });

      if (duplicate) {
        res.status(409).json({ success: false, message: 'A brand with that name or slug already exists.' });
        return;
      }

      const brand = await Brand.create({
        name: normalizedName,
        slug,
        logo: typeof logo === 'string' ? logo : undefined,
        description: typeof description === 'string' ? description : undefined,
        ...(typeof (req.body?.id || req.body?.legacyId) === 'string' && (req.body?.id || req.body?.legacyId).trim()
          ? { legacyId: (req.body?.id || req.body?.legacyId).trim() }
          : {}),
      });

      res.status(201).json({ success: true, data: brand });
      return;
    }

    if (memoryStore.brands.some((brand) => brand.name.toLowerCase() === normalizedName.toLowerCase() || brand.slug.toLowerCase() === slug.toLowerCase())) {
      res.status(409).json({ success: false, message: 'A brand with that name or slug already exists.' });
      return;
    }

    const newBrand = {
      id: `brand_${Date.now()}`,
      name: normalizedName,
      slug,
      logo: typeof logo === 'string' ? logo : undefined,
      description: typeof description === 'string' ? description : undefined,
    };

    memoryStore.brands.push(newBrand);
    memoryStore.logAudit(req.user?.name || 'Admin', 'Brand Created', newBrand.name, `Created brand ${newBrand.name}`);
    res.status(201).json({ success: true, data: newBrand });
  } catch (error: unknown) {
    handleCategoryError(error, res);
  }
};

export const updateBrand = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    if (typeof req.body?.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim();
    if (typeof req.body?.slug === 'string' && req.body.slug.trim()) {
      updates.slug = req.body.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    } else if (typeof req.body?.name === 'string' && req.body.name.trim()) {
      updates.slug = req.body.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    }
    if (typeof req.body?.logo === 'string') updates.logo = req.body.logo;
    if (typeof req.body?.description === 'string') updates.description = req.body.description;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields provided for update' });
      return;
    }

    if (isDbConnected()) {
      const current = await Brand.findOne(buildIdentifierQuery(id, ['slug', 'legacyId']));
      if (!current) {
        res.status(404).json({ success: false, message: 'Brand not found' });
        return;
      }

      const duplicate = await Brand.findOne({
        _id: { $ne: current._id },
        $or: [
          ...(typeof updates.name === 'string' ? [{ name: new RegExp(`^${escapeRegExp(updates.name as string)}$`, 'i') }] : []),
          ...(typeof updates.slug === 'string' ? [{ slug: new RegExp(`^${escapeRegExp(updates.slug as string)}$`, 'i') }] : []),
        ],
      });
      if (duplicate) {
        res.status(409).json({ success: false, message: 'A brand with that name or slug already exists.' });
        return;
      }

      const brand = await Brand.findOneAndUpdate({ _id: current._id }, updates, { new: true, runValidators: true });
      if (!brand) {
        res.status(404).json({ success: false, message: 'Brand not found' });
        return;
      }

      if (typeof updates.name === 'string' && updates.name !== current.name) {
        await Product.updateMany(
          { brand: new RegExp(`^${escapeRegExp(current.name)}$`, 'i') },
          { $set: { brand: updates.name } }
        );
      }

      res.json({ success: true, data: brand });
      return;
    }

    const idx = memoryStore.brands.findIndex((brand) => brand.id === id || brand.slug === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Brand not found' });
      return;
    }

    const current = memoryStore.brands[idx];
    const nextSlug = typeof updates.slug === 'string' ? updates.slug : current.slug;
    if (memoryStore.brands.some((brand, index) => index !== idx && brand.slug.toLowerCase() === nextSlug.toLowerCase())) {
      res.status(409).json({ success: false, message: 'A brand with that name or slug already exists.' });
      return;
    }

    const updated = { ...current, ...updates };
    if (updated.name !== current.name) {
      memoryStore.products.forEach((product) => {
        if (product.brand.toLowerCase() === current.name.toLowerCase()) {
          product.brand = updated.name;
        }
      });
    }

    memoryStore.brands[idx] = updated;
    memoryStore.logAudit(req.user?.name || 'Admin', 'Brand Updated', updated.name, `Updated brand ${updated.name}`);
    res.json({ success: true, data: memoryStore.brands[idx] });
  } catch (error: unknown) {
    handleCategoryError(error, res);
  }
};

export const deleteBrand = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const brand = await Brand.findOne(buildIdentifierQuery(id, ['slug', 'legacyId']));
      if (!brand) {
        res.status(404).json({ success: false, message: 'Brand not found' });
        return;
      }

      const linkedProducts = await Product.exists({ brand: new RegExp(`^${escapeRegExp(brand.name)}$`, 'i') });
      if (linkedProducts) {
        res.status(409).json({
          success: false,
          message: 'This brand is assigned to products and cannot be deleted.',
        });
        return;
      }

      await Brand.deleteOne({ _id: brand._id });
      res.json({ success: true, message: 'Brand deleted', data: brand });
      return;
    }

    const idx = memoryStore.brands.findIndex((brand) => brand.id === id || brand.slug === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Brand not found' });
      return;
    }

    const brandToRemove = memoryStore.brands[idx];
    if (memoryStore.products.some((product) => product.brand.toLowerCase() === brandToRemove.name.toLowerCase())) {
      res.status(409).json({
        success: false,
        message: 'This brand is assigned to products and cannot be deleted.',
      });
      return;
    }

    const removed = memoryStore.brands.splice(idx, 1)[0];
    memoryStore.logAudit(req.user?.name || 'Admin', 'Brand Deleted', removed.name, `Removed brand ${removed.name}`);
    res.json({ success: true, message: 'Brand deleted', data: removed });
  } catch (error: unknown) {
    handleCategoryError(error, res);
  }
};
