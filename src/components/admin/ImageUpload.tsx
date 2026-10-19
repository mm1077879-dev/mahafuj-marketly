import React, { useCallback, useRef, useState } from 'react';
import { Upload, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB — keep in sync with backend limit
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

export interface ImageUploadProps {
  /** Current persistent image URL (from form state / existing record). */
  value: string;
  /** Called with the persisted image URL after a successful upload. */
  onChange: (url: string) => void;
  /** Optional accessible label describing what the image is for. */
  label?: string;
  /** Visual aspect ratio for the preview area. */
  aspect?: 'square' | 'wide' | 'banner';
  /** Called when the administrator clears the current image. */
  onClear?: () => void;
  disabled?: boolean;
}

/**
 * Shared admin image uploader: native file picker → client validation →
 * real backend upload (Cloudinary persistent storage) → preview →
 * persisted URL surfaced through onChange for the surrounding form.
 *
 * Manual URL entry is intentionally not offered; the backend is the only
 * source of new image references.
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label = 'Image',
  aspect = 'wide',
  onClear,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedOk, setUploadedOk] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);

  const aspectClass =
    aspect === 'square'
      ? 'aspect-square'
      : aspect === 'banner'
        ? 'aspect-[16/6]'
        : 'aspect-[16/9]';

  const validate = (file: File): string | null => {
    if (!file) return 'No file selected.';
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported format "${ext || 'unknown'}". Allowed: JPEG, PNG, WebP, GIF, AVIF.`;
    }
    if (!file.type.startsWith('image/')) {
      return 'The selected file is not an image.';
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum is 5 MB.`;
    }
    return null;
  };

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      setUploadedOk(false);

      const validationError = validate(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Local preview from a stable object URL; revoked only when replaced.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      const nextObjectUrl = URL.createObjectURL(file);
      setObjectUrl(nextObjectUrl);
      setLocalFileName(file.name);

      setUploading(true);
      try {
        const asset = await api.uploadImage(file);
        onChange(asset.url);
        setUploadedOk(true);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Image upload failed. Please try again.';
        setError(message);
        // Preserve the previously saved image — do not clear form state.
      } finally {
        setUploading(false);
      }
    },
    [objectUrl, onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again re-triggers change events.
    e.target.value = '';
    void handleFile(file);
  };

  const handleClear = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
    setLocalFileName(null);
    setError(null);
    setUploadedOk(false);
    onClear?.();
  };

  // Show the freshly picked local preview while uploading, otherwise the
  // persisted image reference.
  const previewSrc = uploading || (!value && objectUrl) ? objectUrl : value || '';

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold text-slate-700">{label}</span>

      <div
        className={`relative ${aspectClass} rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center p-2`}
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={`${label} preview`}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.25';
            }}
          />
        ) : (
          <div className="text-center text-slate-400">
            <Upload className="w-6 h-6 mx-auto mb-1" />
            <p className="text-[11px]">No image selected</p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center rounded-2xl">
            <Loader2 className="w-6 h-6 text-white animate-spin" aria-label="Uploading" />
          </div>
        )}
      </div>

      <input
        type="file"
        ref={inputRef}
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={handleInputChange}
        disabled={disabled || uploading}
        className="hidden"
        aria-label={`Select ${label.toLowerCase()} file`}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>{uploading ? 'Uploading…' : 'Choose Image'}</span>
        </button>

        {(value || objectUrl) && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={handleClear}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}

        {uploadedOk && !uploading && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
          </span>
        )}
      </div>

      {localFileName && !error && (
        <p className="text-[11px] text-slate-400 truncate">
          {uploading ? 'Uploading ' : 'Selected '}
          {localFileName}
        </p>
      )}

      {error && (
        <p
          className="flex items-start gap-1.5 text-[11px] text-rose-600 font-medium"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
};
