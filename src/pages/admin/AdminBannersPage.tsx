import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectAllBanners, updateBanner } from '../../store/slices/productSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { ImageUpload } from '../../components/admin/ImageUpload';
import { PromotionBanner } from '../../types';
import { Sliders, Save, CheckCircle2 } from 'lucide-react';

export const AdminBannersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const banners = useAppSelector(selectAllBanners);

  const [editingBanner, setEditingBanner] = useState<PromotionBanner | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;

    try {
      await api.updateBanner(editingBanner.id, editingBanner);
      dispatch(updateBanner(editingBanner));
      dispatch(
        addNotification({
          type: 'success',
          title: 'Banner Saved',
          message: `Updated promotional banner placement "${editingBanner.title}".`,
          duration: 3000,
        })
      );
      setEditingBanner(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update banner';
      dispatch(
        addNotification({
          type: 'error',
          title: 'Update Failed',
          message,
          duration: 4000,
        })
      );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Promotional Banners & CMS Campaigns
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage dynamic hero showcases, flash deal highlights, and dual commercial campaign cards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] uppercase">
                  Position: {b.position}
                </span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>

              <div className="aspect-16/9 rounded-2xl bg-slate-50 border overflow-hidden p-2 flex items-center justify-center">
                <img
                  src={b.image}
                  alt={b.title}
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900">{b.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{b.subtitle}</p>
                <div className="mt-2 text-xs font-medium text-slate-600 space-y-0.5">
                  <p>CTA Label: <strong className="text-slate-900">{b.ctaText}</strong></p>
                  <p>Destination: <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{b.ctaLink}</code></p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditingBanner(b)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Edit Banner Content
            </button>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Edit Banner ({editingBanner.position})</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Headline</label>
                <input
                  type="text"
                  required
                  value={editingBanner.title}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editingBanner.subtitle || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CTA Text</label>
                <input
                  type="text"
                  required
                  value={editingBanner.ctaText}
                  onChange={(e) => setEditingBanner({ ...editingBanner, ctaText: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CTA Link</label>
                <input
                  type="text"
                  required
                  value={editingBanner.ctaLink}
                  onChange={(e) => setEditingBanner({ ...editingBanner, ctaLink: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <ImageUpload
                  label="Banner Image"
                  aspect="banner"
                  value={editingBanner.image}
                  onChange={(url) => setEditingBanner({ ...editingBanner, image: url })}
                  onClear={() => setEditingBanner({ ...editingBanner, image: '' })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
