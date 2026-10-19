// User Preferences, Personalization, Multi-Currency & Localization Service for Marketly
import { useState, useEffect } from 'react';
import { BangladeshAddress } from '../types';

export type Currency = 'USD' | 'BDT';
export type Language = 'en' | 'bn';

const STORAGE_KEY_CURRENCY = 'marketly_currency';
const STORAGE_KEY_LANG = 'marketly_language';
const STORAGE_KEY_RECENTLY_VIEWED = 'marketly_recently_viewed';
const STORAGE_KEY_AFFINITIES = 'marketly_user_affinities';
const STORAGE_KEY_SEARCH_HISTORY = 'marketly_search_history';
const STORAGE_KEY_PREV_ADDRESS = 'marketly_prev_shipping_address';

// Exchange rate: 1 USD = 120 BDT
export const BDT_EXCHANGE_RATE = 120;

export const getStoredCurrency = (): Currency => {
  if (typeof window === 'undefined') return 'USD';
  return (localStorage.getItem(STORAGE_KEY_CURRENCY) as Currency) || 'USD';
};

export const setStoredCurrency = (curr: Currency): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CURRENCY, curr);
    window.dispatchEvent(new Event('marketly-preferences-changed'));
  }
};

export const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem(STORAGE_KEY_LANG) as Language) || 'en';
};

export const setStoredLanguage = (lang: Language): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LANG, lang);
    window.dispatchEvent(new Event('marketly-preferences-changed'));
  }
};

/**
 * Format price in currently active currency
 */
export const formatPrice = (amountInUSD: number, currency: Currency = getStoredCurrency()): string => {
  if (currency === 'BDT') {
    const bdtAmount = Math.round(amountInUSD * BDT_EXCHANGE_RATE);
    return `৳${bdtAmount.toLocaleString('en-US')}`;
  }
  return `$${amountInUSD.toFixed(2)}`;
};

/**
 * Track recently viewed product
 */
export const trackRecentlyViewed = (productId: string): void => {
  if (typeof window === 'undefined' || !productId) return;
  try {
    const existing = getRecentlyViewedIds();
    const updated = [productId, ...existing.filter((id) => id !== productId)].slice(0, 10);
    localStorage.setItem(STORAGE_KEY_RECENTLY_VIEWED, JSON.stringify(updated));
    window.dispatchEvent(new Event('marketly-recently-viewed-changed'));
  } catch {
    // Ignore storage errors
  }
};

export const getRecentlyViewedIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_RECENTLY_VIEWED);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * Personalization & User Affinity Engine
 */
export interface UserInteraction {
  action: 'view' | 'search' | 'cart' | 'wishlist' | 'purchase';
  productId?: string;
  category?: string;
  tags?: string[];
  query?: string;
  timestamp: number;
}

export const trackInteraction = (
  action: 'view' | 'search' | 'cart' | 'wishlist' | 'purchase',
  data: { productId?: string; category?: string; tags?: string[]; query?: string }
): void => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AFFINITIES);
    const interactions: UserInteraction[] = raw ? JSON.parse(raw) : [];

    interactions.unshift({
      action,
      ...data,
      timestamp: Date.now(),
    });

    // Retain up to 50 recent interactions with deduplication
    const trimmed = interactions.slice(0, 50);
    localStorage.setItem(STORAGE_KEY_AFFINITIES, JSON.stringify(trimmed));
  } catch {
    // Safe fallback
  }
};

export const getUserAffinities = (): { categories: string[]; tags: string[] } => {
  if (typeof window === 'undefined') return { categories: [], tags: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AFFINITIES);
    if (!raw) return { categories: [], tags: [] };

    const interactions: UserInteraction[] = JSON.parse(raw);
    const categoryScores: Record<string, number> = {};
    const tagScores: Record<string, number> = {};

    const weights = {
      purchase: 5,
      cart: 3,
      wishlist: 2,
      view: 1,
      search: 1.5,
    };

    const now = Date.now();
    interactions.forEach((item) => {
      // Recency decay factor: half life 7 days
      const daysOld = (now - item.timestamp) / (1000 * 60 * 60 * 24);
      const decay = Math.max(0.2, 1 / (1 + daysOld * 0.15));
      const w = (weights[item.action] || 1) * decay;

      if (item.category) {
        categoryScores[item.category] = (categoryScores[item.category] || 0) + w;
      }
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag) => {
          tagScores[tag] = (tagScores[tag] || 0) + w;
        });
      }
    });

    const topCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat)
      .slice(0, 3);

    const topTags = Object.entries(tagScores)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .slice(0, 5);

    return { categories: topCategories, tags: topTags };
  } catch {
    return { categories: [], tags: [] };
  }
};

/**
 * Search History Manager
 */
