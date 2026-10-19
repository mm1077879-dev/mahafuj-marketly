import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectAllOrders, updateOrderStatus } from '../../store/slices/orderSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { OrderStatus } from '../../types';
import { ShoppingBag, Search, ExternalLink, Filter } from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectAllOrders);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.phone.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || o.orderStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: string, newStatus: OrderStatus) => {
    try {
      await api.updateOrderStatus(id, newStatus);
      dispatch(updateOrderStatus({ orderId: id, status: newStatus }));
      dispatch(
        addNotification({
          type: 'success',
          title: 'Status Updated',
          message: `Order transitioned to ${newStatus}.`,
          duration: 3000,
        })
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update order status';
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
          Customer Orders & Fulfillment
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Monitor incoming purchases, courier handovers, and transition order lifecycle states.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer name, phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Destination</th>
                <th className="p-4">Method</th>
                <th className="p-4">Lifecycle State</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-mono font-bold text-slate-900">
                    <Link to={`/admin/orders/${ord.id}`} className="hover:text-blue-600 underline">
                      {ord.orderNumber}
                    </Link>
                  </td>
                  <td className="p-4 text-slate-400">
                    {new Date(ord.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{ord.customer.name}</p>
                    <span className="text-[10px] text-slate-400">{ord.customer.phone}</span>
                  </td>
                  <td className="p-4 text-slate-700">
                    {ord.shippingAddress.upazila}, {ord.shippingAddress.district}
                  </td>
                  <td className="p-4 uppercase font-semibold text-blue-600">
                    {ord.paymentMethod}
                  </td>
                  <td className="p-4">
                    <select
                      value={ord.orderStatus}
                      onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                      className="px-2.5 py-1 bg-blue-50/80 border border-blue-200 text-blue-700 font-bold text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                  <td className="p-4 text-right font-black text-slate-900 tabular-nums">
                    ${ord.total.toFixed(2)}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      to={`/admin/orders/${ord.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      <span>Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
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
