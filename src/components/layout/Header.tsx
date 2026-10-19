import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectUniqueCartLinesCount } from '../../store/slices/cartSlice';
import { selectWishlistCount } from '../../store/slices/wishlistSlice';
import { selectAllProducts } from '../../store/slices/productSlice';
import { openMobileMenu, openCartDrawer, setSearchQuery, addNotification } from '../../store/slices/uiSlice';
import { selectCurrentUser, selectIsAdmin, logout } from '../../store/slices/authSlice';
import { AuthModal } from '../auth/AuthModal';
import {
  usePreferences,
  getSearchHistory,
  addSearchHistory,
  removeSearchHistory,
  clearSearchHistory,
  trackInteraction,
} from '../../services/preferences';
import { getCrossLingualSuggestions, matchesCrossLingualSearch } from '../../services/crossLingualSearch';
import {
  Menu,
  ShoppingBag,
  Heart,
  User as UserIcon,
  Search,
  ShieldCheck,
  Package,
  LogOut,
  ChevronRight,
  UserCheck,
  UserPlus,
  LogIn,
  Languages,
  ArrowRight,
  Clock,
  X,
  BookOpen,
} from 'lucide-react';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const uniqueCartLines = useAppSelector(selectUniqueCartLinesCount);
  const wishlistCount = useAppSelector(selectWishlistCount);
  const currentUser = useAppSelector(selectCurrentUser);
  const isAdmin = useAppSelector(selectIsAdmin);
  const allProducts = useAppSelector(selectAllProducts);

  const { t, formatPrice } = usePreferences();

  const [localSearch, setLocalSearch] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [searchFocused, setSearchFocused] = useState(false);
  const [historyList, setHistoryList] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync search history
  useEffect(() => {
    setHistoryList(getSearchHistory());

    const handleHistoryChange = () => {
      setHistoryList(getSearchHistory());
    };
    window.addEventListener('marketly-search-history-changed', handleHistoryChange);
    return () => window.removeEventListener('marketly-search-history-changed', handleHistoryChange);
  }, []);

  // Close account menu or search suggestions on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }

      if (
        searchFocused &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountMenuOpen(false);
        setSearchFocused(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen, searchFocused]);

  const searchSuggestions = localSearch.trim().length >= 1
    ? getCrossLingualSuggestions(localSearch.trim())
    : [];

  const previewMatchedProducts = localSearch.trim().length >= 1
    ? allProducts.filter((p) => matchesCrossLingualSearch(p, localSearch.trim())).slice(0, 4)
    : [];

  // Total navigable items count in dropdown
  const totalNavigableItems = searchSuggestions.length + previewMatchedProducts.length;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = localSearch.trim();
    if (query) {
      addSearchHistory(query);
      trackInteraction('search', { query });
      dispatch(setSearchQuery(query));
      setSearchFocused(false);
      navigate(`/shop?search=${encodeURIComponent(query)}`);
    }
  };

  const handleSelectSuggestion = (term: string) => {
    setLocalSearch(term);
    addSearchHistory(term);
    trackInteraction('search', { query: term });
    dispatch(setSearchQuery(term));
    setSearchFocused(false);
    navigate(`/shop?search=${encodeURIComponent(term)}`);
  };

  // Keyboard navigation through suggestions
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalNavigableItems - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalNavigableItems - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < searchSuggestions.length) {
        e.preventDefault();
        const s = searchSuggestions[activeIndex];
        handleSelectSuggestion(s.translation || s.text);
      } else if (activeIndex >= searchSuggestions.length) {
        e.preventDefault();
        const prodIdx = activeIndex - searchSuggestions.length;
        const p = previewMatchedProducts[prodIdx];
        if (p) {
          setSearchFocused(false);
          navigate(`/product/${p.slug}`);
        }
      }
    }
  };

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
    setAccountMenuOpen(false);
  };

  const handleSignOut = () => {
    dispatch(logout());
    setAccountMenuOpen(false);
    dispatch(
      addNotification({
        type: 'info',
        title: 'Signed Out',
        message: 'You have been successfully signed out of your account.',
        duration: 3000,
      })
    );
  };

  const showSuggestions = searchFocused && localSearch.trim().length >= 1 && (searchSuggestions.length > 0 || previewMatchedProducts.length > 0);
  const showHistory = searchFocused && localSearch.trim().length === 0 && historyList.length > 0;

  return (
    <>
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 transition-shadow">
        {/* Top Navbar Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* Left: Mobile Menu + Logo */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => dispatch(openMobileMenu())}
                className="p-2 -ml-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Brand Logo */}
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
                    Marketly
                  </span>
                  <span className="hidden min-[375px]:block text-[10px] sm:text-xs font-medium text-slate-500 tracking-wide">
                    Luxury Single-Vendor Commerce
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Search Bar with Cross-Lingual Predictive Dropdown */}
            <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-xl mx-4 relative">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    value={localSearch}
                    onFocus={() => {
                      setSearchFocused(true);
                      setActiveIndex(-1);
                    }}
                    onChange={(e) => {
                      setLocalSearch(e.target.value);
                      setSearchFocused(true);
                      setActiveIndex(-1);
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder={t('searchPlaceholder')}
                    className="w-full pl-11 pr-14 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                  />
                  <button
                    type="submit"
                    aria-label="Submit search"
                    className="absolute right-1 top-1 bottom-1 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* 1. Recent Search History Dropdown */}
              {showHistory && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={() => clearSearchHistory()}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {historyList.map((term, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-blue-50 rounded-lg text-xs font-semibold text-slate-700 group transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectSuggestion(term)}
                          className="hover:text-blue-600 cursor-pointer"
                        >
                          {term}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSearchHistory(term)}
                          aria-label={`Remove ${term} from history`}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Predictive Suggestions & Cross-Lingual Results Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xl py-3 px-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Semantic Keyword Suggestions */}
                  {searchSuggestions.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        <Languages className="w-3.5 h-3.5 text-blue-600" />
                        <span>Cross-Lingual Matches (বাংলা / English)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {searchSuggestions.map((s, idx) => {
                          const isKeyActive = activeIndex === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectSuggestion(s.translation || s.text)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                isKeyActive
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700'
                              }`}
                            >
                              <span>{s.text}</span>
                              {s.translation && (
                                <span className={`text-[10px] font-normal ${isKeyActive ? 'text-blue-100' : 'text-slate-400'}`}>
                                  ({s.translation})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Product Instant Previews */}
                  {previewMatchedProducts.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <span>Matching Luxury Items</span>
                        <span className="text-[10px] text-slate-400 font-normal">Press Enter for all</span>
                      </div>
                      {previewMatchedProducts.map((p, pIdx) => {
                        const itemIndex = searchSuggestions.length + pIdx;
                        const isKeyActive = activeIndex === itemIndex;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSearchFocused(false);
                              navigate(`/product/${p.slug}`);
                            }}
                            className={`flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer group ${
                              isKeyActive ? 'bg-blue-50 ring-1 ring-blue-500/20' : 'hover:bg-slate-50'
                            }`}
                          >
                            <img
                              src={p.mainImage}
                              alt={p.name}
                              className="w-10 h-10 object-contain rounded-lg bg-slate-100 p-1 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate transition-colors ${isKeyActive ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600'}`}>
                                {p.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {p.category} · <span className="font-semibold text-slate-800">{formatPrice(p.price)}</span>
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link to="/shop" className="hover:text-blue-600 transition-colors">
                {t('allProducts')}
              </Link>
              <Link to="/shop?category=Fashion" className="hover:text-blue-600 transition-colors">
                {t('fashion')}
              </Link>
              <Link to="/shop?category=Watches" className="hover:text-blue-600 transition-colors">
                {t('watches')}
              </Link>
              <Link to="/shop?category=Computing" className="hover:text-blue-600 transition-colors">
                {t('computing')}
              </Link>

            </nav>

            {/* Right: Actions (Account, Wishlist, Cart) */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Account Dropdown Menu */}
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  aria-label="User account menu"
                  className="p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {currentUser ? (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                    </div>
                  ) : (
                    <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </button>

                {/* Account Flyout Menu */}
                {accountMenuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200/90 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    role="menu"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      {currentUser ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 truncate">
                              {currentUser.name}
                            </span>
                            {currentUser.role === 'super_admin' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                Super Admin
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 truncate block">
                            {currentUser.email}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-sm text-slate-900">Welcome to Marketly</p>
                          <p className="text-xs text-slate-500">Sign in for orders, address memory & recommendations</p>
                        </div>
                      )}
                    </div>

                    <div className="py-1 text-xs sm:text-sm text-slate-700">
                      {currentUser ? (
                        <>
                          <Link
                            to="/account"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 transition-colors"
                            role="menuitem"
                          >
                            <UserCheck className="w-4 h-4 text-slate-500" />
                            <span>{t('myAccount')}</span>
                          </Link>

                          <Link
                            to="/account?tab=orders"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 transition-colors"
                            role="menuitem"
                          >
                            <Package className="w-4 h-4 text-slate-500" />
                            <span>{t('orderHistory')}</span>
                          </Link>

                          <Link
                            to="/tracking"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 transition-colors"
                            role="menuitem"
                          >
                            <Package className="w-4 h-4 text-slate-500" />
                            <span>{t('trackOrder')}</span>
                          </Link>

                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setAccountMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-blue-600 font-semibold transition-colors"
                              role="menuitem"
                            >
                              <ShieldCheck className="w-4 h-4 text-blue-600" />
                              <span>Admin Console</span>
                            </Link>
                          )}

                          <div className="border-t border-slate-100 my-1" />

                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium cursor-pointer"
                            role="menuitem"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>{t('signOut')}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenAuth('login')}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-slate-800 hover:bg-slate-50 hover:text-blue-600 font-bold transition-colors text-left cursor-pointer"
                            role="menuitem"
                          >
                            <div className="flex items-center gap-2.5">
                              <LogIn className="w-4 h-4 text-blue-600" />
                              <span>{t('signIn')}</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenAuth('register')}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-blue-600 hover:bg-blue-50 font-bold transition-colors text-left cursor-pointer"
                            role="menuitem"
                          >
                            <div className="flex items-center gap-2.5">
                              <UserPlus className="w-4 h-4 text-blue-600" />
                              <span>{t('register')}</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-blue-300" />
                          </button>

                          <div className="border-t border-slate-100 my-1" />

                          <Link
                            to="/tracking"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center justify-between px-4 py-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
                            role="menuitem"
                          >
                            <div className="flex items-center gap-2.5">
                              <Package className="w-4 h-4 text-slate-400" />
                              <span>{t('trackOrder')}</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Wishlist Icon */}
              <Link
                to="/wishlist"
                className="hidden min-[375px]:block p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors relative"
                aria-label={`Wishlist with ${wishlistCount} items`}
              >
                <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart Icon with Unique Cart Lines Badge */}
              <button
                id="navbar-cart-button"
                onClick={() => dispatch(openCartDrawer())}
                className="p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all duration-200 relative group cursor-pointer"
                aria-label={`Cart with ${uniqueCartLines} unique items`}
              >
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-105 transition-transform" />
                {uniqueCartLines > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {uniqueCartLines}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="pb-3 md:hidden">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-11 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                />
                <button
                  type="submit"
                  aria-label="Submit search"
                  className="absolute right-1 top-1 bottom-1 w-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Auth Modal with backdrop */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
};
