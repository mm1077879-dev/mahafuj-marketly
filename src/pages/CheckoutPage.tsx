import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartShippingFee,
  selectCartTotal,
  clearCart,
} from '../store/slices/cartSlice';
import { createOrder } from '../store/slices/orderSlice';
import { selectCurrentUser, selectSavedAddresses, addAddress } from '../store/slices/authSlice';
import { addNotification } from '../store/slices/uiSlice';
import { BangladeshAddress, PaymentMethod, Order } from '../types';
import { api } from '../services/api';
import {
  usePreferences,
  getPreviousShippingAddress,
  setPreviousShippingAddress,
  trackInteraction,
} from '../services/preferences';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  ExternalLink,
  Info,
  MapPin,
  Clock,
  Plus,
} from 'lucide-react';
import { Dialog } from '../components/common/Dialog';
import {
  BANGLADESH_DIVISIONS,
  getDistrictOptionsForDivision,
  getUnionOptionsForUpazila,
  getUpazilaOptionsForDistrict,
  getValidatedAddressDefaults,
} from '../data/bangladeshLocations';

const bangladeshDivisions = BANGLADESH_DIVISIONS;

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const shippingFee = useAppSelector(selectCartShippingFee);
  const total = useAppSelector(selectCartTotal);
  const couponCode = useAppSelector((state) => state.cart.couponCode);
  const discountAmount = useAppSelector((state) => state.cart.discountAmount);
  const currentUser = useAppSelector(selectCurrentUser);
  const savedAddresses = useAppSelector(selectSavedAddresses);
  const { formatPrice } = usePreferences();

  // Retrieve previously used valid address or default
  const prevAddress = getPreviousShippingAddress();
  const initialAddress: BangladeshAddress = prevAddress || savedAddresses[0] || getValidatedAddressDefaults({
    fullName: currentUser?.name || '',
    phone: currentUser?.phone || '+880 1',
    email: currentUser?.email || '',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Savar',
    union: 'Savar',
    streetAddress: '',
    postalCode: '1212',
  });

  const [address, setAddress] = useState<BangladeshAddress>(initialAddress);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | 'custom'>(
    prevAddress ? 'custom' : savedAddresses.length > 0 ? 0 : 'custom'
  );
  const [saveToProfile, setSaveToProfile] = useState<boolean>(true);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<any>({
    bkash: { enabled: false, sandbox: true, isConfigured: false },
    nagad: { enabled: false, sandbox: true, isConfigured: false },
    card: { enabled: false, isConfigured: false },
    cod: { enabled: true },
  });

  // Modal state for hosted gateway checkout
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Secure Checkout — Marketly Luxury E-Commerce';
    api.getPaymentConfig()
      .then((cfg: any) => {
        if (cfg) {
          setPaymentConfig(cfg);
          if (!cfg.bkash?.enabled && paymentMethod === 'bkash') {
            setPaymentMethod('cod');
          }
        }
      })
      .catch(() => {
        dispatch(
          addNotification({
            type: 'warning',
            title: 'Payment options unavailable',
            message: 'Online payment methods could not be loaded. Cash on Delivery remains available.',
            duration: 4000,
          })
        );
      });
  }, [dispatch]);

  const currentDistricts = getDistrictOptionsForDivision(address.division);
  const currentUpazilas = getUpazilaOptionsForDistrict(address.division, address.district);
  const currentUnions = getUnionOptionsForUpazila(address.division, address.district, address.upazila);

  const handleDivisionChange = (newDivision: string) => {
    const districts = getDistrictOptionsForDivision(newDivision);
    const nextDistrict = districts[0] || '';
    const upazilas = getUpazilaOptionsForDistrict(newDivision, nextDistrict);
    const nextUpazila = upazilas[0] || '';
    const unions = getUnionOptionsForUpazila(newDivision, nextDistrict, nextUpazila);

    setAddress((prev) => ({
      ...prev,
      division: newDivision,
      district: nextDistrict,
      upazila: nextUpazila,
      union: unions[0] || '',
    }));
  };

  const handleDistrictChange = (newDistrict: string) => {
    const upazilas = getUpazilaOptionsForDistrict(address.division, newDistrict);
    const nextUpazila = upazilas[0] || '';
    const unions = getUnionOptionsForUpazila(address.division, newDistrict, nextUpazila);

    setAddress((prev) => ({
      ...prev,
      district: newDistrict,
      upazila: nextUpazila,
      union: unions[0] || '',
    }));
  };

  const handleUpazilaChange = (newUpazila: string) => {
    const unions = getUnionOptionsForUpazila(address.division, address.district, newUpazila);

    setAddress((prev) => ({
      ...prev,
      upazila: newUpazila,
      union: unions[0] || '',
    }));
  };

  const handleSelectSavedAddress = (idx: number) => {
    setSelectedAddressIndex(idx);
    const chosen = savedAddresses[idx];
    if (chosen) {
      setAddress({ ...chosen });
    }
  };

  const handleSelectPrevAddress = () => {
    if (prevAddress) {
      setSelectedAddressIndex('custom');
      setAddress({ ...prevAddress });
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.fullName || !address.phone || !address.streetAddress) {
      dispatch(
        addNotification({
          type: 'warning',
          title: 'Missing Address',
          message: 'Please complete all required shipping address fields.',
          duration: 3500,
        })
      );
      return;
    }

    if (cartItems.length === 0) {
      navigate('/shop');
      return;
    }

    if (paymentMethod === 'bkash' && !paymentConfig.bkash?.enabled) {
      dispatch(
        addNotification({
          type: 'warning',
          title: 'bKash unavailable',
          message: 'Hosted bKash checkout is not configured. Choose Cash on Delivery or try again later.',
          duration: 4000,
        })
      );
      return;
    }
    if (paymentMethod === 'cod' && paymentConfig.cod?.enabled === false) {
      dispatch(
        addNotification({
          type: 'warning',
          title: 'Cash on Delivery unavailable',
          message: 'Cash on Delivery is currently disabled. Please try again later.',
          duration: 4000,
        })
      );
      return;
    }

    setIsProcessing(true);

    try {
      const orderPayload = {
        customer: {
          userId: currentUser?.id,
          name: address.fullName,
          email: address.email,
          phone: address.phone,
        },
        shippingAddress: address,
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          selectedAttributes: item.selectedAttributes,
        })),
        couponCode: couponCode || undefined,
        paymentMethod,
      };

      // Call authoritative backend API
      const createdOrder = await api.createOrder(orderPayload);

      // 1. Remember this shipping address for future checkouts (Section 10)
      setPreviousShippingAddress(address);

      // 2. Track purchase interaction for personalization
      cartItems.forEach((it) => {
        trackInteraction('purchase', { productId: it.productId });
      });

      // 3. Save to profile if requested and user is authenticated
      if (saveToProfile && currentUser) {
        dispatch(addAddress(address));
      }

      // Record in local Redux store and clear cart
      dispatch(createOrder(createdOrder));
      dispatch(clearCart());
      setIsProcessing(false);

      if (paymentMethod === 'cod') {
        dispatch(
          addNotification({
            type: 'success',
            title: 'Order Placed (Cash on Delivery)',
            message: `Order #${createdOrder.orderNumber} is confirmed. Cash collection will occur upon delivery.`,
            duration: 5000,
          })
        );
        navigate(`/order-success/${createdOrder.orderNumber}`);
        return;
      }

      setPendingOrder(createdOrder);
      setPaymentError(null);
      setGatewayUrl(null);
      try {
        const initRes = await api.initiatePayment({
          orderId: createdOrder.orderNumber,
          paymentMethod,
          customerEmail: address.email,
          customerPhone: address.phone,
        });
        if (!initRes.gatewayUrl) {
          throw new Error('The payment provider did not return a hosted checkout link.');
        }
        setGatewayUrl(initRes.gatewayUrl);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Hosted payment could not be started.';
        setPaymentError(`${message} Your order remains unpaid.`);
      }
    } catch (err: any) {
      setIsProcessing(false);
      dispatch(
        addNotification({
          type: 'error',
          title: 'Order Failed',
          message: err.message || 'Failed to place order. Please try again.',
          duration: 4000,
        })
      );
    }
  };

  const handleSkipToOrderSummary = () => {
    if (pendingOrder) {
      const orderNum = pendingOrder.orderNumber;
      setPendingOrder(null);
      dispatch(
        addNotification({
          type: 'info',
          title: 'Order Saved as Pending Payment',
          message: `Order #${orderNum} is registered. You can verify payment anytime in Order Tracking.`,
          duration: 4000,
        })
      );
      navigate(`/order-success/${orderNum}`);
    }
  };

  const handleCancelPaymentSession = async () => {
    if (pendingOrder) {
      const orderNum = pendingOrder.orderNumber;
      try {
        await api.cancelPayment(orderNum, {
          email: pendingOrder.shippingAddress.email,
          phone: pendingOrder.shippingAddress.phone,
        });
        dispatch(
          addNotification({
            type: 'info',
            title: 'Payment Session Cancelled',
            message: `Payment session for order #${orderNum} was cancelled. Reserved inventory was released.`,
            duration: 4000,
          })
        );
        setPendingOrder(null);
        setGatewayUrl(null);
      } catch (err: any) {
        setPaymentError(err.message || 'Could not cancel the pending order.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Page Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Secure Checkout
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review your order, verify your delivery address, and select payment method.
        </p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Delivery Address & Payment Method (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* 1. Customer Information & Bangladesh Structured Address */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Shipping & Delivery Address
                </h2>
              </div>
              {prevAddress && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-100">
                  <Clock className="w-3 h-3" />
                  Address Preselected
                </span>
              )}
            </div>

            {/* Saved / Previous Addresses Selector Card */}
            {(savedAddresses.length > 0 || prevAddress) && (
              <div className="space-y-3 pb-4 border-b border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Delivery Address
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {prevAddress && (
                    <div
                      onClick={handleSelectPrevAddress}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-xs ${
                        selectedAddressIndex === 'custom' && address.streetAddress === prevAddress.streetAddress
                          ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{prevAddress.fullName}</span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          Last Used
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] truncate">
                        {prevAddress.streetAddress}, {prevAddress.upazila}, {prevAddress.division}
                      </p>
                    </div>
                  )}

                  {savedAddresses.map((addr, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSavedAddress(idx)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-xs ${
                        selectedAddressIndex === idx
                          ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{addr.fullName}</span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                          {addr.division}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] truncate">
                        {addr.streetAddress}, {addr.upazila}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Address Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Active Phone Number (Courier SMS / Call) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+880 1XXXXXXXXX"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Order Confirmation & Digital Receipt) *
                </label>
                <input
                  type="email"
                  required
                  value={address.email}
                  onChange={(e) => setAddress({ ...address, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Bangladesh Structured Geographic Hierarchy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Division *
                </label>
                <select
                  value={address.division}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  {bangladeshDivisions.map((div) => (
                    <option key={div} value={div}>
                      {div} Division
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  District / Zila *
                </label>
                <select
                  value={address.district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  {currentDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist} District
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upazila / Thana *
                </label>
                <select
                  value={address.upazila}
                  onChange={(e) => handleUpazilaChange(e.target.value)}
                  disabled={!address.district || currentUpazilas.length === 0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {currentUpazilas.length > 0 ? (
                    currentUpazilas.map((upz) => (
                      <option key={upz} value={upz}>
                        {upz}
                      </option>
                    ))
                  ) : (
                    <option value="">Select a district first</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Union / Ward / Area
                </label>
                <select
                  value={address.union || ''}
                  onChange={(e) => setAddress({ ...address, union: e.target.value })}
                  disabled={!address.upazila || currentUnions.length === 0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {currentUnions.length > 0 ? (
                    currentUnions.map((union) => (
                      <option key={union} value={union}>
                        {union}
                      </option>
                    ))
                  ) : (
                    <option value="">Select an upazila first</option>
                  )}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address & House / Apartment Details *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="House number, Road number, Flat/Floor details, Landmark"
                  value={address.streetAddress}
                  onChange={(e) => setAddress({ ...address, streetAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Save Address Checkbox */}
              {currentUser && (
                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveToProfile"
                    checked={saveToProfile}
                    onChange={(e) => setSaveToProfile(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="saveToProfile" className="text-xs text-slate-600 cursor-pointer">
                    Save this address to my profile for future orders
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* 2. Payment Architecture */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Payment Method
                </h2>
                <p className="text-xs text-slate-500">
                  Orders are authenticated with separate order creation and server-verified payment statuses.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cash on Delivery */}
              <div
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-900">Cash on Delivery</h4>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Pay when order arrives</p>
                  </div>
                </div>
                {paymentMethod === 'cod' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
              </div>

              {/* bKash */}
              <div
                aria-disabled={!paymentConfig.bkash?.enabled}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  paymentConfig.bkash?.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                } ${
                  paymentMethod === 'bkash'
                    ? 'border-pink-600 bg-pink-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => {
                  if (paymentConfig.bkash?.enabled) setPaymentMethod('bkash');
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-600 text-white font-bold flex items-center justify-center text-xs">
                    bK
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-900">bKash Payment</h4>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-100 text-pink-800">
                        {paymentConfig.bkash?.enabled ? (paymentConfig.bkash.sandbox ? 'Sandbox' : 'Hosted Gateway') : 'Unavailable'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Secure hosted checkout with server-side verification</p>
                  </div>
                </div>
                {paymentMethod === 'bkash' && (
                  <CheckCircle2 className="w-5 h-5 text-pink-600" />
                )}
              </div>

              {/* Nagad */}
              <div
                aria-disabled="true"
                className="p-4 rounded-2xl border-2 flex items-center justify-between cursor-not-allowed opacity-60 border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                    NG
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-900">Nagad Payment</h4>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                        Unavailable
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Awaiting verified merchant API integration</p>
                  </div>
                </div>
              </div>

              {/* Credit / Debit Card */}
              <div
                aria-disabled="true"
                className="p-4 rounded-2xl border-2 flex items-center justify-between cursor-not-allowed opacity-60 border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Visa / Mastercard</h4>
                    <p className="text-[11px] text-slate-500">No hosted card processor is configured</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6 sticky top-24">
            <h3 className="font-display font-bold text-lg text-slate-900 pb-3 border-b border-slate-100">
              Order Summary ({cartItems.length} items)
            </h3>

            {/* Cart Items List */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100">
              {cartItems.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-contain rounded-xl bg-slate-50 border p-1 shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-slate-900 line-clamp-1">{item.name}</p>
                      <p className="text-slate-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900 tabular-nums shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon Discount ({couponCode})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping Fee (Bangladesh Courier)</span>
                <span className="font-semibold text-slate-900">
                  {shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline text-base font-bold text-slate-900">
                <span>Total Amount</span>
                <span className="font-display font-extrabold text-xl text-blue-600">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing || cartItems.length === 0}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-98"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Order...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Place Order ({formatPrice(total)})</span>
                </>
              )}
            </button>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2 text-slate-500 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>TLS 256-bit encryption. Safe checkout & authentic invoice guarantee.</span>
            </div>
          </div>
        </div>
      </form>

      {/* Hosted Gateway Checkout Modal */}
      {pendingOrder && (
        <Dialog
          isOpen={true}
          onClose={handleSkipToOrderSummary}
          title={`Continue ${pendingOrder.paymentMethod.toUpperCase()} Checkout`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Order <strong className="font-mono text-slate-900">#{pendingOrder.orderNumber}</strong> is pending payment. It will only be confirmed after the provider verifies payment with our server.
            </p>

            {gatewayUrl && (
              <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl space-y-2">
                <p className="text-[11px] text-pink-700">
                  Continue in the hosted {pendingOrder.paymentMethod.toUpperCase()} checkout:
                </p>
                <a
                  href={gatewayUrl}
                  className="w-full py-2.5 px-4 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open {pendingOrder.paymentMethod.toUpperCase()} Payment Gateway</span>
                </a>
              </div>
            )}

            {!gatewayUrl && !paymentError && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Waiting for the server to establish a hosted provider session. No manual transaction ID can confirm payment.</span>
              </div>
            )}

            {paymentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelPaymentSession}
                className="text-xs text-rose-600 hover:text-rose-800 underline cursor-pointer"
              >
                Cancel Order & Release Stock
              </button>
              <button
                type="button"
                onClick={handleSkipToOrderSummary}
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Pay later
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default CheckoutPage;
