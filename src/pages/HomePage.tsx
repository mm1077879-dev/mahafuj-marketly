import React from 'react';
import { CategoryQuickRow } from '../components/home/CategoryQuickRow';
import { HeroBanner } from '../components/home/HeroBanner';
import { FlashDealCard } from '../components/home/FlashDealCard';
import { HomeAdBanner } from '../components/home/HomeAdBanner';
import { PopularCategoriesGrid } from '../components/home/PopularCategoriesGrid';
import { RecommendedSection } from '../components/home/RecommendedSection';
import { FeaturedProductsSection } from '../components/home/FeaturedProductsSection';
import { PromotionalDualBanners } from '../components/home/PromotionalDualBanners';
import { BestSellersSection } from '../components/home/BestSellersSection';
import { RecentlyViewedSection } from '../components/home/RecentlyViewedSection';
import { TestimonialSection } from '../components/home/TestimonialSection';
import { NewsletterSection } from '../components/home/NewsletterSection';

export const HomePage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-8 sm:space-y-12">
      {/* 1. Quick Category Nav Row */}
      <CategoryQuickRow />

      {/* 2. Hero Banner Card with product render & Perks */}
      <HeroBanner />

      {/* 3. Flash Deal Banner Card with live countdown & special price */}
      <FlashDealCard />

      {/* 3.1 Dynamic Advertisement Slot: Below Hero */}
      <HomeAdBanner placement="below_hero" />

      {/* 4. Popular Categories Grid */}
      <PopularCategoriesGrid />

      {/* 4.1 Personalized Recommendations ("Picks For You") */}
      <RecommendedSection />

      {/* 5. Featured Products Grid */}
      <FeaturedProductsSection />

      {/* 5.1 Dynamic Advertisement Slot: Between Collections */}
      <HomeAdBanner placement="between_collections" />

      {/* 6. Promotional Dual Banners */}
      <PromotionalDualBanners />

      {/* 7. Best Sellers Grid */}
      <BestSellersSection />

      {/* 7.1 Recently Viewed Products */}
      <RecentlyViewedSection />

      {/* 8. Customer Testimonial Quote */}
      <TestimonialSection />

      {/* 8.1 Dynamic Advertisement Slot: Before Footer */}
      <HomeAdBanner placement="before_footer" />

      {/* 9. Newsletter Subscription Card */}
      <NewsletterSection />
    </div>
  );
};
