import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectAllProducts } from '../../store/slices/productSlice';
import { ProductCard } from '../shop/ProductCard';
import { getRecentlyViewedIds, usePreferences } from '../../services/preferences';
import { History, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RecentlyViewedSection: React.FC = () => {
  const products = useAppSelector(selectAllProducts);
  const { t } = usePreferences();
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(getRecentlyViewedIds());

    const handleUpdate = () => {
      setRecentIds(getRecentlyViewedIds());
    };

    window.addEventListener('marketly-recently-viewed-changed', handleUpdate);
    return () => window.removeEventListener('marketly-recently-viewed-changed', handleUpdate);
  }, []);

  const recentProducts = recentIds
    .map((id) => products.find((p) => p.id === id || p.slug === id))
    .filter((p): p is typeof products[0] => Boolean(p))
    .slice(0, 4);

  if (recentProducts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 tracking-tight">
              {t('recentlyViewed')}
            </h2>
            <p className="text-xs text-slate-500">Pick up where you left off</p>
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
        {recentProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};
