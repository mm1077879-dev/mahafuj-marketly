import { Request, Response } from 'express';
import { Banner as BannerModel } from '../models/Banner';
import { Media as MediaModel } from '../models/Media';
import { AuditLog as AuditLogModel } from '../models/AuditLog';
import { Order as OrderModel } from '../models/Order';
import { Product as ProductModel } from '../models/Product';
import { User as UserModel } from '../models/User';
import { isDbConnected } from '../config/db';
import { memoryStore } from '../config/memoryStore';
import { buildIdentifierQuery } from '../utils/resolveIdentifier';
import { MediaAsset } from '../../types';

// Banner Controller
export const getBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isDbConnected()) {
      let banners = await BannerModel.find({ active: true });
      if (banners.length === 0) banners = memoryStore.banners as any;
      res.json({ success: true, data: banners });
      return;
    }
    const banners = memoryStore.banners.filter((b) => b.active);
    res.json({ success: true, data: banners });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBanner = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const updated = await BannerModel.findOneAndUpdate(
        buildIdentifierQuery(id, ['slug']),
        req.body,
        { new: true }
      );
      if (!updated) {
        res.status(404).json({ success: false, message: 'Banner not found' });
        return;
      }
      await AuditLogModel.create({
        actor: req.user?.name || 'Admin',
        action: 'Banner Updated',
        resource: updated?.title || id,
        details: `Modified banner placement`,
      });
      res.json({ success: true, data: updated });
      return;
    }

    const idx = memoryStore.banners.findIndex((b) => b.id === id);
    if (idx !== -1) {
      memoryStore.banners[idx] = { ...memoryStore.banners[idx], ...req.body };
      memoryStore.logAudit(
        req.user?.name || 'Admin',
        'Banner Updated',
        memoryStore.banners[idx].title,
        'Modified banner content'
      );
      res.json({ success: true, data: memoryStore.banners[idx] });
      return;
    }

    res.status(404).json({ success: false, message: 'Banner not found' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Media Controller
export const getMediaAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isDbConnected()) {
      let media = await MediaModel.find().sort({ createdAt: -1 });
      if (media.length === 0) media = memoryStore.mediaAssets as any;
      res.json({ success: true, data: media });
      return;
    }
    res.json({ success: true, data: memoryStore.mediaAssets });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMediaAsset = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const removed = await MediaModel.findOneAndDelete(buildIdentifierQuery(id));
      if (!removed) {
        res.status(404).json({ success: false, message: 'Media asset not found' });
        return;
      }
      res.json({ success: true, message: 'Media removed' });
      return;
    }

    const idx = memoryStore.mediaAssets.findIndex((m) => m.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Media asset not found' });
      return;
    }
    const removed = memoryStore.mediaAssets.splice(idx, 1)[0];
    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Media Removed',
      removed.name,
      `Deleted media asset ${removed.name}`
    );
    res.json({ success: true, message: 'Media removed' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin Controller
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isDbConnected()) {
      const orders = await OrderModel.find();
      const products = await ProductModel.find();
      const users = await UserModel.find();

      const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.total : 0), 0);
      const totalStock = products.reduce((sum, p) => sum + p.inventory, 0);

      res.json({
        success: true,
        data: {
          totalRevenue,
          orderCount: orders.length,
          productCount: products.length,
          userCount: users.length,
          totalStock,
        },
      });
      return;
    }

    const orders = memoryStore.orders;
    const products = memoryStore.products;
    const users = memoryStore.users;

    const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.total : 0), 0);
    const totalStock = products.reduce((sum, p) => sum + p.inventory, 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        orderCount: orders.length,
        productCount: products.length,
        userCount: users.length,
        totalStock,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isDbConnected()) {
      let logs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(50);
      if (logs.length === 0) logs = memoryStore.auditLogs as any;
      res.json({ success: true, data: logs });
      return;
    }
    res.json({ success: true, data: memoryStore.auditLogs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Customer Controller
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isDbConnected()) {
      const customers = await UserModel.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 });
      res.json({ success: true, data: customers });
      return;
    }
    const customers = memoryStore.users.filter((u) => u.role === 'customer');
    res.json({ success: true, data: customers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Inventory Controller
export const getInventorySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isDbConnected()) {
      const products = await ProductModel.find().select('name sku inventory category variants price');
      res.json({ success: true, data: products });
      return;
    }
    const products = memoryStore.products.map((p) => ({
      _id: p.id,
      id: p.id,
      name: p.name,
      sku: p.sku,
      inventory: p.inventory,
      category: p.category,
      variants: p.variants,
      price: p.price,
    }));
    res.json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adjustStock = async (req: any, res: Response): Promise<void> => {
  try {
    const { productId, variantId, quantityChange, newQuantity, reason } = req.body;

    if (isDbConnected()) {
      const product = await ProductModel.findOne(buildIdentifierQuery(productId, ['slug', 'sku']));
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      if (variantId && product.variants) {
        const v = product.variants.find((variant: any) => variant.id === variantId);
        if (v) {
          v.inventory = newQuantity !== undefined ? newQuantity : Math.max(0, v.inventory + quantityChange);
        }
      } else {
        product.inventory = newQuantity !== undefined ? newQuantity : Math.max(0, product.inventory + quantityChange);
      }

      await product.save();
      await AuditLogModel.create({
        actor: req.user?.name || 'Admin',
        action: 'Inventory Adjusted',
        resource: product.name,
        details: `Stock updated. Reason: ${reason || 'Manual Count Adjustment'}`,
      });

      res.json({ success: true, data: product });
      return;
    }

    const prod = memoryStore.products.find((p) => p.id === productId);
    if (!prod) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    if (variantId && prod.variants) {
      const v = prod.variants.find((variant: any) => variant.id === variantId);
      if (v) {
        v.inventory = newQuantity !== undefined ? newQuantity : Math.max(0, v.inventory + quantityChange);
      }
    } else {
      prod.inventory = newQuantity !== undefined ? newQuantity : Math.max(0, prod.inventory + quantityChange);
    }

    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Inventory Adjusted',
      prod.name,
      `Stock updated to ${prod.inventory}. Reason: ${reason || 'Manual Count Adjustment'}`
    );

    res.json({ success: true, data: prod });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
