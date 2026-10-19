import React from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { isProductWishlisted, removeFromWishlist, selectWishlistIds } from '../store/slices/wishlistSlice';
import { selectAllProducts, selectCatalogLoadStatus } from '../store/slices/productSlice';
import { ProductCard } from '../components/shop/ProductCard';
import { Heart, ArrowLeft, CircleAlert, X } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const wishlistIds = useAppSelector(selectWishlistIds);
  const products = useAppSelector(selectAllProducts);
  const catalogLoadStatus = useAppSelector(selectCatalogLoadStatus);

  const wishlistedProducts = products.filter((product) => isProductWishlisted(wishlistIds, product));
  const knownIds = new Set(products.flatMap((product) => [product.id, product.legacyId].filter(Boolean)));
  const unavailableIds = [...new Set(wishlistIds.filter((id) => !knownIds.has(id)))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            My Wishlist
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            You have saved <strong className="text-slate-900">{wishlistedProducts.length}</strong> items to purchase later.
          </p>
        </div>
        <Link
          to="/shop"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Grid or Empty */}
      {wishlistedProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-xl text-slate-900">Your Wishlist is Empty</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6">
            Tap the heart icon on any product to save it to your personal luxury curation.
          </p>
          <Link
            to="/shop"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all inline-block"
          >
            Discover Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {wishlistedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {catalogLoadStatus !== 'loading' && unavailableIds.length > 0 && (
        <section aria-label="Unavailable wishlist items" className="space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <CircleAlert className="w-4 h-4" />
            <h2 className="text-sm font-semibold">Some saved items are no longer available</h2>
          </div>
          <ul className="divide-y divide-amber-200 rounded-xl border border-amber-200 bg-amber-50">
            {unavailableIds.map((id) => (
              <li key={id} className="flex items-center justify-between gap-3 p-3 text-sm text-amber-900">
                <span>This product could not be found in the current catalog.</span>
                <button
                  type="button"
                  onClick={() => dispatch(removeFromWishlist(id))}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-amber-100"
                  aria-label="Remove unavailable item from wishlist"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
