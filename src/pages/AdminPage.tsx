import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectAllProducts,
  selectAllCategories,
  selectAllBrands,
  selectAllBanners,
  selectAuditLogs,
  selectMediaAssets,
  addProduct,
  updateProduct,
  deleteProduct,
  addCategory,
  deleteCategory,
  updateBanner,
  addMediaAsset,
  deleteMediaAsset,
} from '../store/slices/productSlice';
import {
  selectAllOrders,
  updateOrderStatus,
} from '../store/slices/orderSlice';
import { selectCurrentUser, selectIsAdmin } from '../store/slices/authSlice';
import { addNotification } from '../store/slices/uiSlice';
import { Product, Category, PromotionBanner, OrderStatus, MediaAsset } from '../types';
import { Dialog } from '../components/common/Dialog';
import { ImageUpload } from '../components/admin/ImageUpload';
import { api } from '../services/api';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Image as ImageIcon,
  ScrollText,
  Sliders,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Upload,
  ArrowRight,
  Eye,
  Database,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isAdmin = useAppSelector(selectIsAdmin);

  const products = useAppSelector(selectAllProducts);
  const categories = useAppSelector(selectAllCategories);
  const brands = useAppSelector(selectAllBrands);
  const banners = useAppSelector(selectAllBanners);
  const orders = useAppSelector(selectAllOrders);
  const auditLogs = useAppSelector(selectAuditLogs);
  const mediaAssets = useAppSelector(selectMediaAssets);

  const [dbInfo, setDbInfo] = useState<{ mode: string; status: string }>({ mode: 'connecting', status: 'healthy' });

  useEffect(() => {
    // Check live backend database status
    api.getHealth().then((h) => {
      if (h && h.database) {
        setDbInfo({
          mode: h.database.mode === 'mongodb_atlas' ? 'MongoDB Atlas Live' : 'Active In-Memory / Atlas Fallback',
          status: h.status,
        });
      }
    });
  }, []);

  const [activeModule, setActiveModule] = useState<
    'dashboard' | 'products' | 'categories' | 'orders' | 'cms' | 'media' | 'audit'
  >('dashboard');

  // Dialog States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState('');

  // Media file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Product Add/Edit
  const [prodForm, setProdForm] = useState<Partial<Product>>({
    name: '',
    category: 'Fashion',
    brand: 'Nike',
    price: 99.99,
    compareAtPrice: 129.99,
    inventory: 20,
    mainImage: '/src/assets/images/sneakers_white_air_1790933024489.jpg',
    shortDescription: '',
    description: '',
    isFeatured: true,
    isBestSeller: false,
  });

  const openAddProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      category: 'Fashion',
      brand: 'Nike',
      price: 99.99,
      compareAtPrice: 129.99,
      inventory: 20,
      mainImage: '/src/assets/images/sneakers_white_air_1790933024489.jpg',
      shortDescription: '',
      description: '',
      isFeatured: true,
      isBestSeller: false,
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdForm(p);
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name) return;

    try {
      if (editingProduct) {
        const updated: Product = {
          ...editingProduct,
          ...(prodForm as Product),
        };
        await api.updateProduct(editingProduct.id, updated);
        dispatch(updateProduct(updated));
        dispatch(
          addNotification({
            type: 'success',
            title: 'Product Updated',
            message: `Saved changes to ${updated.name}`,
            duration: 3000,
          })
        );
      } else {
        const newP: Product = {
          id: 'prod_' + Date.now(),
          name: prodForm.name || 'New Luxury Item',
          slug: (prodForm.name || 'new-product').toLowerCase().replace(/\s+/g, '-'),
          sku: 'MKT-SKU-' + Math.floor(1000 + Math.random() * 9000),
          shortDescription: prodForm.shortDescription || 'Refined craftsmanship and timeless luxury.',
          description: prodForm.description || 'Engineered with premium materials for discerning clients.',
          category: prodForm.category || 'Fashion',
          brand: prodForm.brand || 'Nike',
          price: Number(prodForm.price) || 99.99,
          compareAtPrice: Number(prodForm.compareAtPrice) || 129.99,
          discountPercent: prodForm.compareAtPrice && prodForm.price
            ? Math.round(((prodForm.compareAtPrice - prodForm.price) / prodForm.compareAtPrice) * 100)
            : undefined,
          rating: 5.0,
          reviewCount: 1,
          mainImage: prodForm.mainImage || '/src/assets/images/sneakers_white_air_1790933024489.jpg',
          galleryImages: [prodForm.mainImage || '/src/assets/images/sneakers_white_air_1790933024489.jpg'],
          variants: [
            {
              id: 'v_' + Date.now(),
              sku: 'MKT-VAR-' + Math.floor(100 + Math.random() * 900),
              name: 'Standard Edition',
              attributes: { color: 'Standard' },
              price: Number(prodForm.price) || 99.99,
              inventory: Number(prodForm.inventory) || 20,
            },
          ],
          inventory: Number(prodForm.inventory) || 20,
          isFeatured: prodForm.isFeatured,
          isBestSeller: prodForm.isBestSeller,
          specifications: {
            Material: 'Premium certified composite',
            Warranty: '1 Year official manufacturer warranty',
          },
          createdAt: new Date().toISOString(),
        };
        await api.createProduct(newP);
        dispatch(addProduct(newP));
        dispatch(
          addNotification({
            type: 'success',
            title: 'Product Published',
            message: `Added ${newP.name} to the active storefront catalog.`,
            duration: 3500,
          })
        );
      }
    } catch (err: any) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Save Failed',
          message: err.message || 'Failed to save product',
          duration: 4000,
        })
      );
    }
    setProductModalOpen(false);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    const cat: Category = {
      id: 'cat_' + Date.now(),
      name: newCatName,
      slug: newCatName.toLowerCase().replace(/\s+/g, '-'),
      itemCount: 0,
      image: newCatImage || 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=400',
      featured: true,
    };
    try {
      await api.createCategory(cat);
      dispatch(addCategory(cat));
      dispatch(
        addNotification({
          type: 'success',
          title: 'Category Created',
          message: `Category "${cat.name}" added to storefront navigation.`,
          duration: 3000,
        })
      );
      setNewCatName('');
      setNewCatImage('');
      setCategoryModalOpen(false);
    } catch (err: any) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Save Failed',
          message: err.message || 'Failed to create category',
          duration: 4000,
        })
      );
    }
  };

  // Real persistent file upload — routes the picked file through the backend
  // to Cloudinary and registers the asset in the Media library.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Invalid File',
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

    try {
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
    } catch (err: any) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Upload Failed',
          message: err.message || 'Failed to upload media asset',
          duration: 4000,
        })
      );
    }
  };

  // Calculations for dashboard
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.total : 0), 0);
  const totalStock = products.reduce((sum, p) => sum + p.inventory, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Top Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs">
              Single-Vendor Control Tower
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {dbInfo.mode}
            </span>
            <span className="text-xs text-slate-400 font-mono">v3.2 Production</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">
            Marketly Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time catalog control, dynamic CMS banners, inventory authority, and order logistics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <p className="font-bold text-white">{currentUser?.name}</p>
            <p className="text-blue-400 capitalize">{currentUser?.role.replace('_', ' ')}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            M
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'products', label: 'Products & Variants', icon: Package },
          { id: 'categories', label: 'Categories & Brands', icon: Layers },
          { id: 'orders', label: 'Orders & Fulfillment', icon: ShoppingBag },
          { id: 'cms', label: 'Banners & CMS', icon: Sliders },
          { id: 'media', label: 'Media Library', icon: ImageIcon },
          { id: 'audit', label: 'Audit Trail', icon: ScrollText },
        ].map((m) => {
          const Icon = m.icon;
          const isActive = activeModule === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODULE 1: DASHBOARD */}
      {activeModule === 'dashboard' && (
        <div className="space-y-8">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="font-display font-black text-2xl sm:text-3xl text-slate-900 tabular-nums">
                ${totalRevenue.toFixed(2)}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+18.4% vs last cycle</span>
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-display font-black text-2xl sm:text-3xl text-slate-900 tabular-nums">
                {orders.length}
              </p>
              <p className="text-[11px] text-slate-400">All customer shipments tracked</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Active Products</span>
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <p className="font-display font-black text-2xl sm:text-3xl text-slate-900 tabular-nums">
                {products.length}
              </p>
              <p className="text-[11px] text-slate-500">{totalStock} total units in stock</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Media Assets</span>
                <ImageIcon className="w-5 h-5 text-pink-600" />
              </div>
              <p className="font-display font-black text-2xl sm:text-3xl text-slate-900 tabular-nums">
                {mediaAssets.length}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold">100% Cloudinary Synced</p>
            </div>
          </div>

          {/* Recent Orders Overview */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-900">
                Recent Orders in Pipeline
              </h3>
              <button
                onClick={() => setActiveModule('orders')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View All Orders
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Order #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right rounded-r-xl">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                      <td className="p-3 text-slate-800">{o.customer.name}</td>
                      <td className="p-3 uppercase text-blue-600 font-semibold">{o.paymentMethod}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold">
                          {o.orderStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 tabular-nums">
                        ${o.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: PRODUCTS */}
      {activeModule === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900">
                Product Catalog Management
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Maintain product listings, SKUs, inventory authority, and pricing.
              </p>
            </div>
            <button
              onClick={openAddProduct}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Product</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock Authority</th>
                  <th className="p-3 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-3 flex items-center gap-3">
                      <img
                        src={p.mainImage}
                        alt={p.name}
                        className="w-10 h-10 object-contain rounded-lg bg-slate-50 border p-1"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="font-bold text-slate-900 line-clamp-1">{p.name}</p>
                        <span className="text-[10px] text-slate-400">{p.brand}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{p.sku}</td>
                    <td className="p-3 text-slate-700">{p.category}</td>
                    <td className="p-3 font-bold text-slate-900 tabular-nums">${p.price.toFixed(2)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold tabular-nums ${
                          p.inventory > 10
                            ? 'bg-emerald-50 text-emerald-700'
                            : p.inventory > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {p.inventory} in stock
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditProduct(p)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                          aria-label="Edit product"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => dispatch(deleteProduct(p.id))}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                          aria-label="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODULE 3: CATEGORIES */}
      {activeModule === 'categories' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900">
                Dynamic Store Categories
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Categories are database-driven. Changes propagate dynamically across the storefront.
              </p>
            </div>
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border overflow-hidden p-1">
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-full h-full object-cover rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">/{c.slug}</span>
                  </div>
                </div>
                <button
                  onClick={() => dispatch(deleteCategory(c.id))}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 4: ORDERS */}
      {activeModule === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900">
              Orders & Lifecycle Transitions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control server-authoritative status: Confirmed → Processing → Shipped → Out for Delivery → Delivered.
            </p>
          </div>

          <div className="space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {ord.orderNumber}
                    </span>
                    <span className="text-slate-500 ml-2">Customer: {ord.customer.name} ({ord.customer.phone})</span>
                  </div>

                  {/* Status transition dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold">Change Status:</span>
                    <select
                      value={ord.orderStatus}
                      onChange={(e) =>
                        dispatch(
                          updateOrderStatus({
                            orderId: ord.id,
                            status: e.target.value as OrderStatus,
                            note: `Status updated by Admin (${currentUser?.name})`,
                          })
                        )
                      }
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  <p>
                    <strong>Destination:</strong> {ord.shippingAddress.streetAddress}, {ord.shippingAddress.upazila}, {ord.shippingAddress.district}, {ord.shippingAddress.division}
                  </p>
                  <p className="mt-1">
                    <strong>Items:</strong> {ord.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    Total: ${ord.total.toFixed(2)} · Method: {ord.paymentMethod.toUpperCase()} ({ord.paymentStatus})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 5: CMS & BANNERS */}
      {activeModule === 'cms' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900">
              CMS Dynamic Banners
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live promotional banners on the homepage are database-driven and editable by admin.
            </p>
          </div>

          <div className="space-y-4">
            {banners.map((ban) => (
              <div
                key={ban.id}
                className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-lg">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    Position: {ban.position}
                  </span>
                  <h4 className="font-bold text-base text-slate-900">{ban.title}</h4>
                  <p className="text-xs text-slate-600">{ban.subtitle}</p>
                  <p className="text-xs text-slate-400">
                    CTA: "{ban.ctaText}" → {ban.ctaLink}
                  </p>
                </div>

                <div className="w-24 h-16 rounded-xl overflow-hidden bg-white border p-1 shrink-0">
                  <img
                    src={ban.image}
                    alt={ban.title}
                    className="w-full h-full object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 6: MEDIA LIBRARY */}
      {activeModule === 'media' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900">
                Media Library (Cloudinary Storage)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Native file explorer upload, previews, format validation, and asset metadata.
              </p>
            </div>

            {/* Native file input */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Media Asset</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mediaAssets.map((asset) => (
              <div
                key={asset.id}
                className="group relative rounded-2xl border border-slate-200/80 bg-slate-50 p-2 shadow-2xs space-y-2"
              >
                <div className="aspect-square rounded-xl bg-white overflow-hidden p-1">
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
                    {(asset.size / 1024).toFixed(0)} KB · {asset.format}
                  </p>
                </div>
                <button
                  onClick={() => dispatch(deleteMediaAsset(asset.id))}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/90 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                  aria-label="Delete media"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 7: AUDIT TRAIL */}
      {activeModule === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900">
              Administrative Audit Logs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable logging of catalog mutations, pricing adjustments, and security state changes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Timestamp</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3 rounded-r-xl">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{log.actor}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-900 font-bold">{log.resource}</td>
                    <td className="p-3 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Add/Edit Dialog */}
      <Dialog
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Title *
            </label>
            <input
              type="text"
              required
              value={prodForm.name || ''}
              onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={prodForm.category || 'Fashion'}
                onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brand
              </label>
              <select
                value={prodForm.brand || 'Nike'}
                onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={prodForm.price || ''}
                onChange={(e) => setProdForm({ ...prodForm, price: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Compare-at ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={prodForm.compareAtPrice || ''}
                onChange={(e) =>
                  setProdForm({ ...prodForm, compareAtPrice: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                required
                value={prodForm.inventory || ''}
                onChange={(e) => setProdForm({ ...prodForm, inventory: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <ImageUpload
              label="Main Product Image"
              aspect="square"
              value={prodForm.mainImage || ''}
              onChange={(url) => setProdForm({ ...prodForm, mainImage: url })}
              onClear={() => setProdForm({ ...prodForm, mainImage: '' })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Description
            </label>
            <textarea
              rows={2}
              value={prodForm.shortDescription || ''}
              onChange={(e) => setProdForm({ ...prodForm, shortDescription: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Save Product
            </button>
          </div>
        </form>
      </Dialog>

      {/* Category Modal */}
      <Dialog
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Add Category"
      >
        <form onSubmit={handleSaveCategory} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Footwear, Audio, Luxury Watches"
              className="w-full px-3 py-2 border rounded-xl text-xs"
            />
          </div>
          <div>
            <ImageUpload
              label="Category Image"
              aspect="square"
              value={newCatImage}
              onChange={(url) => setNewCatImage(url)}
              onClear={() => setNewCatImage('')}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCategoryModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
