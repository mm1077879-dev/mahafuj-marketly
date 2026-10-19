import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectAllProducts } from '../../store/slices/productSlice';
import { selectCartItems } from '../../store/slices/cartSlice';
import { getProductIdentifiers, selectWishlistIds } from '../../store/slices/wishlistSlice';
import { ProductCard } from '../shop/ProductCard';
import { getRecentlyViewedIds, usePreferences } from '../../services/preferences';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecommendedSectionProps {
  currentProductId?: string;
  title?: string;
}

export const RecommendedSection: React.FC<RecommendedSectionProps> = ({
  currentProductId,
  title,
}) => {
  const products = useAppSelector(selectAllProducts);
  const cartItems = useAppSelector(selectCartItems);
  const wishlistIds = useAppSelector(selectWishlistIds);
  const { t } = usePreferences();

  // Determine user category preferences based on viewed/cart/wishlist items
  const recentIds = getRecentlyViewedIds();
  const interestedCategoryScores: Record<string, number> = {};

  const scoreProduct = (id: string, weight: number) => {
    const prod = products.find((product) => getProductIdentifiers(product).includes(id));
    if (prod?.category) {
      interestedCategoryScores[prod.category] = (interestedCategoryScores[prod.category] || 0) + weight;
    }
  };

  recentIds.forEach((id) => scoreProduct(id, 2));
  wishlistIds.forEach((id) => scoreProduct(id, 3));
  cartItems.forEach((item) => scoreProduct(item.productId, 4));

  // Sort categories by user affinity
  const preferredCategories = Object.entries(interestedCategoryScores)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  // Filter recommendations (excluding current product if on Product Detail Page)
  let recommendations = products.filter((p) => p.id !== currentProductId);

  if (preferredCategories.length > 0) {
    // Rank products matching top categories higher
    recommendations = [...recommendations].sort((a, b) => {
      const aAffinity = preferredCategories.indexOf(a.category) !== -1 ? 10 - preferredCategories.indexOf(a.category) : 0;
      const bAffinity = preferredCategories.indexOf(b.category) !== -1 ? 10 - preferredCategories.indexOf(b.category) : 0;
      if (aAffinity !== bAffinity) return bAffinity - aAffinity;
      return (b.rating || 0) - (a.rating || 0);
    });
  } else {
    // Fallback: highest rated or featured
    recommendations = [...recommendations].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  const displayList = recommendations.slice(0, 4);

  if (displayList.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 tracking-tight">
              {title || t('recommendedForYou')}
            </h2>
            <p className="text-xs text-slate-500">Curated based on your browsing interests</p>
          </div>
        </div>

        <Link
          to="/shop"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
        >
          <span>{t('viewCatalog')}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {displayList.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};
