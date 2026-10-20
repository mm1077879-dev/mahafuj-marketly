import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectCurrentUser,
  selectSavedAddresses,
  selectIsAdmin,
  loginAsCustomer,
  loginAsAdmin,
  logout,
  setUser,
  addAddress,
} from '../store/slices/authSlice';
import { selectAllOrders } from '../store/slices/orderSlice';
import { selectWishlistCount } from '../store/slices/wishlistSlice';
import { addNotification } from '../store/slices/uiSlice';
import { BangladeshAddress, Order } from '../types';
import { usePreferences } from '../services/preferences';
import { api } from '../services/api';
import { EmailActionPage } from '../components/auth/EmailActionPage';
import {
  User,
  Package,
  Heart,
  MapPin,
  ShieldCheck,
  LogOut,
  Plus,
  Clock,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  CreditCard,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { Dialog } from '../components/common/Dialog';
import {
  BANGLADESH_DIVISIONS,
  getDistrictOptionsForDivision,
  getUnionOptionsForUpazila,
  getUpazilaOptionsForDistrict,
  getValidatedAddressDefaults,
} from '../data/bangladeshLocations';

export const AccountPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppSelector(selectCurrentUser);
  const isAdmin = useAppSelector(selectIsAdmin);
  const addresses = useAppSelector(selectSavedAddresses);
  const orders = useAppSelector(selectAllOrders);
  const wishlistCount = useAppSelector(selectWishlistCount);
  const { formatPrice } = usePreferences();
  const [emailActionTokens, setEmailActionTokens] = useState(() => ({
    verificationToken:
      searchParams.get('verifyToken') ??
      new URLSearchParams(location.hash.slice(1)).get('verifyToken'),
    resetToken:
      searchParams.get('resetToken') ??
      new URLSearchParams(location.hash.slice(1)).get('resetToken'),
  }));

  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'security'>(
    initialTab === 'addresses' || initialTab === 'security' ? initialTab : 'orders'
  );

  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered'>('all');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  useEffect(() => {
    document.title = 'My Account & Order History — Marketly';
    const tabParam = searchParams.get('tab');
    if (tabParam === 'orders' || tabParam === 'addresses' || tabParam === 'security') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const fragmentParams = new URLSearchParams(location.hash.slice(1));
    const verificationToken =
      searchParams.get('verifyToken') ?? fragmentParams.get('verifyToken');
    const resetToken = searchParams.get('resetToken') ?? fragmentParams.get('resetToken');
    if (verificationToken || resetToken) {
      setEmailActionTokens({ verificationToken, resetToken });
    }
  }, [location.hash, searchParams]);

  const handleTabChange = (tab: 'orders' | 'addresses' | 'security') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddr, setNewAddr] = useState<BangladeshAddress>(
    getValidatedAddressDefaults({
      fullName: user?.name || '',
      phone: user?.phone || '+880 1',
      email: user?.email || '',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Savar',
      union: 'Savar',
      streetAddress: '',
      postalCode: '1212',
    })
  );

  const newAddrDistricts = getDistrictOptionsForDivision(newAddr.division);
  const newAddrUpazilas = getUpazilaOptionsForDistrict(newAddr.division, newAddr.district);
  const newAddrUnions = getUnionOptionsForUpazila(newAddr.division, newAddr.district, newAddr.upazila);

  const handleAddressSelectionChange = (
    field: 'division' | 'district' | 'upazila',
    value: string
  ) => {
    if (field === 'division') {
      const districts = getDistrictOptionsForDivision(value);
      const nextDistrict = districts[0] || '';
      const upazilas = getUpazilaOptionsForDistrict(value, nextDistrict);
      const nextUpazila = upazilas[0] || '';
      const unions = getUnionOptionsForUpazila(value, nextDistrict, nextUpazila);
      setNewAddr({ ...newAddr, division: value, district: nextDistrict, upazila: nextUpazila, union: unions[0] || '' });
      return;
    }

    if (field === 'district') {
      const upazilas = getUpazilaOptionsForDistrict(newAddr.division, value);
      const nextUpazila = upazilas[0] || '';
      const unions = getUnionOptionsForUpazila(newAddr.division, value, nextUpazila);
      setNewAddr({ ...newAddr, district: value, upazila: nextUpazila, union: unions[0] || '' });
      return;
    }

    const unions = getUnionOptionsForUpazila(newAddr.division, newAddr.district, value);
    setNewAddr({ ...newAddr, upazila: value, union: unions[0] || '' });
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.streetAddress || !newAddr.fullName) return;
    dispatch(addAddress(newAddr));
    setShowAddressModal(false);
    dispatch(
      addNotification({
        type: 'success',
        title: 'Address Added',
        message: 'New Bangladesh shipping address saved to your account.',
        duration: 3000,
      })
    );
  };

  // Filter orders by authenticated user and active status tab
  const userOrders = orders.filter((o) => {
    if (!isAdmin && user && o.customer.userId && o.customer.userId !== user.id && o.customer.email !== user.email) {
      return false;
    }
    if (orderFilter === 'pending' && o.orderStatus !== 'Pending Payment' && o.orderStatus !== 'Confirmed') {
      return false;
    }
    if (orderFilter === 'shipped' && o.orderStatus !== 'Shipped' && o.orderStatus !== 'Processing' && o.orderStatus !== 'Out for Delivery') {
      return false;
    }
    if (orderFilter === 'delivered' && o.orderStatus !== 'Delivered') {
      return false;
    }
    return true;
  });

  if (emailActionTokens.verificationToken || emailActionTokens.resetToken) {
    return <EmailActionPage {...emailActionTokens} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-blue-100 text-blue-700 font-display font-extrabold text-2xl flex items-center justify-center border-2 border-blue-200 shadow-xs overflow-hidden">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{user ? user.name[0] : 'G'}</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="font-display font-bold text-xl text-slate-900">
                {user ? user.name : 'Guest Customer'}
              </h2>
              {user && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                  {user.role === 'super_admin' ? 'Super Admin' : 'Customer'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {user ? user.email : 'Log in to sync your saved addresses and track purchases'}
            </p>
            {user?.phone && (
              <p className="text-[11px] font-mono text-slate-400">Phone: {user.phone}</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {!user ? (
            <>
              <button
                onClick={() => dispatch(loginAsCustomer())}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Sign In Demo Customer
              </button>
              <button
                onClick={() => dispatch(loginAsAdmin())}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Sign In Super Admin
              </button>
            </>
          ) : (
            <button
              onClick={() => dispatch(logout())}
              className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 sm:gap-8 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => handleTabChange('orders')}
          className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Order History ({userOrders.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('addresses')}
          className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'addresses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Saved Addresses ({addresses.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('security')}
          className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security & Authentication</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {(['all', 'pending', 'shipped', 'delivered'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setOrderFilter(filter)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors capitalize cursor-pointer ${
                  orderFilter === filter
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter === 'all' ? 'All Orders' : filter}
              </button>
            ))}
          </div>

          {userOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900">No orders found</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Explore our catalog to place your first luxury order with fast Bangladesh delivery.
              </p>
              <Link
                to="/shop"
                className="inline-flex px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-xs"
              >
                Explore Catalog
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {userOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        #{ord.orderNumber}
                      </span>
                      <span className="text-slate-400 ml-2">
                        Placed on {new Date(ord.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          ord.orderStatus === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-700'
                            : ord.orderStatus === 'Shipped'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {ord.orderStatus}
                      </span>
                      <button
                        onClick={() => setSelectedOrderDetail(ord)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                      <Link
                        to={`/tracking?order=${ord.orderNumber}`}
                        className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 text-xs"
                      >
                        <span>Track</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="divide-y divide-slate-100">
                    {ord.items.map((it, i) => (
                      <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-11 h-11 object-contain rounded-xl bg-slate-50 border p-1"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 line-clamp-1">{it.name}</span>
                            <span className="text-slate-400">Qty: {it.quantity}</span>
                          </div>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {formatPrice(it.price * it.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>
                      Payment: <strong className="text-slate-800 uppercase">{ord.paymentMethod}</strong> ({ord.paymentStatus})
                    </span>
                    <span className="text-sm font-black text-slate-900 tabular-nums">
                      Total: {formatPrice(ord.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderDetail && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedOrderDetail(null)}
          title={`Order #${selectedOrderDetail.orderNumber}`}
        >
          <div className="space-y-6">
            {/* Timeline */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Order Status Timeline
              </h4>
              <div className="space-y-3">
                {selectedOrderDetail.statusHistory?.map((sh, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{sh.status}</p>
                      {sh.note && <p className="text-slate-500 text-[11px]">{sh.note}</p>}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(sh.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Destination Snapshot */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1 text-slate-600">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                Shipping Snapshot (Immutable)
              </span>
              <p className="font-semibold text-slate-800">
                {selectedOrderDetail.shippingAddress.fullName} · {selectedOrderDetail.shippingAddress.phone}
              </p>
              <p>
                {selectedOrderDetail.shippingAddress.streetAddress},{' '}
                {selectedOrderDetail.shippingAddress.upazila},{' '}
                {selectedOrderDetail.shippingAddress.district},{' '}
                {selectedOrderDetail.shippingAddress.division}
              </p>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Items</h4>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                {selectedOrderDetail.items.map((it, i) => (
                  <div key={i} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <img src={it.image} alt={it.name} className="w-8 h-8 object-contain rounded bg-white border p-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">{it.name}</span>
                        <p className="text-[10px] text-slate-400">Qty: {it.quantity}</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatPrice(it.price * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="pt-3 border-t border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatPrice(selectedOrderDetail.subtotal)}</span>
              </div>
              {selectedOrderDetail.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(selectedOrderDetail.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping Fee</span>
                <span>{selectedOrderDetail.shippingFee === 0 ? 'FREE' : formatPrice(selectedOrderDetail.shippingFee)}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-sm text-slate-900">
                <span>Total Amount</span>
                <span className="text-blue-600">{formatPrice(selectedOrderDetail.total)}</span>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Address Management Tab */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">Delivery Addresses in Bangladesh</h3>
            <button
              onClick={() => setShowAddressModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Address</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{addr.fullName}</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {addr.division}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{addr.streetAddress}</p>
                <p className="text-xs text-slate-500">
                  {addr.upazila}, {addr.district} - {addr.postalCode || 'Postal Code'}
                </p>
                <p className="text-xs font-medium text-slate-700 pt-1">Phone: {addr.phone}</p>
              </div>
            ))}
          </div>

          {/* New Address Dialog Form */}
          {showAddressModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <h3 className="font-bold text-lg text-slate-900">Add Bangladesh Address</h3>
                <form onSubmit={handleSaveAddress} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newAddr.fullName}
                      onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={newAddr.phone}
                      onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Division
                      </label>
                      <select
                        value={newAddr.division}
                        onChange={(e) => handleAddressSelectionChange('division', e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl text-xs"
                      >
                        {getDistrictOptionsForDivision('Dhaka').length > 0 && (
                          <option value="">Select division</option>
                        )}
                        {BANGLADESH_DIVISIONS.map((division) => (
                          <option key={division} value={division}>{division}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        District
                      </label>
                      <select
                        value={newAddr.district}
                        onChange={(e) => handleAddressSelectionChange('district', e.target.value)}
                        disabled={newAddrDistricts.length === 0}
                        className="w-full px-3 py-2 border rounded-xl text-xs disabled:opacity-50"
                      >
                        {newAddrDistricts.length > 0 ? (
                          newAddrDistricts.map((district) => (
                            <option key={district} value={district}>{district}</option>
                          ))
                        ) : (
                          <option value="">Select division first</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Upazila
                      </label>
                      <select
                        value={newAddr.upazila}
                        onChange={(e) => handleAddressSelectionChange('upazila', e.target.value)}
                        disabled={newAddrUpazilas.length === 0}
                        className="w-full px-3 py-2 border rounded-xl text-xs disabled:opacity-50"
                      >
                        {newAddrUpazilas.length > 0 ? (
                          newAddrUpazilas.map((upazila) => (
                            <option key={upazila} value={upazila}>{upazila}</option>
                          ))
                        ) : (
                          <option value="">Select district first</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Union / Area
                      </label>
                      <select
                        value={newAddr.union || ''}
                        onChange={(e) => setNewAddr({ ...newAddr, union: e.target.value })}
                        disabled={newAddrUnions.length === 0}
                        className="w-full px-3 py-2 border rounded-xl text-xs disabled:opacity-50"
                      >
                        {newAddrUnions.length > 0 ? (
                          newAddrUnions.map((union) => (
                            <option key={union} value={union}>{union}</option>
                          ))
                        ) : (
                          <option value="">Select upazila first</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Street Address
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={newAddr.streetAddress}
                      onChange={(e) => setNewAddr({ ...newAddr, streetAddress: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6 max-w-xl">
          <h3 className="font-bold text-slate-900 text-sm">Account Security</h3>
          <div className="space-y-4 text-xs text-slate-600">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Two-Factor Authentication (2FA)</p>
                <p className="text-slate-400">SMS OTP verification via registered mobile number</p>
              </div>
              <span className="text-emerald-600 font-bold">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Single-Vendor SSL Session</p>
                <p className="text-slate-400">Encrypted token validation & persistent Redux state</p>
              </div>
              <span className="text-blue-600 font-bold">Secure</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;
