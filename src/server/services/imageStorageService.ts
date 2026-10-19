import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Lazily configured so the server can boot even when Cloudinary is not yet
// configured; uploads then fail gracefully with a clear message.
let configured = false;
let configureAttempted = false;

function ensureConfigured(): boolean {
  if (configureAttempted) return configured;
  configureAttempted = true;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && apiKey && apiSecret && !cloudName.includes('<') && !apiKey.includes('your_')) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    configured = true;
  }
  return configured;
}

export function isCloudinaryConfigured(): boolean {
  return ensureConfigured();
}

export interface UploadedImage {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Uploads a validated image buffer to Cloudinary and returns the persistent
 * secure URL plus its public_id (used later for safe asset lifecycle checks).
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  originalName: string,
  folder = 'marketly'
): Promise<UploadedImage> {
  if (!ensureConfigured()) {
    throw new Error(
      'Image storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on the server.'
    );
  }

  const baseName = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 60) || 'image';

  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${baseName}_${Date.now()}`,
        resource_type: 'image',
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(new Error(`Image storage upload failed: ${error?.message || 'unknown error'}`));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}
