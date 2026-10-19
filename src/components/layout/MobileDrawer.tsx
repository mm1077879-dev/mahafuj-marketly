import React from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeMobileMenu, selectIsMobileMenuOpen } from '../../store/slices/uiSlice';
import { selectAllCategories } from '../../store/slices/productSlice';
import { selectCurrentUser, selectIsAdmin, logout, loginAsAdmin, loginAsCustomer } from '../../store/slices/authSlice';
import {
  X,
  ShoppingBag,
  Heart,
  User,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  LogOut,
  LogIn,
} from 'lucide-react';

export const MobileDrawer: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsMobileMenuOpen);
  const categories = useAppSelector(selectAllCategories);
  const user = useAppSelector(selectCurrentUser);
  const isAdmin = useAppSelector(selectIsAdmin);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => dispatch(closeMobileMenu())}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900">Marketly</span>
          </div>
          <button
            onClick={() => dispatch(closeMobileMenu())}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User preview banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              {user ? user.name[0] : 'G'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user ? user.name : 'Welcome, Guest'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user ? user.email : 'Sign in to access your orders'}
              </p>
            </div>
          </div>
          {/* Quick role switcher for testing auth */}
          <div className="mt-3 flex gap-2">
            {isAdmin ? (
              <button
                onClick={() => dispatch(loginAsCustomer())}
                className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-700 hover:border-blue-600 transition-colors"
              >
                Switch to Customer
              </button>
            ) : (
              <button
                onClick={() => dispatch(loginAsAdmin())}
                className="text-xs px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-md font-medium hover:bg-blue-100 transition-colors"
              >
                Switch to Admin
              </button>
            )}
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Shop sections */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Explore Catalog
            </h4>
            <div className="space-y-1">
              <Link
                to="/shop"
                onClick={() => dispatch(closeMobileMenu())}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
              >
                <span>All Products</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  onClick={() => dispatch(closeMobileMenu())}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                >
                  <span>{cat.name}</span>
                  <span className="text-xs text-slate-400">({cat.itemCount.toLocaleString()})</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Customer Services
            </h4>
            <div className="space-y-1">
              <Link
                to="/tracking"
                onClick={() => dispatch(closeMobileMenu())}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <Package className="w-4 h-4 text-blue-600" />
                <span>Track Order</span>
              </Link>
              <Link
                to="/wishlist"
                onClick={() => dispatch(closeMobileMenu())}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <Heart className="w-4 h-4 text-rose-500" />
                <span>My Wishlist</span>
              </Link>
              <Link
                to="/account"
                onClick={() => dispatch(closeMobileMenu())}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <User className="w-4 h-4 text-slate-500" />
                <span>Account & Addresses</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => dispatch(closeMobileMenu())}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-blue-600 bg-blue-50/50 hover:bg-blue-50"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Admin Management Console</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          {user ? (
            <button
              onClick={() => {
                dispatch(logout());
                dispatch(closeMobileMenu());
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => {
                dispatch(loginAsCustomer());
                dispatch(closeMobileMenu());
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
