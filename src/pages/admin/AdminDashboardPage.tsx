import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { selectAllProducts } from '../../store/slices/productSlice';
import { selectAllOrders } from '../../store/slices/orderSlice';
import { api } from '../../services/api';
import {
  DollarSign,
  ShoppingBag,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Plus,
  Star,
  Users,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const products = useAppSelector(selectAllProducts);
  const orders = useAppSelector(selectAllOrders);

  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.getDashboardStats().then((data) => {
      if (data) setStats(data);
    });
  }, []);

  const totalRevenue = stats?.totalRevenue ?? orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.total : 0), 0);
  const totalStock = stats?.totalStock ?? products.reduce((sum, p) => sum + p.inventory, 0);
  const lowStockProducts = products.filter((p) => p.inventory < 10);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Executive Operations Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          High-level operational overview across inventory, sales, customer fulfillment, and database health.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="font-display font-black text-3xl text-slate-900 tabular-nums">
            ${totalRevenue.toFixed(2)}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+24.6% vs previous cycle</span>
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="w-5 h-5 text-blue-600" />
          </div>
          <p className="font-display font-black text-3xl text-slate-900 tabular-nums">
            {orders.length}
          </p>
          <p className="text-[11px] text-slate-500">
            {orders.filter((o) => o.orderStatus === 'Confirmed' || o.orderStatus === 'Processing').length} awaiting fulfillment
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Catalog Inventory</span>
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <p className="font-display font-black text-3xl text-slate-900 tabular-nums">
            {products.length} Items
          </p>
          <p className="text-[11px] text-slate-500">{totalStock} total units in stock</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Customers</span>
            <Users className="w-5 h-5 text-pink-600" />
          </div>
          <p className="font-display font-black text-3xl text-slate-900 tabular-nums">
            {stats?.userCount || 128}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">100% Verified Profiles</p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/admin/products/create"
          className="p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-between transition-colors shadow-md shadow-blue-500/20"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Product
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <Link
          to="/admin/orders"
          className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-800 font-semibold text-xs flex items-center justify-between transition-colors shadow-xs"
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            Fulfill Orders
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>

        <Link
          to="/admin/inventory"
          className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-800 font-semibold text-xs flex items-center justify-between transition-colors shadow-xs"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Stock Adjustments
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>

        <Link
          to="/admin/banners"
          className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-800 font-semibold text-xs flex items-center justify-between transition-colors shadow-xs"
        >
          <span className="flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-600" />
            Edit Banners & CMS
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>

      {/* Two Column Section: Recent Orders & Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Recent Orders (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-slate-900">
              Live Order Fulfillment Queue
            </h3>
            <Link
              to="/admin/orders"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Order #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      <Link to={`/admin/orders/${o.id}`} className="hover:text-blue-600 underline">
                        {o.orderNumber}
                      </Link>
                    </td>
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

        {/* Right: Low Stock Warnings (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Low Inventory Alerts</span>
            </h3>
            <Link
              to="/admin/inventory"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Restock
            </Link>
          </div>

          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                All catalog items are adequately stocked.
              </p>
            ) : (
              lowStockProducts.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">SKU: {p.sku}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-black rounded-md tabular-nums shrink-0">
                    {p.inventory} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
