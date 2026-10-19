import { Request, Response } from 'express';
import { Advertisement as AdvertisementModel } from '../models/Advertisement';
import { isDbConnected } from '../config/db';
import { memoryStore } from '../config/memoryStore';
import { Advertisement as AdvertisementType } from '../../types';

// Public endpoint for storefront homepage placements
export const getPublicAdvertisements = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    if (isDbConnected()) {
      const ads = await AdvertisementModel.find({
        active: true,
        $and: [
          { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
          { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
        ],
      }).sort({ priority: -1, createdAt: -1 });

      res.json({ success: true, data: ads });
      return;
    }

    // In-memory filter
    const nowIso = now.toISOString();
    const activeAds = memoryStore.advertisements.filter((ad) => {
      if (!ad.active) return false;
      if (ad.startDate && ad.startDate > nowIso) return false;
      if (ad.endDate && ad.endDate < nowIso) return false;
      return true;
    });

    activeAds.sort((a, b) => (b.priority || 1) - (a.priority || 1));

    res.json({ success: true, data: activeAds });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin endpoint for managing all advertisements
export const getAdminAdvertisements = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isDbConnected()) {
      const ads = await AdvertisementModel.find().sort({ createdAt: -1 });
      res.json({ success: true, data: ads });
      return;
    }
    res.json({ success: true, data: memoryStore.advertisements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAdvertisement = async (req: any, res: Response): Promise<void> => {
  try {
    const { title, placement, imageUrl, destinationUrl, openInNewTab, priority, startDate, endDate, active, provider, adSenseSlot, adSenseClient } = req.body;

    if (!title || !placement || !imageUrl) {
      res.status(400).json({
        success: false,
        message: 'Title, placement location, and image asset are required.',
      });
      return;
    }

    if (!['below_hero', 'between_collections', 'before_footer'].includes(placement)) {
      res.status(400).json({
        success: false,
        message: 'Invalid placement. Supported: below_hero, between_collections, before_footer',
      });
      return;
    }

    if (isDbConnected()) {
      const ad = await AdvertisementModel.create({
        title: title.trim(),
        placement,
        imageUrl: imageUrl.trim(),
        destinationUrl: destinationUrl ? destinationUrl.trim() : '',
        openInNewTab: openInNewTab !== false,
        priority: Number(priority) || 1,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        active: active !== false,
        provider: provider || 'custom_banner',
        adSenseSlot,
        adSenseClient,
      });

      memoryStore.logAudit(
        req.user?.name || 'Admin',
        'Advertisement Created',
        ad.title,
        `Placement: ${ad.placement}, Priority: ${ad.priority}`
      );

      res.status(201).json({ success: true, data: ad });
      return;
    }

    const newAd: AdvertisementType = {
      id: 'ad_' + Date.now(),
      title: title.trim(),
      placement,
      imageUrl: imageUrl.trim(),
      destinationUrl: destinationUrl ? destinationUrl.trim() : '',
      openInNewTab: openInNewTab !== false,
      priority: Number(priority) || 1,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      active: active !== false,
      provider: provider || 'custom_banner',
      adSenseSlot,
      adSenseClient,
    };

    memoryStore.advertisements.unshift(newAd);
    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Advertisement Created',
      newAd.title,
      `Placement: ${newAd.placement}, Priority: ${newAd.priority}`
    );

    res.status(201).json({ success: true, data: newAd });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdvertisement = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const updated = await AdvertisementModel.findByIdAndUpdate(id, req.body, { new: true });
      if (!updated) {
        res.status(404).json({ success: false, message: 'Advertisement not found' });
        return;
      }
      memoryStore.logAudit(
        req.user?.name || 'Admin',
        'Advertisement Updated',
        updated.title,
        `Updated placement: ${updated.placement}`
      );
      res.json({ success: true, data: updated });
      return;
    }

    const index = memoryStore.advertisements.findIndex((a) => a.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Advertisement not found' });
      return;
    }

    memoryStore.advertisements[index] = {
      ...memoryStore.advertisements[index],
      ...req.body,
    };

    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Advertisement Updated',
      memoryStore.advertisements[index].title,
      `Updated placement: ${memoryStore.advertisements[index].placement}`
    );

    res.json({ success: true, data: memoryStore.advertisements[index] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAdvertisement = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const deleted = await AdvertisementModel.findByIdAndDelete(id);
      if (deleted) {
        memoryStore.logAudit(
          req.user?.name || 'Admin',
          'Advertisement Deleted',
          deleted.title,
          `Removed advertisement ID ${id}`
        );
      }
      res.json({ success: true, message: 'Advertisement deleted successfully' });
      return;
    }

    const index = memoryStore.advertisements.findIndex((a) => a.id === id);
    if (index !== -1) {
      const removed = memoryStore.advertisements.splice(index, 1)[0];
      memoryStore.logAudit(
        req.user?.name || 'Admin',
        'Advertisement Deleted',
        removed.title,
        `Removed advertisement ID ${id}`
      );
    }

    res.json({ success: true, message: 'Advertisement deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
