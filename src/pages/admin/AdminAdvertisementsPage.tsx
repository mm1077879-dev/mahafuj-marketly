import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ImageUpload } from '../../components/admin/ImageUpload';
import { Advertisement } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { addNotification } from '../../store/slices/uiSlice';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  XCircle,
  Calendar,
  Save,
  X,
  Sliders,
} from 'lucide-react';
import { Dialog } from '../../components/common/Dialog';

export const AdminAdvertisementsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Partial<Advertisement> | null>(null);
  const [adToDelete, setAdToDelete] = useState<Advertisement | null>(null);

  const loadAds = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminAdvertisements();
      setAds(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  const handleOpenCreate = () => {
    setEditingAd({
      title: '',
      placement: 'below_hero',
      imageUrl: '',
      destinationUrl: '/shop',
      openInNewTab: false,
      priority: 1,
      active: true,
      provider: 'custom_banner',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ad: Advertisement) => {
    setEditingAd({ ...ad });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd || !editingAd.title || !editingAd.imageUrl) return;

    try {
      if (editingAd.id) {
        await api.updateAdvertisement(editingAd.id, editingAd);
        dispatch(
          addNotification({
            type: 'success',
            title: 'Advertisement Updated',
            message: `Updated "${editingAd.title}" successfully.`,
            duration: 3000,
          })
        );
      } else {
        await api.createAdvertisement(editingAd);
        dispatch(
          addNotification({
            type: 'success',
            title: 'Advertisement Created',
            message: `Created "${editingAd.title}" successfully.`,
            duration: 3000,
          })
        );
      }
      setIsModalOpen(false);
      setEditingAd(null);
      loadAds();
    } catch (err: any) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Error Saving Ad',
          message: err.message || 'Failed to save advertisement.',
          duration: 4000,
        })
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!adToDelete) return;
    try {
      await api.deleteAdvertisement(adToDelete.id);
      dispatch(
        addNotification({
          type: 'info',
          title: 'Advertisement Removed',
          message: `Deleted "${adToDelete.title}".`,
          duration: 3000,
        })
      );
      setAdToDelete(null);
      loadAds();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleToggleActive = async (ad: Advertisement) => {
    try {
      const updated = await api.updateAdvertisement(ad.id, { active: !ad.active });
      setAds(ads.map((a) => (a.id === ad.id ? updated : a)));
      dispatch(
        addNotification({
          type: updated.active ? 'success' : 'info',
          title: updated.active ? 'Ad Activated' : 'Ad Deactivated',
          message: `"${ad.title}" is now ${updated.active ? 'active on storefront' : 'hidden'}.`,
          duration: 2500,
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Homepage Advertisements
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {ads.length} total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage promotional commercial banners, placements, click-through destinations, and priority order.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Advertisement</span>
        </button>
      </div>

      {/* Placement Guide Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
            Placement 1
          </span>
          <h4 className="font-bold text-xs text-slate-900">Below Hero Showcase</h4>
          <p className="text-[11px] text-slate-500 mt-1">Appears immediately after Flash Deal</p>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block mb-0.5">
            Placement 2
          </span>
          <h4 className="font-bold text-xs text-slate-900">Between Collections</h4>
          <p className="text-[11px] text-slate-500 mt-1">Between Featured Products & Summer Promo</p>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">
            Placement 3
          </span>
          <h4 className="font-bold text-xs text-slate-900">Before Footer</h4>
          <p className="text-[11px] text-slate-500 mt-1">Appears right above Newsletter signup</p>
        </div>
      </div>

      {/* Ads List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Active & Configured Campaigns</h3>
          <span className="text-xs text-slate-400">Zero empty whitespace when deactivated</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading advertisements...</div>
        ) : ads.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Megaphone className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No advertisements found</p>
            <p className="text-xs text-slate-400 mt-1">Click "New Advertisement" to add your first commercial promo.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-24 h-16 sm:w-32 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{ad.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ad.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {ad.active ? 'Active on Storefront' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        Slot: {ad.placement.replace('_', ' ')}
                      </span>
                      <span>Priority: {ad.priority || 1}</span>
                      {ad.destinationUrl && (
                        <a
                          href={ad.destinationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-[160px]">{ad.destinationUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleToggleActive(ad)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      ad.active
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {ad.active ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(ad)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                    title="Edit Advertisement"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setAdToDelete(ad)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete Advertisement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAd?.id ? 'Edit Advertisement' : 'Create Advertisement'}
        description="Configure banner placement, image asset, and destination link."
      >
        {editingAd && (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ad Title / Campaign Name *</label>
              <input
                type="text"
                required
                value={editingAd.title || ''}
                onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
                placeholder="e.g. Luxury Handbags 30% Off"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Placement Slot *</label>
                <select
                  value={editingAd.placement || 'below_hero'}
                  onChange={(e) =>
                    setEditingAd({
                      ...editingAd,
                      placement: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="below_hero">Below Hero Showcase</option>
                  <option value="between_collections">Between Collections</option>
                  <option value="before_footer">Before Footer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Display Priority</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editingAd.priority || 1}
                  onChange={(e) => setEditingAd({ ...editingAd, priority: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <ImageUpload
                label="Advertisement Image"
                aspect="banner"
                value={editingAd.imageUrl || ''}
                onChange={(url) => setEditingAd({ ...editingAd, imageUrl: url })}
                onClear={() => setEditingAd({ ...editingAd, imageUrl: '' })}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Destination Target URL</label>
              <input
                type="text"
                value={editingAd.destinationUrl || ''}
                onChange={(e) => setEditingAd({ ...editingAd, destinationUrl: e.target.value })}
                placeholder="/shop?category=Watches or https://partner.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingAd.active ?? true}
                  onChange={(e) => setEditingAd({ ...editingAd, active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700">Active (Visible on Homepage)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingAd.openInNewTab ?? false}
                  onChange={(e) => setEditingAd({ ...editingAd, openInNewTab: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700">Open in New Tab</span>
              </label>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Advertisement</span>
              </button>
            </div>
          </form>
        )}
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(adToDelete)}
        onClose={() => setAdToDelete(null)}
        title="Confirm Deletion"
        description="Are you sure you want to permanently remove this advertisement campaign? This cannot be undone."
      >
        {adToDelete && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-800">{adToDelete.title}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Placement: {adToDelete.placement}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Advertisement</span>
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