export const getSearchHistory = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEARCH_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addSearchHistory = (term: string): void => {
  if (typeof window === 'undefined' || !term.trim()) return;
  try {
    const clean = term.trim();
    const existing = getSearchHistory();
    const updated = [clean, ...existing.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(updated));
    window.dispatchEvent(new Event('marketly-search-history-changed'));
  } catch {
    // Ignore
  }
};

export const removeSearchHistory = (term: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSearchHistory();
    const updated = existing.filter((t) => t !== term);
    localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(updated));
    window.dispatchEvent(new Event('marketly-search-history-changed'));
  } catch {
    // Ignore
  }
};

export const clearSearchHistory = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_SEARCH_HISTORY);
    window.dispatchEvent(new Event('marketly-search-history-changed'));
  } catch {
    // Ignore
  }
};

/**
 * Previous Shipping Address Persistence (Section 10)
 */
export const getPreviousShippingAddress = (): BangladeshAddress | null => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY_PREV_ADDRESS);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setPreviousShippingAddress = (address: BangladeshAddress): void => {
  if (typeof window === 'undefined' || !address) return;
  try {
    localStorage.setItem(STORAGE_KEY_PREV_ADDRESS, JSON.stringify(address));
  } catch {
    // Ignore
  }
};

// Simple English and Bengali translations for key UI elements
export const TRANSLATIONS = {
  en: {
    announcement: '🎉 Mega Summer Sale is Live! Get Up to 60% OFF',
    searchPlaceholder: 'Search products (e.g. watch, শার্ট, ghori, বই)...',
    allProducts: 'All Products',
    fashion: 'Fashion',
    watches: 'Watches',
    computing: 'Computing',
    books: 'Books',
    trackOrder: 'Track Order',
    admin: 'Admin',
    signIn: 'Sign In',
    register: 'Create Account',
    myAccount: 'My Account',
    orderHistory: 'Order History',
    signOut: 'Sign Out',
    addToCart: 'Add to Cart',
    addedToCart: 'Added to Cart',
    freeShipping: 'Free Shipping',
    easyReturns: 'Easy Returns',
    securePayment: 'Secure Payment',
    recentlyViewed: 'Recently Viewed Products',
    recommendedForYou: 'Personalized Picks For You',
    viewCatalog: 'Explore All',
  },
  bn: {
    announcement: '🎉 মেগা সামার সেল শুরু হয়েছে! পাচ্ছেন ৬০% পর্যন্ত মূল্যছাড়',
    searchPlaceholder: 'পণ্য খুঁজুন (যেমন: ঘড়ি, শার্ট, ল্যাপটপ, বই)...',
    allProducts: 'সব প্রোডাক্ট',
    fashion: 'ফ্যাশন',
    watches: 'ঘড়ি কালেকশন',
    computing: 'কম্পিউটিং',
    books: 'বই সম্ভার',
    trackOrder: 'অর্ডার ট্র্যাক করুন',
    admin: 'অ্যাডমিন',
    signIn: 'লগইন',
    register: 'অ্যাকাউন্ট তৈরি',
    myAccount: 'আমার অ্যাকাউন্ট',
    orderHistory: 'অর্ডারের বিবরণ',
    signOut: 'সাইন আউট',
    addToCart: 'কার্টে যোগ করুন',
    addedToCart: 'কার্টে যোগ হয়েছে',
    freeShipping: 'ফ্রি শিপিং',
    easyReturns: 'সহজ রিটার্ন',
    securePayment: '১০০% নিরাপদ পেমেন্ট',
    recentlyViewed: 'সম্প্রতি দেখা পণ্যসমূহ',
    recommendedForYou: 'আপনার জন্য বিশেষ পছন্দ',
    viewCatalog: 'সব পণ্য দেখুন',
  },
};

/**
 * Custom React hook for live Currency and Language synchronization
 */
export const usePreferences = () => {
  const [currency, setCurr] = useState<Currency>(getStoredCurrency);
  const [language, setLang] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    const handlePrefChange = () => {
      setCurr(getStoredCurrency());
      setLang(getStoredLanguage());
    };

    window.addEventListener('marketly-preferences-changed', handlePrefChange);
    return () => window.removeEventListener('marketly-preferences-changed', handlePrefChange);
  }, []);

  const changeCurrency = (newCurr: Currency) => {
    setStoredCurrency(newCurr);
    setCurr(newCurr);
  };

  const changeLanguage = (newLang: Language) => {
    setStoredLanguage(newLang);
    setLang(newLang);
  };

  const t = (key: keyof typeof TRANSLATIONS.en): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  const format = (amountInUSD: number): string => {
    return formatPrice(amountInUSD, currency);
  };

  return {
    currency,
    language,
    changeCurrency,
    changeLanguage,
    t,
    formatPrice: format,
  };
};
