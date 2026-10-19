import { Request, Response } from 'express';
import multer from 'multer';
import { uploadImageBuffer, isCloudinaryConfigured } from '../services/imageStorageService';
import { Media as MediaModel } from '../models/Media';
import { AuditLog as AuditLogModel } from '../models/AuditLog';
import { isDbConnected } from '../config/db';
import { memoryStore } from '../config/memoryStore';
import { MediaAsset } from '../../types';

// Maximum accepted image size (bytes) — 5 MB. Multer aborts before any
// expensive processing runs for larger payloads.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Permitted image MIME types and their file signatures (magic bytes).
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/avif': 'AVIF',
};

/** Detect the real image format from the buffer's magic bytes. */
function detectImageFormat(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'JPEG';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'PNG';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'GIF';
  if (buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'WEBP';
  if (
    buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70 &&
    (buf.subarray(8, 12).toString('latin1') === 'avif' || buf.subarray(8, 12).toString('latin1') === 'avis')
  ) {
    return 'AVIF';
  }
  return null;
}

// Memory storage keeps the buffer in RAM; size is capped by MAX_IMAGE_BYTES so
// memory usage stays bounded. Files are streamed straight to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      cb(new Error('Unsupported file type. Allowed formats: JPEG, PNG, WebP, GIF, AVIF.'));
      return;
    }
    cb(null, true);
  },
});

export const uploadMiddleware = upload.single('image');

export const uploadImage = async (req: any, res: Response): Promise<void> => {
  try {
    if (!isCloudinaryConfigured()) {
      res.status(503).json({
        success: false,
        message:
          'Image storage is not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image file received.' });
      return;
    }

    // Authoritative content validation — do not trust client MIME type alone.
    const format = detectImageFormat(req.file.buffer);
    if (!format || !ALLOWED_MIME[`image/${format.toLowerCase()}`]) {
      res.status(415).json({
        success: false,
        message: 'File content is not a supported image (JPEG, PNG, WebP, GIF, AVIF).',
      });
      return;
    }

    const result = await uploadImageBuffer(req.file.buffer, req.file.originalname, 'marketly/admin');

    // Register the asset in the Media library so admins can see/manage it.
    const asset: MediaAsset = {
      id: 'media_' + Date.now(),
      name: req.file.originalname,
      url: result.url,
      format: result.format.toUpperCase(),
      size: result.bytes,
      dimensions: `${result.width}x${result.height}`,
      uploadedAt: new Date().toISOString(),
      folder: 'Storefront',
      publicId: result.publicId,
    };

    if (isDbConnected()) {
      await MediaModel.create({
        name: asset.name,
        url: asset.url,
        format: asset.format,
        size: asset.size,
        dimensions: asset.dimensions,
        folder: asset.folder,
        publicId: asset.publicId,
      });
      await AuditLogModel.create({
        actor: req.user?.name || 'Admin',
        action: 'Media Asset Uploaded',
        resource: asset.name,
        details: `Persistent upload (${result.format.toUpperCase()}, ${(result.bytes / 1024).toFixed(1)} KB)`,
      });
    } else {
      memoryStore.mediaAssets.unshift(asset);
      memoryStore.logAudit(
        req.user?.name || 'Admin',
        'Media Asset Uploaded',
        asset.name,
        `Persistent upload (${result.format.toUpperCase()}, ${(result.bytes / 1024).toFixed(1)} KB)`
      );
    }

    res.status(201).json({ success: true, data: asset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Image upload failed';
    res.status(500).json({ success: false, message });
  }
};
