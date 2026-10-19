import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addProduct,
  selectAllCategories,
  selectAllBrands,
  setCategories,
} from '../../store/slices/productSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { Product } from '../../types';
import { ArrowLeft, Save, Upload, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { ImageUpload } from '../../components/admin/ImageUpload';

export const AdminProductCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectAllCategories);
  const brands = useAppSelector(selectAllBrands);

  const [loading, setLoading] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Product>>({
    name: '',
    category: categories[0]?.name || 'Fashion',
    subcategory: '',
    brand: brands[0]?.name || 'Nike',
    price: 99.99,
    compareAtPrice: 129.99,
    inventory: 25,
    sku: 'MKT-' + Math.floor(1000 + Math.random() * 9000),
    mainImage: '',
    galleryImages: [],
    shortDescription: '',
    description: '',
    materials: 'Premium materials crafted for long-lasting luxury.',
    careInstructions: 'Spot clean with gentle microfiber cloth.',
    shippingInfo: 'Fast dispatch within 24 hours across Bangladesh.',
    returnPolicy: '30-day inspection period with original packaging.',
    isFeatured: true,
    isBestSeller: false,
    isFlashDeal: false,
    specifications: {
      Origin: 'Authentic Imported',
      Warranty: '1 Year Official Warranty',
    },
  });

  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecVal, setNewSpecVal] = useState('');
  const [tagsInput, setTagsInput] = useState('Luxury');

  useEffect(() => {
    let active = true;
    api.getAdminCategories()
      .then((serverCategories) => {
        if (!active) return;
        dispatch(setCategories(serverCategories));
        setForm((current) => ({
          ...current,
          category: serverCategories.some((category) => category.name === current.category)
            ? current.category
            : serverCategories[0]?.name || '',
        }));
        setCategoriesLoaded(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Failed to load categories';
        setCategoryLoadError(message);
        setCategoriesLoaded(true);
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

  const handleAddSpec = () => {
    if (!newSpecKey || !newSpecVal) return;
    setForm({
      ...form,
      specifications: {
        ...(form.specifications || {}),
        [newSpecKey]: newSpecVal,
      },
    });
    setNewSpecKey('');
    setNewSpecVal('');
  };

  const handleRemoveSpec = (key: string) => {
    const updated = { ...(form.specifications || {}) };
    delete updated[key];
    setForm({ ...form, specifications: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price === undefined || !form.category) return;
    if (!form.mainImage) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Image Required',
          message: 'Please choose and upload a product image before saving.',
          duration: 3500,
        })
      );
      return;
    }

    setLoading(true);
    // Unicode-safe slug generation supporting Bengali and English characters
    const rawClean = (form.name || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\u0980-\u09FF-]+/g, '');
    const slug = rawClean && rawClean !== '-' ? rawClean : `product-${Date.now()}`;

    const discountPercent =
      form.compareAtPrice && form.price && form.compareAtPrice > form.price
        ? Math.round(((form.compareAtPrice - form.price) / form.compareAtPrice) * 100)
        : undefined;

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!parsedTags.includes(form.category || 'Fashion')) {
      parsedTags.unshift(form.category || 'Fashion');
    }

    const newProduct: Product = {
      id: 'prod_' + Date.now(),
      name: form.name,
      slug,
      sku: form.sku || 'MKT-' + Math.floor(1000 + Math.random() * 9000),
      shortDescription: form.shortDescription || 'Refined craftsmanship for discerning clients.',
      description: form.description || 'Precision engineered with premium materials.',
      category: form.category || 'Fashion',
      subcategory: form.subcategory,
      brand: form.brand || 'Nike',
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      discountPercent,
      rating: 5.0,
      reviewCount: 0,
      mainImage: form.mainImage || '',
      galleryImages: form.mainImage ? [form.mainImage] : form.galleryImages || [],
      variants: [
        {
          id: 'v_' + Date.now(),
          sku: (form.sku || 'SKU') + '-STD',
          name: 'Standard Edition',
          attributes: { Edition: 'Standard' },
          price: Number(form.price),
          inventory: Number(form.inventory) || 20,
        },
      ],
      inventory: Number(form.inventory) || 20,
      tags: parsedTags,
      isFeatured: !!form.isFeatured,
      isBestSeller: !!form.isBestSeller,
      isFlashDeal: !!form.isFlashDeal,
      specifications: form.specifications || {},
      materials: form.materials,
      careInstructions: form.careInstructions,
      shippingInfo: form.shippingInfo,
      returnPolicy: form.returnPolicy,
      createdAt: new Date().toISOString(),
    };

    try {
      const created = await api.createProduct(newProduct);
      // Prefer the server-returned canonical document so the local store carries the
      // identifier the backend will resolve for subsequent edits/archives.
      dispatch(addProduct({ ...newProduct, ...(created || {}) } as Product));
      dispatch(
        addNotification({
          type: 'success',
          title: 'Product Published',
          message: `${newProduct.name} is now live in the active storefront.`,
          duration: 3500,
        })
      );
      navigate('/admin/products');
    } catch (err: any) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Error',
          message: err.message || 'Failed to publish product',
          duration: 3500,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      {/* Top Header */}
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
              Create New Product
            </h1>
            <p className="text-xs text-slate-500">
              Define product metadata, pricing, inventory authority, and technical specifications.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !categoriesLoaded || Boolean(categoryLoadError)}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Publishing...' : 'Publish Product'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Core Fields (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Basic Information */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              General Information
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Precision Automatic Titanium Watch"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
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
                  Brand *
                </label>
                <select
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
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
                Short Description (Card Teaser)
              </label>
              <textarea
                rows={2}
                placeholder="A brief 1-2 sentence compelling summary for product listings..."
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Editorial Description
              </label>
              <textarea
                rows={4}
                placeholder="Comprehensive description covering craftsmanship, ergonomics, luxury finishes..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Card 2: Pricing & Inventory */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Pricing & Inventory Authority
            </h2>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Base Price ($) *
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
                  placeholder="Original price for discount strikethrough"
                  value={form.compareAtPrice || ''}
                  onChange={(e) => setForm({ ...form, compareAtPrice: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Stock Count *
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU Identifier *
              </label>
              <input
                type="text"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Card 3: Specifications Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Technical Specifications
            </h2>

            <div className="space-y-2">
              {Object.entries(form.specifications || {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-bold text-slate-700">{k}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600">{v}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(k)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Spec Key (e.g. Battery Life)"
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <input
                type="text"
                placeholder="Value (e.g. Up to 72 hours)"
                value={newSpecVal}
                onChange={(e) => setNewSpecVal(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={handleAddSpec}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Add Spec
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Imagery & Flags (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 4: Media Preview */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Primary Media Asset
            </h2>

            <div className="aspect-square rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center p-3">
              <img
                src={form.mainImage}
                alt="Product preview"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
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

          {/* Card 5: Storefront Flags */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-2">
              Merchandising Badges
            </h2>

            <label className="flex items-center gap-3 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="font-semibold">Feature on Storefront Homepage</span>
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

            <label className="flex items-center gap-3 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFlashDeal}
                onChange={(e) => setForm({ ...form, isFlashDeal: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="font-semibold">Enroll in Flash Deals Countdown</span>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
};
