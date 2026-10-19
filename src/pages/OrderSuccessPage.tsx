import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectOrderByNumber } from '../store/slices/orderSlice';
import { api } from '../services/api';
import { Order } from '../types';
import { usePreferences } from '../services/preferences';
import {
  CheckCircle2,
  Package,
  MapPin,
  Truck,
  ArrowRight,
  Home,
  AlertCircle,
  Loader2,
  Clock,
  Calendar,
  CreditCard,
} from 'lucide-react';

export const OrderSuccessPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const reduxOrder = useAppSelector(selectOrderByNumber(orderNumber || ''));
  const { formatPrice } = usePreferences();

  const [order, setOrder] = useState<Order | null>(reduxOrder || null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    document.title = `Order Confirmed #${orderNumber} — Marketly Luxury`;
    if (reduxOrder) {
      setOrder(reduxOrder);
      api.getOrderByNumber(orderNumber || reduxOrder.orderNumber, {
        email: reduxOrder.shippingAddress.email,
        phone: reduxOrder.shippingAddress.phone,
      })
        .then((remote) => {
          if (remote) setOrder(remote);
        })
        .catch((error: unknown) => {
          setPaymentError(error instanceof Error ? error.message : 'Unable to refresh order payment status.');
        });
    }
  }, [reduxOrder, orderNumber]);

  const handleOrderLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderNumber) return;

    setIsLookingUp(true);
    setLookupError(null);
    try {
      const verifiedOrder = await api.getOrderByNumber(orderNumber, {
        email: lookupEmail,
        phone: lookupPhone,
      });
      if (!verifiedOrder) {
        setLookupError('Order not found or the contact details did not match.');
        return;
      }
      setOrder(verifiedOrder);
    } catch (error: unknown) {
      setLookupError(error instanceof Error ? error.message : 'Could not verify this order.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleResumePayment = async () => {
    if (!order || order.paymentMethod !== 'bkash') return;
    setIsStartingPayment(true);
    setPaymentError(null);
    try {
      const result = await api.initiatePayment({
        orderId: order.orderNumber,
        paymentMethod: 'bkash',
        customerEmail: order.shippingAddress.email,
        customerPhone: order.shippingAddress.phone,
      });
      if (!result.gatewayUrl) {
        throw new Error('The payment provider did not return a hosted checkout link.');
      }
      window.location.assign(result.gatewayUrl);
    } catch (error: unknown) {
      setPaymentError(error instanceof Error ? error.message : 'Unable to resume hosted payment.');
    } finally {
      setIsStartingPayment(false);
    }
  };

  const isPaid = order?.paymentStatus === 'Paid';
  const isCod = order?.paymentMethod === 'cod';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* Status Headline Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 text-center shadow-xs space-y-4">
        <div
          className={`w-18 h-18 rounded-full flex items-center justify-center mx-auto ${
            isPaid
              ? 'bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50'
              : isCod
              ? 'bg-blue-50 text-blue-600 ring-8 ring-blue-50/50'
              : 'bg-amber-50 text-amber-600 ring-8 ring-amber-50/50'
          }`}
        >
          {isPaid ? (
            <CheckCircle2 className="w-10 h-10" />
          ) : isCod ? (
            <Truck className="w-10 h-10" />
          ) : (
            <Clock className="w-10 h-10" />
          )}
        </div>

        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          {!order
            ? 'Verify Your Order'
            : isPaid
            ? 'Order Confirmed & Payment Verified!'
            : isCod
            ? 'Order Confirmed (Cash on Delivery)'
            : 'Order Registered (Pending Payment)'}
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          {!order ? (
            <>Enter the email and phone number used at checkout to securely view this order.</>
          ) : isPaid ? (
            <>
              Thank you! Your payment for order{' '}
              <strong className="text-slate-900 font-mono">#{orderNumber}</strong> has been verified.
              Our fulfillment center is preparing your dispatch.
            </>
          ) : isCod ? (
            <>
              Your order <strong className="text-slate-900 font-mono">#{orderNumber}</strong> has been confirmed.
              Cash collection of{' '}
              <strong className="text-slate-900 font-mono">
                {order ? formatPrice(order.total) : `$${orderNumber}`}
              </strong>{' '}
              will take place upon courier arrival.
            </>
          ) : (
            <>
              Order <strong className="text-slate-900 font-mono">#{orderNumber}</strong> has been registered.
              To confirm your order, please verify your {order?.paymentMethod.toUpperCase()} transaction below.
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <Link
            to={`/tracking?order=${orderNumber}`}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span>Track Order Timeline</span>
          </Link>
          <Link
            to="/shop"
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>

      {!order && (
        <form
          onSubmit={handleOrderLookup}
          className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4"
        >
          <h2 className="font-display font-bold text-lg text-slate-900">Confirm your contact details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Email used for the order
              <input
                type="email"
                value={lookupEmail}
                onChange={(event) => setLookupEmail(event.target.value)}
                autoComplete="email"
                required
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Phone used for the order
              <input
                type="tel"
                value={lookupPhone}
                onChange={(event) => setLookupPhone(event.target.value)}
                autoComplete="tel"
                required
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </label>
          </div>
          {lookupError && (
            <p role="alert" className="text-sm text-rose-700">{lookupError}</p>
          )}
          <button
            type="submit"
            disabled={isLookingUp}
            className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl"
          >
            {isLookingUp ? 'Verifying…' : 'View order'}
          </button>
        </form>
      )}

      {/* Online Gateway Pending Payment */}
      {order && !isPaid && !isCod && (
        <div className="bg-white rounded-3xl border border-amber-200/80 p-6 sm:p-8 shadow-xs space-y-4 bg-gradient-to-br from-amber-50/40 via-white to-white">
          <div className="flex items-center gap-3 pb-3 border-b border-amber-100">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                {order.paymentMethod.toUpperCase()} Payment Pending
              </h3>
              <p className="text-xs text-slate-500">
                Payment is confirmed only after the payment provider verifies it with the server.
              </p>
            </div>
          </div>

          {paymentError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{paymentError}</span>
            </div>
          )}

          {order.paymentMethod === 'bkash' && (
            <button
              type="button"
              onClick={handleResumePayment}
              disabled={isStartingPayment}
              className="w-full sm:w-auto px-5 py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl inline-flex items-center justify-center gap-2"
            >
              {isStartingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {isStartingPayment ? 'Opening secure checkout...' : 'Continue secure bKash checkout'}
            </button>
          )}
        </div>
      )}

      {/* Snapshot Summary if loaded */}
      {order && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">Official Order Snapshot</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Order Ref: #{order.orderNumber}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Placed {new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Delivery & Payment Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery Destination */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                Shipping Destination (Bangladesh)
              </span>
              <p className="font-semibold text-slate-800">
                {order.shippingAddress.fullName} · {order.shippingAddress.phone}
              </p>
              <p>
                {order.shippingAddress.streetAddress}, {order.shippingAddress.upazila},{' '}
                {order.shippingAddress.district}, {order.shippingAddress.division}
              </p>
            </div>

            {/* Payment & Status */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Payment & Fulfillment
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Method:</span>
                <span className="font-bold text-slate-900 uppercase">{order.paymentMethod}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Payment Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    order.paymentStatus === 'Paid'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isCod
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {order.paymentStatus === 'Paid'
                    ? 'Paid & Verified'
                    : isCod
                    ? 'Payable Upon Delivery'
                    : 'Pending Verification'}
                </span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="divide-y divide-slate-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 object-contain rounded-xl bg-slate-50 border p-1"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <span className="font-semibold text-slate-900">{item.name}</span>
                    <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Total Amount */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-base font-bold text-slate-900">
            <span>{order.paymentStatus === 'Paid' ? 'Total Paid' : 'Total Payable'}</span>
            <span className="font-display font-extrabold text-xl text-blue-600 tabular-nums">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSuccessPage;
