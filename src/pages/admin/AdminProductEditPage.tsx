import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  updateProduct,
  selectAllCategories,
  selectAllBrands,
  setCategories,
} from '../../store/slices/productSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { Product } from '../../types';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { ImageUpload } from '../../components/admin/ImageUpload';

export const AdminProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectAllCategories);
  const brands = useAppSelector(selectAllBrands);

  const [form, setForm] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getAdminCategories()
      .then((serverCategories) => {
        if (active) dispatch(setCategories(serverCategories));
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Failed to load categories';
        setCategoryLoadError(message);
        dispatch(setCategories([]));
        dispatch(addNotification({
          type: 'error',
          title: 'Categories Unavailable',
          message,
          duration: 4000,
        }));
      });
    return () => {
      active = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!id) {
      setLoadError('Product identifier is missing.');
      setLoadingProduct(false);
      return;
    }

    let active = true;
    api.getAdminProduct(id)
      .then((product) => {
        if (active) setForm(product);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Failed to load product');
      })
      .finally(() => {
        if (active) setLoadingProduct(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loadingProduct) {
    return <div className="p-8 text-center bg-white rounded-3xl border">Loading product...</div>;
  }

  if (!form) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border">
        <h2 className="text-lg font-bold text-slate-900">
          {loadError === 'Product not found' ? 'Product Not Found' : 'Unable to Load Product'}
        </h2>
        {loadError && <p className="mt-2 text-sm text-rose-600">{loadError}</p>}
        <Link to="/admin/products" className="text-xs text-blue-600 underline mt-2 block">
          Return to Product List
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price === undefined) return;

    setLoading(true);
    const updated: Product = {
      ...(form as Product),
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      inventory: Number(form.inventory) || 0,
      discountPercent:
        form.compareAtPrice && form.price && form.compareAtPrice > form.price
          ? Math.round(((form.compareAtPrice - form.price) / form.compareAtPrice) * 100)
          : undefined,
    };

    try {
      const saved = await api.updateProduct(updated.id, updated);
      dispatch(updateProduct(saved));
      dispatch(
        addNotification({
          type: 'success',
          title: 'Product Updated',
          message: `Saved modifications for ${saved.name}`,
          duration: 3000,
        })
      );
      navigate('/admin/products');
    } catch (err: any) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Update Failed',
          message: err.message || 'Failed to update product',
          duration: 3000,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-slate-900">
              Edit Product: {form.name}
            </h1>
            <p className="text-xs text-slate-500 font-mono">SKU: {form.sku}</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || Boolean(categoryLoadError)}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Core fields */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              General Attributes
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Title *
              </label>
              <input
                type="text"
                required
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categoryLoadError && (
                  <p className="mt-1 text-xs text-rose-600">{categoryLoadError}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brand
                </label>
                <select
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={4}
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Pricing & Inventory Authority
            </h2>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Compare-At Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.compareAtPrice || ''}
                  onChange={(e) => setForm({ ...form, compareAtPrice: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stock Units *
                </label>
                <input
                  type="number"
                  required
                  value={form.inventory}
                  onChange={(e) => setForm({ ...form, inventory: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Asset Preview
            </h2>
            <div className="aspect-square rounded-2xl bg-slate-50 border p-3 flex items-center justify-center">
              <ImageUpload
                label="Product Main Image"
                aspect="square"
                value={form.mainImage || ''}
                onChange={(url) => setForm({ ...form, mainImage: url })}
                onClear={() => setForm({ ...form, mainImage: '' })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-2">
              Merchandising Flags
            </h2>
            <label className="flex items-center gap-3 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="font-semibold">Featured on Homepage</span>
            </label>
            <label className="flex items-center gap-3 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isBestSeller}
                onChange={(e) => setForm({ ...form, isBestSeller: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="font-semibold">Mark as Best Seller</span>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
};
