import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectAllProducts, setProducts, updateProduct } from '../../store/slices/productSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { Product } from '../../types';
import { Archive, Plus, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const AdminInventoryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectAllProducts);

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getAdminProducts()
      .then((serverProducts) => {
        if (!active) return;
        dispatch(setProducts(serverProducts));
        setProductsLoaded(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load products');
        dispatch(setProducts([]));
        setProductsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [dispatch]);

  const handleAdjustStock = async (product: Product) => {
    const updated: Product = {
      ...product,
      inventory: Number(newStock),
    };

    try {
      await api.updateProduct(product.id, { inventory: Number(newStock) });
      dispatch(updateProduct(updated));
      dispatch(
        addNotification({
          type: 'success',
          title: 'Inventory Stock Adjusted',
          message: `${product.name} stock level updated to ${newStock} units.`,
          duration: 3000,
        })
      );
      setAdjustingId(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update inventory';
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
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Inventory Authority & Stock Control
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Server-authoritative stock levels across variants and products. Changes immediately affect checkout availability.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Product Name</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4">Current Stock</th>
                <th className="p-4">Stock Status</th>
                <th className="p-4 text-right">Quick Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {!productsLoaded ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Loading inventory...</td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-rose-600">{loadError}</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No inventory records found.</td>
                </tr>
              ) : products.map((p) => {
                const isAdjusting = adjustingId === p.id;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-900">{p.name}</td>
                    <td className="p-4 font-mono text-slate-500">{p.sku}</td>
                    <td className="p-4 text-slate-700">{p.category}</td>
                    <td className="p-4 font-bold text-slate-900 tabular-nums text-sm">
                      {p.inventory} units
                    </td>
                    <td className="p-4">
                      {p.inventory > 10 ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs">
                          In Stock
                        </span>
                      ) : p.inventory > 0 ? (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg text-xs flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Low Stock ({p.inventory})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg text-xs">
                          Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {isAdjusting ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="0"
                            value={newStock}
                            onChange={(e) => setNewStock(Number(e.target.value))}
                            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                          />
                          <button
                            onClick={() => handleAdjustStock(p)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setAdjustingId(null)}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAdjustingId(p.id);
                            setNewStock(p.inventory);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Adjust Count
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
