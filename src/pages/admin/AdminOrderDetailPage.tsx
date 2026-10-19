import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectAllOrders, updateOrderStatus, updatePaymentState } from '../../store/slices/orderSlice';
import { addNotification, showConfirmation } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { OrderStatus } from '../../types';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Package,
  RotateCcw,
  Banknote,
  Loader2,
} from 'lucide-react';

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectAllOrders);

  const order = orders.find((o) => o.id === id || o.orderNumber === id);
  const [note, setNote] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('Customer return requested');

  if (!order) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border">
        <h2 className="text-lg font-bold text-slate-900">Order Not Found</h2>
        <Link to="/admin/orders" className="text-xs text-blue-600 underline mt-2 block">
          Return to Orders List
        </Link>
      </div>
    );
  }

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    try {
      await api.updateOrderStatus(order.id, newStatus, note);
      dispatch(updateOrderStatus({ orderId: order.id, status: newStatus, note }));
      dispatch(
        addNotification({
          type: 'success',
          title: 'Status Updated',
          message: `Order transitioned to ${newStatus}.`,
          duration: 3000,
        })
      );
      setNote('');
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

  const handleRecordCodCollection = () => {
    dispatch(
      showConfirmation({
        title: 'Record Cash Collection?',
        message: `Confirm collection of $${order.total.toFixed(2)} cash for order #${order.orderNumber}? This will mark the order as Paid.`,
        confirmText: 'Record Collection',
        cancelText: 'Cancel',
        destructive: false,
        onConfirm: executeCodCollection,
      })
    );
  };

  const executeCodCollection = async () => {
    setIsProcessingAction(true);
    try {
      await api.recordCodCollection({ orderId: order.id, amountCollected: order.total });
      dispatch(
        updatePaymentState({
          orderId: order.id,
          paymentStatus: 'Paid',
          note: `COD payment of $${order.total.toFixed(2)} collected upon delivery.`,
        })
      );
      dispatch(
        addNotification({
          type: 'success',
          title: 'Cash Collected',
          message: `Recorded COD payment of $${order.total.toFixed(2)}.`,
          duration: 4000,
        })
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record COD collection';
      dispatch(
        addNotification({
          type: 'error',
          title: 'Action Failed',
          message,
          duration: 4000,
        })
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleExecuteRefund = async () => {
    setIsProcessingAction(true);
    try {
      await api.refundPayment({
        orderId: order.id,
        amount: order.total,
        reason: refundReason,
      });
      dispatch(
        updatePaymentState({
          orderId: order.id,
          paymentStatus: 'Refunded',
          orderStatus: 'Refunded',
          note: `Refund of $${order.total.toFixed(2)} processed. Reason: ${refundReason}`,
        })
      );
      setShowRefundModal(false);
      dispatch(
        addNotification({
          type: 'success',
          title: 'Refund Processed',
          message: `Refund of $${order.total.toFixed(2)} recorded successfully.`,
          duration: 4000,
        })
      );
    } catch (err: any) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Refund Failed',
          message: err.message || 'Failed to process refund',
          duration: 4000,
        })
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-2xl text-slate-900">
                Order #{order.orderNumber}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                {order.orderStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleString()} · Payment: {order.paymentMethod.toUpperCase()} ({order.paymentStatus})
            </p>
          </div>
        </div>

        {/* Status transition dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Update State:</span>
          <select
            value={order.orderStatus}
            onChange={(e) => handleStatusUpdate(e.target.value as OrderStatus)}
            className="px-3 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs focus:outline-none cursor-pointer"
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items snapshot (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
              Purchased Items Snapshot ({order.items.length})
            </h2>

            <div className="divide-y divide-slate-100">
              {order.items.map((it, idx) => (
                <div key={idx} className="py-4 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-4">
                    <img
                      src={it.image}
                      alt={it.name}
                      className="w-14 h-14 object-contain rounded-xl bg-slate-50 border p-1"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900">{it.name}</h4>
                      <p className="text-xs text-slate-400 font-mono">SKU: {it.sku}</p>
                      {it.selectedAttributes && (
                        <p className="text-xs text-slate-500">
                          {Object.entries(it.selectedAttributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 tabular-nums">
                      ${(it.price * it.quantity).toFixed(2)}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {it.quantity} × ${it.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900 tabular-nums">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {order.shippingFee === 0 ? 'FREE' : `$${order.shippingFee.toFixed(2)}`}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                <span>Grand Total</span>
                <span className="text-blue-600 tabular-nums">${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Timeline Activity */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Order Milestone Timeline</span>
            </h2>

            <div className="space-y-3">
              {order.statusHistory?.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900">{h.status}</span>
                    <span className="text-slate-400 ml-2">
                      {new Date(h.timestamp).toLocaleString()}
                    </span>
                    {h.note && <p className="text-slate-600 mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Delivery Address (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Delivery Details (Bangladesh)</span>
            </h2>

            <div className="space-y-1 text-xs text-slate-600">
              <p className="font-bold text-slate-900 text-sm">{order.shippingAddress.fullName}</p>
              <p className="font-medium text-slate-800">Phone: {order.shippingAddress.phone}</p>
              <p className="text-slate-500">Email: {order.shippingAddress.email}</p>
              <div className="pt-2 border-t border-slate-100 mt-2 space-y-0.5">
                <p><strong>Division:</strong> {order.shippingAddress.division}</p>
                <p><strong>District:</strong> {order.shippingAddress.district}</p>
                <p><strong>Upazila / Thana:</strong> {order.shippingAddress.upazila}</p>
                {order.shippingAddress.union && <p><strong>Union/Ward:</strong> {order.shippingAddress.union}</p>}
                <p className="pt-1"><strong>Street Address:</strong> {order.shippingAddress.streetAddress}</p>
                <p><strong>Postal Code:</strong> {order.shippingAddress.postalCode || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3 text-xs">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Payment Authorization</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                order.paymentStatus === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : order.paymentStatus === 'Refunded'
                  ? 'bg-purple-100 text-purple-800'
                  : order.paymentStatus === 'Cancelled'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {order.paymentStatus}
              </span>
            </h2>
            <p><strong>Method:</strong> {order.paymentMethod.toUpperCase()}</p>
            <p><strong>Total Amount:</strong> ${order.total.toFixed(2)} BDT</p>

            <div className="p-3 rounded-xl bg-slate-50 text-slate-700 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Commercial checkout terms verified server-side.</span>
            </div>

            {/* Action Buttons for COD collection or Refund */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              {order.paymentMethod === 'cod' &&
                order.orderStatus === 'Delivered' &&
                order.paymentStatus !== 'Paid' &&
                order.paymentStatus !== 'Cancelled' && (
                <button
                  type="button"
                  onClick={handleRecordCodCollection}
                  disabled={isProcessingAction}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                  <span>Record Cash Collection (${order.total.toFixed(2)})</span>
                </button>
              )}

              {order.paymentStatus === 'Paid' && order.paymentMethod === 'bkash' && (
                <button
                  type="button"
                  onClick={() => setShowRefundModal(true)}
                  disabled={isProcessingAction}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors border border-rose-200 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Issue Payment Refund</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Issue Payment Refund</h3>
                <p className="text-xs text-slate-500">Order #{order.orderNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              You are about to issue a full refund of <strong className="text-slate-900">${order.total.toFixed(2)}</strong> to the customer. For bKash orders, this triggers the official tokenized checkout refund API.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700">Reason for Refund:</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-rose-500 text-xs"
                placeholder="Reason for return/refund..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                disabled={isProcessingAction}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRefund}
                disabled={isProcessingAction}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isProcessingAction && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm Refund</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
