import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectAllProducts, selectReviews, addReview, deleteReviewInStore } from '../store/slices/productSlice';
import { addToCart } from '../store/slices/cartSlice';
import {
  getProductIdentifiers,
  isProductWishlisted,
  toggleWishlist,
  selectWishlistIds,
} from '../store/slices/wishlistSlice';
import { triggerFlyAnimation, addNotification } from '../store/slices/uiSlice';
import { selectCurrentUser, selectIsAdmin } from '../store/slices/authSlice';
import { StarRating } from '../components/common/StarRating';
import { ProductCard } from '../components/shop/ProductCard';
import { RecommendedSection } from '../components/home/RecommendedSection';
import { RecentlyViewedSection } from '../components/home/RecentlyViewedSection';
import { usePreferences, trackRecentlyViewed, trackInteraction } from '../services/preferences';
import { api } from '../services/api';
import { ProductReview } from '../types';
import {
  Heart,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  CheckCircle2,
  ChevronRight,
  ZoomIn,
  X,
  ThumbsUp,
  Trash2,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  Package,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectAllProducts);
  const storeReviews = useAppSelector(selectReviews);
  const wishlistIds = useAppSelector(selectWishlistIds);
  const currentUser = useAppSelector(selectCurrentUser);
  const isAdmin = useAppSelector(selectIsAdmin);
  const { formatPrice, currency } = usePreferences();

  const product = products.find((p) => p.slug === slug || p.id === slug);

  // States
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'care' | 'shipping' | 'reviews'>('specs');
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Reviews State
  const [reviewsList, setReviewsList] = useState<ProductReview[]>([]);
  const [reviewSort, setReviewSort] = useState<'recent' | 'highest' | 'lowest' | 'helpful'>('recent');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [votedReviews, setVotedReviews] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (product) {
      setSelectedImage(product.mainImage);
      if (product.variants && product.variants.length > 0) {
        setSelectedVariantId(product.variants[0].id);
      }
      setQuantity(1);
      window.scrollTo(0, 0);

      // Track personalized interaction
      trackRecentlyViewed(product.id);
      trackInteraction('view', {
        productId: product.id,
        category: product.category,
        tags: product.tags,
      });

      // Dynamically sync SEO Title and Description
      document.title = `${product.name} — Marketly Luxury Platform`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', product.shortDescription || product.description);
      }
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', product.name);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', product.shortDescription || product.description);

      // Fetch reviews from API
      api.getProductReviews(product.id, reviewSort)
        .then((data) => {
          if (data && data.reviews && data.reviews.length > 0) {
            setReviewsList(data.reviews);
          } else {
            // Fallback to store reviews
            setReviewsList(storeReviews[product.id] || []);
          }
        })
        .catch(() => {
          setReviewsList(storeReviews[product.id] || []);
        });
    }
  }, [product, reviewSort]);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Product Not Found</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          The requested product may have been archived, discontinued, or moved.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <span>Return to Catalog</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const isWishlisted = isProductWishlisted(wishlistIds, product);

  const effectivePrice = selectedVariant?.price || product.price;
  const effectiveCompareAt = selectedVariant?.compareAtPrice || product.compareAtPrice;
  const currentStock = selectedVariant?.inventory ?? product.inventory;
  const isOutOfStock = currentStock <= 0;

  // Calculate dynamic review statistics
  const currentReviews = reviewsList.length > 0 ? reviewsList : (storeReviews[product.id] || []);
  const totalReviewsCount = currentReviews.length;
  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    currentReviews.forEach((r) => {
      const rounded = Math.round(Math.max(1, Math.min(5, r.rating))) as 1 | 2 | 3 | 4 | 5;
      dist[rounded] = (dist[rounded] || 0) + 1;
      sum += r.rating;
    });
    const avg = totalReviewsCount > 0 ? parseFloat((sum / totalReviewsCount).toFixed(1)) : (product.rating || 5.0);
    return { dist, avg };
  }, [currentReviews, totalReviewsCount, product.rating]);

  // Gallery Images list (main image + gallery items, deduplicated)
  const gallery = Array.from(new Set([product.mainImage, ...(product.galleryImages || [])]));

  // Related products from actual catalog
  const relatedProducts = products
    .filter((p) => p.id !== product.id && (p.category === product.category || (p.tags && product.tags && p.tags.some((t) => product.tags?.includes(t)))))
    .slice(0, 4);

  // Add to Cart handler with Cart Fly animation
  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isOutOfStock) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    dispatch(
      addToCart({
        id: `${product.id}-${selectedVariant?.id || 'default'}`,
        productId: product.id,
        variantId: selectedVariant?.id,
        name: product.name,
        sku: selectedVariant?.sku || product.sku,
        price: effectivePrice,
        compareAtPrice: effectiveCompareAt,
        quantity,
        image: selectedImage || product.mainImage,
        selectedAttributes: selectedVariant?.attributes,
        maxStock: currentStock,
      })
    );

    trackInteraction('cart', {
      productId: product.id,
      category: product.category,
      tags: product.tags,
    });

    dispatch(
      triggerFlyAnimation({
        startX,
        startY,
        image: selectedImage || product.mainImage,
        timestamp: Date.now(),
      })
    );

    dispatch(
      addNotification({
        type: 'success',
        title: 'Added to Cart',
        message: `${quantity} × ${product.name} added to cart.`,
        duration: 3000,
      })
    );
  };

  const handleBuyNow = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isOutOfStock) return;
    handleAddToCart(e);
    navigate('/checkout');
  };

  const handleToggleWishlist = () => {
    dispatch(toggleWishlist({ id: product.id, identifiers: getProductIdentifiers(product) }));
    if (!isWishlisted) {
      trackInteraction('wishlist', {
        productId: product.id,
        category: product.category,
        tags: product.tags,
      });
    }
    dispatch(
      addNotification({
        type: 'info',
        title: isWishlisted ? 'Removed from Wishlist' : 'Saved to Wishlist',
        message: `${product.name} ${isWishlisted ? 'removed from' : 'saved to'} your wishlist.`,
        duration: 2000,
      })
    );
  };

  // Submit Review Handler
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const reviewPayload = {
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
        userId: currentUser?.id || 'usr_guest_' + Date.now(),
        userName: currentUser?.name || 'Verified Customer',
        userEmail: currentUser?.email,
      };

      const result = await api.submitReview(product.id, reviewPayload);

      // Add to Redux store
      dispatch(addReview(result.review));

      // Update local state
      setReviewsList([result.review, ...reviewsList]);
      setReviewComment('');
      setReviewTitle('');

      dispatch(
        addNotification({
          type: 'success',
          title: 'Review Published',
          message: 'Thank you for your valuable feedback!',
          duration: 3000,
        })
      );
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Helpful Vote Handler
  const handleVoteHelpful = async (reviewId: string) => {
    try {
      const voterId = currentUser?.id || 'guest_voter';
      const res = await api.voteReviewHelpful(reviewId, voterId);
      if (res.success) {
        setVotedReviews({ ...votedReviews, [reviewId]: res.hasVoted });
        setReviewsList(
          reviewsList.map((r) =>
            r.id === reviewId ? { ...r, helpfulCount: res.helpfulCount } : r
          )
        );
      }
    } catch (e) {
      // Ignore voting error
    }
  };

  // Delete Review Handler (Author or Admin)
  const handleDeleteReview = async (reviewId: string) => {
    try {
      await api.deleteReview(reviewId, currentUser?.id, isAdmin ? 'super_admin' : undefined);
      dispatch(deleteReviewInStore({ productId: product.id, reviewId }));
      setReviewsList(reviewsList.filter((r) => r.id !== reviewId));
      dispatch(
        addNotification({
          type: 'info',
          title: 'Review Removed',
          message: 'The review was successfully deleted.',
          duration: 2000,
        })
      );
    } catch (e) {
      // Ignore
    }
  };

  // Dynamic Schema.org Product structured data
  const structuredData = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: gallery,
    description: product.shortDescription || product.description,
    sku: product.sku,
    mpn: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      url: window.location.href,
      priceCurrency: currency === 'BDT' ? 'BDT' : 'USD',
      price: currency === 'BDT' ? Math.round(effectivePrice * 120) : effectivePrice,
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability: isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: ratingDistribution.avg,
      reviewCount: Math.max(1, totalReviewsCount),
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12">
      {/* Schema.org Product JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
        <Link to="/shop" className="hover:text-slate-900 transition-colors">Shop</Link>
        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
        <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-slate-900 transition-colors">
          {product.category}
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="text-slate-900 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Product Image Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-8 flex items-center justify-center overflow-hidden group shadow-xs">
            {/* Zoom Button */}
            <button
              onClick={() => setIsZoomOpen(true)}
              aria-label="Enlarge image"
              className="absolute top-4 right-4 z-10 p-2.5 rounded-2xl bg-white/90 hover:bg-white text-slate-700 shadow-md backdrop-blur-xs transition-all opacity-90 hover:opacity-100 hover:scale-105 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Discount Badge */}
            {product.discountPercent && product.discountPercent > 0 && (
              <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-xs">
                {product.discountPercent}% OFF
              </span>
            )}

            {/* Main Image */}
            <div
              onClick={() => setIsZoomOpen(true)}
              className="relative w-full h-80 sm:h-110 flex items-center justify-center cursor-zoom-in"
            >
              <img
                src={selectedImage || product.mainImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Thumbnail Strip */}
          {gallery.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  aria-label={`View thumbnail ${idx + 1}`}
                  className={`relative w-20 h-20 rounded-2xl bg-white border p-1.5 shrink-0 transition-all cursor-pointer ${
                    selectedImage === img
                      ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} preview ${idx + 1}`}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Purchase Details (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">
                {product.brand} · {product.category}
              </span>
              <span className="text-xs font-mono text-slate-400">SKU: {selectedVariant?.sku || product.sku}</span>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-snug">
              {product.name}
            </h1>

            {/* Ratings Summary */}
            <div className="flex items-center gap-2.5 mt-3">
              <StarRating rating={ratingDistribution.avg} size="md" />
              <span className="text-sm font-bold text-slate-800">{ratingDistribution.avg}</span>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => setActiveTab('reviews')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                {totalReviewsCount} Customer Reviews
              </button>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-baseline justify-between">
            <div className="flex items-baseline gap-3">
              <span className="font-display font-extrabold text-3xl text-slate-900 tracking-tight">
                {formatPrice(effectivePrice)}
              </span>
              {effectiveCompareAt && effectiveCompareAt > effectivePrice && (
                <span className="text-base text-slate-400 line-through">
                  {formatPrice(effectiveCompareAt)}
                </span>
              )}
            </div>

            {/* Stock status indicator */}
            <div>
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
                  Out of Stock
                </span>
              ) : currentStock < 10 ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                  Only {currentStock} Left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  In Stock ({currentStock})
                </span>
              )}
            </div>
          </div>

          {/* Short Description */}
          <p className="text-sm text-slate-600 leading-relaxed">
            {product.shortDescription || product.description}
          </p>

          {/* Variant Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                Select Option / Edition
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = v.id === selectedVariantId;
                  const isVarOutOfStock = v.inventory <= 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      disabled={isVarOutOfStock}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                          : isVarOutOfStock
                          ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900 truncate">{v.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatPrice(v.price)} {isVarOutOfStock && '(Out of stock)'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector & Actions */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-700">Quantity</span>
              <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  aria-label="Decrease quantity"
                  className="px-3.5 py-2 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer text-slate-600"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 py-2 text-xs font-bold text-slate-900 font-mono">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  disabled={quantity >= currentStock || isOutOfStock}
                  aria-label="Increase quantity"
                  className="px-3.5 py-2 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer text-slate-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-98"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 px-6 py-3.5 bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
              >
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Buy Now</span>
              </button>

              <button
                onClick={handleToggleWishlist}
                aria-label="Toggle wishlist"
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${
                  isWishlisted
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Value Props & Assurances */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50">
              <Truck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Fast Bangladesh Courier</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Genuine Luxury</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50">
              <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Hassle-Free Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section: Specifications, Care, Shipping, Reviews */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4 sm:gap-8 border-b border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-3.5 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer ${
              activeTab === 'specs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Specifications & Details
          </button>
          <button
            onClick={() => setActiveTab('care')}
            className={`pb-3.5 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer ${
              activeTab === 'care'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Materials & Care
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`pb-3.5 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer ${
              activeTab === 'shipping'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Shipping & Coverage
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3.5 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Customer Reviews</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">
              {totalReviewsCount}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-2">
          {activeTab === 'specs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {Object.entries(product.specifications || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                  <span className="font-medium text-slate-500">{key}</span>
                  <span className="font-semibold text-slate-900 text-right">{value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'care' && (
            <div className="space-y-4 max-w-3xl text-sm text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Materials Composition</h4>
                <p>{product.materials || 'Crafted with premium certified materials selected for longevity and luxury aesthetics.'}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Care & Maintenance Instructions</h4>
                <p>{product.careInstructions || 'Follow standard gentle cleaning guidelines. Store in original protective sleeve or dust bag.'}</p>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-4 max-w-3xl text-sm text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Bangladesh Delivery Coverage</h4>
                <p>Express doorstep delivery across Dhaka (24–48 hours) and 64 districts including Chittagong, Sylhet, Rajshahi, Khulna, Barisal, Rangpur, and Mymensingh.</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Return & Warranty Policy</h4>
                <p>{product.returnPolicy || '30-day inspection period. Items must be in brand new, original condition with warranty security tags intact.'}</p>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-8">
              {/* Review Summary Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-3xl bg-slate-50 border border-slate-100 items-center">
                {/* Score */}
                <div className="md:col-span-4 text-center border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-6">
                  <div className="font-display font-extrabold text-4xl sm:text-5xl text-slate-900">
                    {ratingDistribution.avg}
                  </div>
                  <div className="flex justify-center my-2">
                    <StarRating rating={ratingDistribution.avg} size="md" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Based on {totalReviewsCount} verified reviews
                  </p>
                </div>

                {/* Rating Distribution Bars */}
                <div className="md:col-span-8 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingDistribution.dist[star as 1 | 2 | 3 | 4 | 5] || 0;
                    const pct = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-12 font-medium text-slate-600 shrink-0">{star} stars</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-slate-400 tabular-nums shrink-0">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Submission Form */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-base font-bold text-slate-900">Write a Verified Customer Review</h4>

                {reviewError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Your Rating *
                      </label>
                      <StarRating
                        rating={reviewRating}
                        size="md"
                        interactive
                        onRatingChange={(r) => setReviewRating(r)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Review Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        placeholder="e.g. Exceptional Build Quality & Performance"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Your Written Feedback *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your detailed experience regarding comfort, durability, and aesthetics..."
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Reviews are verified against real purchase records.
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmittingReview || !reviewComment.trim()}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Review Sorting Controls */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="font-bold text-slate-800">
                  Reviews ({currentReviews.length})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Sort by:</span>
                  <select
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="highest">Highest Rated</option>
                    <option value="lowest">Lowest Rated</option>
                    <option value="helpful">Most Helpful</option>
                  </select>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4 divide-y divide-slate-100">
                {currentReviews.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No reviews yet. Be the first customer to share your thoughts on this product!
                  </p>
                ) : (
                  currentReviews.map((rev) => {
                    const hasVoted = votedReviews[rev.id];
                    const isAuthor = currentUser?.id === rev.userId || isAdmin;
                    return (
                      <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                              {rev.userName ? rev.userName[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">{rev.userName}</span>
                                {rev.isVerifiedPurchase && (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Verified Purchase
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {new Date(rev.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <StarRating rating={rev.rating} size="sm" />
                            {isAuthor && (
                              <button
                                onClick={() => handleDeleteReview(rev.id)}
                                aria-label="Delete review"
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {rev.title && (
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900 pt-1">
                            {rev.title}
                          </h5>
                        )}

                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {rev.comment}
                        </p>

                        {/* Helpful vote action */}
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                          <button
                            onClick={() => handleVoteHelpful(rev.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                              hasVoted
                                ? 'bg-blue-50 border-blue-200 text-blue-600 font-semibold'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>Helpful ({rev.helpfulCount || 0})</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enlarged Image Viewer Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-6 overflow-hidden flex flex-col items-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsZoomOpen(false)}
              aria-label="Close enlarged view"
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full h-96 sm:h-120 flex items-center justify-center">
              <img
                src={selectedImage || product.mainImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            {gallery.length > 1 && (
              <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 max-w-full">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 rounded-xl border p-1 bg-white shrink-0 cursor-pointer ${
                      selectedImage === img ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Related Products from Database */}
      {relatedProducts.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900">
                Related & Complementary Products
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hand-picked based on shared category and attributes in {product.category}
              </p>
            </div>
            <Link
              to={`/shop?category=${encodeURIComponent(product.category)}`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              <span>View Category</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Personalized Recommendations & Recently Viewed */}
      <RecommendedSection />
      <RecentlyViewedSection />
    </div>
  );
};

export default ProductDetailPage;
