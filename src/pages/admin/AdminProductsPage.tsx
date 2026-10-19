import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectAllProducts,
  selectAllCategories,
  deleteProduct,
  setProducts,
} from '../../store/slices/productSlice';
import { addNotification, showConfirmation } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  ExternalLink,
  Filter,
} from 'lucide-react';

export const AdminProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectAllProducts);
  const categories = useAppSelector(selectAllCategories);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getAdminProducts()
      .then((serverProducts) => {
        if (!active) return;
        dispatch(setProducts(serverProducts));
        setLoadError(null);
        setProductsLoaded(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load products');
        setProductsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [dispatch]);

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCat === 'all' || p.category.toLowerCase() === selectedCat.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: string, name: string) => {
    dispatch(
      showConfirmation({
        title: 'Archive Product?',
        message: `Are you sure you want to archive product "${name}"? It will no longer appear in the storefront catalog.`,
        confirmText: 'Archive Product',
        cancelText: 'Cancel',
        destructive: true,
        onConfirm: () => executeArchive(id, name),
      })
    );
  };

  const executeArchive = async (id: string, name: string) => {
    try {
      await api.deleteProduct(id);
      dispatch(deleteProduct(id));
      dispatch(
        addNotification({
          type: 'success',
          title: 'Product Archived',
          message: `Product ${name} has been archived from catalog.`,
          duration: 3000,
        })
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to archive product';
      dispatch(
        addNotification({
          type: 'error',
          title: 'Archive Failed',
          message,
          duration: 4000,
        })
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Product Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your store's luxury items, pricing, SKUs, and stock authority.
          </p>
        </div>

        <Link
          to="/admin/products/create"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, SKU, brand..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer w-full sm:w-auto"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Inventory</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {!productsLoaded ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">Loading products...</td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-rose-600">{loadError}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">No products found.</td>
                </tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="p-4 flex items-center gap-3">
                    <img
                      src={p.mainImage}
                      alt={p.name}
                      className="w-12 h-12 object-contain rounded-xl bg-slate-50 border p-1"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/product/${p.slug}`}
                        target="_blank"
                        className="font-bold text-slate-900 hover:text-blue-600 line-clamp-1 flex items-center gap-1"
                      >
                        <span>{p.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span className="text-[10px] text-slate-400">{p.brand}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-500 font-semibold">{p.sku}</td>
                  <td className="p-4 text-slate-700">{p.category}</td>
                  <td className="p-4 font-bold text-slate-900 tabular-nums">
                    ${p.price.toFixed(2)}
                    {p.compareAtPrice && p.compareAtPrice > p.price && (
                      <span className="block text-[10px] text-slate-400 line-through">
                        ${p.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold tabular-nums text-xs ${
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
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] uppercase">
                      {p.isFeatured ? 'Featured' : p.isBestSeller ? 'Best Seller' : 'Published'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Edit Product"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Delete Product"
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
    </div>
  );
};
