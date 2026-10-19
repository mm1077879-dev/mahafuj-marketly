import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  setCategories,
} from '../../store/slices/productSlice';
import { addNotification, showConfirmation } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { Category } from '../../types';
import { Layers, Plus, Trash2, Pencil } from 'lucide-react';
import { ImageUpload } from '../../components/admin/ImageUpload';

export const AdminCategoriesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectAllCategories);

  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    let active = true;
    api.getAdminCategories()
      .then((serverCategories) => {
        if (!active) return;
        dispatch(setCategories(serverCategories));
        setLoadError(null);
        setCategoriesLoaded(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load categories');
        setCategoriesLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    try {
      if (editingCategory) {
        const saved = await api.updateCategory(editingCategory.id, {
          name: name.trim(),
          slug,
          image: image.trim(),
        });
        dispatch(updateCategory(saved));
        dispatch(
          addNotification({
            type: 'success',
            title: 'Category Updated',
            message: `Saved changes to "${saved.name}".`,
            duration: 3000,
          })
        );
      } else {
        const created = await api.createCategory({
          id: 'cat_' + Date.now(),
          name: name.trim(),
          slug,
          image: image.trim() || 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=400',
          itemCount: 0,
          featured: true,
        });
        dispatch(addCategory(created));
        dispatch(
          addNotification({
            type: 'success',
            title: 'Category Created',
            message: `Category "${created.name}" is now live across storefront navigation.`,
            duration: 3000,
          })
        );
      }
      setName('');
      setImage('');
      setEditingCategory(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save category';
      dispatch(
        addNotification({
          type: 'error',
          title: 'Error',
          message,
          duration: 3000,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setImage(category.image || '');
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setName('');
    setImage('');
  };

  const handleDelete = (id: string, catName: string) => {
    dispatch(
      showConfirmation({
        title: 'Delete Category?',
        message: `Are you sure you want to delete category "${catName}"? This will remove it from storefront navigation and shop filters.`,
        confirmText: 'Delete Category',
        cancelText: 'Cancel',
        destructive: true,
        onConfirm: () => executeDelete(id, catName),
      })
    );
  };

  const executeDelete = async (id: string, catName: string) => {
    try {
      await api.deleteCategory(id);
      dispatch(deleteCategory(id));
      dispatch(
        addNotification({
          type: 'info',
          title: 'Category Removed',
          message: `Removed category "${catName}".`,
          duration: 2500,
        })
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to delete category';
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
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Storefront Categories
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Categories are server-managed. Changes update storefront navigation and shop filters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Create Category Form (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>{editingCategory ? 'Edit Category' : 'Create Category'}</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Footwear, Precision Watches"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <ImageUpload
                label="Category Image"
                aspect="square"
                value={image}
                onChange={(url) => setImage(url)}
                onClear={() => setImage('')}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !categoriesLoaded}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {loading ? 'Saving...' : editingCategory ? 'Save Category' : 'Create Category'}
            </button>
            {editingCategory && (
              <button
                type="button"
                onClick={cancelEditing}
                disabled={loading}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* Category List (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            {categoriesLoaded ? `Active Categories (${categories.length})` : 'Loading Categories...'}
          </h2>

          {loadError ? (
            <p className="p-6 text-center text-sm text-rose-600">{loadError}</p>
          ) : categoriesLoaded ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.length === 0 ? (
                <p className="sm:col-span-2 p-6 text-center text-sm text-slate-500">No categories found.</p>
              ) : categories.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3 hover:border-blue-600/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-white border p-1 overflow-hidden shrink-0">
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-full h-full object-cover rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{c.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">/{c.slug}</p>
                    <span className="text-[11px] text-blue-600 font-medium">
                      {c.itemCount.toLocaleString()} items
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => startEditing(c)}
                  className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white transition-colors"
                  title="Edit category"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-slate-500">Loading categories...</p>
          )}
        </div>
      </div>
    </div>
  );
};
