import React, { useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectMediaAssets, addMediaAsset, deleteMediaAsset } from '../../store/slices/productSlice';
import { addNotification, showConfirmation } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { MediaAsset } from '../../types';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';

export const AdminMediaPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const mediaAssets = useAppSelector(selectMediaAssets);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again re-triggers the change event.
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Invalid Format',
          message: 'Only image files (JPEG, PNG, WebP) are supported.',
          duration: 3000,
        })
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'File Too Large',
          message: 'Maximum image size is 5 MB.',
          duration: 3000,
        })
      );
      return;
    }

    setUploading(true);
    try {
      // Real backend upload — persists the file to Cloudinary and registers
      // the asset in the Media library. The returned URL is the persistent URL.
      const asset = await api.uploadImage(file);
      dispatch(addMediaAsset(asset));
      dispatch(
        addNotification({
          type: 'success',
          title: 'Asset Uploaded to Cloudinary',
          message: `Saved ${file.name} to central Media Library.`,
          duration: 3000,
        })
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload media asset';
      dispatch(
        addNotification({
          type: 'error',
          title: 'Upload Failed',
          message,
          duration: 4000,
        })
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    dispatch(
      showConfirmation({
        title: 'Delete Media Asset?',
        message: `Are you sure you want to delete media asset "${name}"? This action cannot be undone.`,
        confirmText: 'Delete Asset',
        cancelText: 'Cancel',
        destructive: true,
        onConfirm: () => executeDelete(id, name),
      })
    );
  };

  const executeDelete = async (id: string, name: string) => {
    try {
      await api.deleteMedia(id);
      dispatch(deleteMediaAsset(id));
      dispatch(
        addNotification({
          type: 'info',
          title: 'Asset Removed',
          message: `Removed ${name} from media library.`,
          duration: 2500,
        })
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to delete media asset';
      dispatch(
        addNotification({
          type: 'error',
          title: 'Delete Failed',
          message,
          duration: 4000,
        })
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Central Media Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Native file explorer upload, Cloudinary asset proxy, format inspection, and metadata tracking.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
          />
          <button
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading…' : 'Upload New Media'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {mediaAssets.map((asset) => (
          <div
            key={asset.id}
            className="group relative rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs space-y-2 hover:shadow-md transition-all"
          >
            <div className="aspect-square rounded-xl bg-slate-50 overflow-hidden p-2 flex items-center justify-center">
              <img
                src={asset.url}
                alt={asset.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="px-1">
              <p className="text-xs font-bold text-slate-900 truncate">{asset.name}</p>
              <p className="text-[10px] text-slate-400">
                {(asset.size / 1024).toFixed(0)} KB · {asset.format} · {asset.dimensions}
              </p>
            </div>

            <button
              onClick={() => handleDelete(asset.id, asset.name)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/90 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
              title="Delete Media"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
