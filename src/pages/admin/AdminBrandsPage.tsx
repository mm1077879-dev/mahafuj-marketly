import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addBrand,
  deleteBrand,
  selectAllBrands,
  setBrands,
  updateBrand,
} from '../../store/slices/productSlice';
import { addNotification, showConfirmation } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { Brand } from '../../types';
import { Tag, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

export const AdminBrandsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const brands = useAppSelector(selectAllBrands);

  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  useEffect(() => {
    let active = true;
    api.getAdminBrands()
      .then((serverBrands) => {
        if (!active) return;
        dispatch(setBrands(serverBrands));
        setBrandsLoaded(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        dispatch(
          addNotification({
            type: 'error',
            title: 'Brand Load Failed',
            message: error instanceof Error ? error.message : 'Failed to load brands',
            duration: 4000,
          })
        );
        setBrandsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [dispatch]);

  const resetForm = () => {
    setBrandName('');
    setBrandLogo('');
    setDescription('');
    setEditingBrand(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    setLoading(true);
    const payload = {
      id: editingBrand?.id || `brand_${Date.now()}`,
      name: brandName.trim(),
      slug: brandName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
      logo: brandLogo.trim(),
      description: description.trim(),
    };

    try {
      if (editingBrand) {
        const saved = await api.updateBrand(editingBrand.id, payload);
        dispatch(updateBrand(saved));
        dispatch(
          addNotification({
            type: 'success',
            title: 'Brand Updated',
            message: `Saved changes to "${saved.name}".`,
            duration: 3000,
          })
        );
      } else {
        const created = await api.createBrand(payload);
        dispatch(addBrand(created));
        dispatch(
          addNotification({
            type: 'success',
            title: 'Brand Created',
            message: `Brand "${created.name}" is now available in the catalog.`,
            duration: 3000,
          })
        );
      }
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save brand';
      dispatch(
        addNotification({
          type: 'error',
          title: 'Brand Save Failed',
          message,
          duration: 4000,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setBrandLogo(brand.logo || '');
    setDescription(brand.description || '');
  };

  const executeDelete = async (id: string, brandName: string) => {
    try {
      await api.deleteBrand(id);
      dispatch(deleteBrand(id));
      dispatch(
        addNotification({
          type: 'info',
          title: 'Brand Removed',
          message: `Removed brand "${brandName}".`,
          duration: 2500,
        })
      );
      if (editingBrand?.id === id) resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete brand';
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

  const handleDelete = (brand: Brand) => {
    dispatch(
      showConfirmation({
        title: 'Delete Brand?',
        message: `Are you sure you want to remove "${brand.name}"? This will only be allowed if no products are assigned to it.`,
        confirmText: 'Delete Brand',
        cancelText: 'Cancel',
        destructive: true,
        onConfirm: () => executeDelete(brand.id, brand.name),
      })
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Brand Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Authorized vendor and luxury manufacturing brands represented in your catalog.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>{editingBrand ? 'Edit Brand' : 'Add Brand'}</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apple, Sony, Nike"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={brandLogo}
                onChange={(e) => setBrandLogo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Overview</label>
              <textarea
                rows={3}
                placeholder="Brand story or positioning"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !brandsLoaded}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </span>
              ) : editingBrand ? 'Save Brand' : 'Add Brand'}
            </button>

            {editingBrand && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            Active Brands ({brands.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {brands.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {b.logo ? (
                      <img src={b.logo} alt={b.name} className="w-8 h-8 object-contain rounded-lg bg-white border border-slate-200" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Tag className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{b.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate">/{b.slug}</p>
                    </div>
                  </div>
                  {b.description && <p className="mt-2 text-[11px] text-slate-500 line-clamp-2">{b.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEditing(b)}
                    className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    aria-label={`Edit ${b.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    aria-label={`Delete ${b.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
