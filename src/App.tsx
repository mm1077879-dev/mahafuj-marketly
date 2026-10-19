import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { Layout } from './components/layout/Layout';
import { NotificationToastContainer } from './components/common/NotificationToast';

const HomePage = lazy(async () => ({ default: (await import('./pages/HomePage')).HomePage }));
const ShopPage = lazy(async () => ({ default: (await import('./pages/ShopPage')).ShopPage }));
const ProductDetailPage = lazy(async () => ({
  default: (await import('./pages/ProductDetailPage')).ProductDetailPage,
}));
const CartPage = lazy(async () => ({ default: (await import('./pages/CartPage')).CartPage }));
const CheckoutPage = lazy(async () => ({ default: (await import('./pages/CheckoutPage')).CheckoutPage }));
const OrderSuccessPage = lazy(async () => ({
  default: (await import('./pages/OrderSuccessPage')).OrderSuccessPage,
}));
const OrderTrackingPage = lazy(async () => ({
  default: (await import('./pages/OrderTrackingPage')).OrderTrackingPage,
}));
const WishlistPage = lazy(async () => ({ default: (await import('./pages/WishlistPage')).WishlistPage }));
const AccountPage = lazy(async () => ({ default: (await import('./pages/AccountPage')).AccountPage }));
const AdminPage = lazy(async () => ({ default: (await import('./pages/AdminPage')).AdminPage }));
const NotFoundPage = lazy(async () => ({ default: (await import('./pages/NotFoundPage')).NotFoundPage }));
const AdminLayout = lazy(async () => ({ default: (await import('./pages/admin/AdminLayout')).AdminLayout }));
const AdminLoginPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminLoginPage')).AdminLoginPage,
}));
const AdminDashboardPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminDashboardPage')).AdminDashboardPage,
}));
const AdminProductsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminProductsPage')).AdminProductsPage,
}));
const AdminProductCreatePage = lazy(async () => ({
  default: (await import('./pages/admin/AdminProductCreatePage')).AdminProductCreatePage,
}));
const AdminProductEditPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminProductEditPage')).AdminProductEditPage,
}));
const AdminCategoriesPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminCategoriesPage')).AdminCategoriesPage,
}));
const AdminBrandsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminBrandsPage')).AdminBrandsPage,
}));
const AdminCollectionsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminCollectionsPage')).AdminCollectionsPage,
}));
const AdminInventoryPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminInventoryPage')).AdminInventoryPage,
}));
const AdminOrdersPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminOrdersPage')).AdminOrdersPage,
}));
const AdminOrderDetailPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminOrderDetailPage')).AdminOrderDetailPage,
}));
const AdminCouponsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminCouponsPage')).AdminCouponsPage,
}));
const AdminBannersPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminBannersPage')).AdminBannersPage,
}));
const AdminAdvertisementsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminAdvertisementsPage')).AdminAdvertisementsPage,
}));
const AdminCMSPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminCMSPage')).AdminCMSPage,
}));
const AdminMediaPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminMediaPage')).AdminMediaPage,
}));
const AdminCustomersPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminCustomersPage')).AdminCustomersPage,
}));
const AdminReviewsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminReviewsPage')).AdminReviewsPage,
}));
const AdminSettingsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminSettingsPage')).AdminSettingsPage,
}));
const AdminAuditLogsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminAuditLogsPage')).AdminAuditLogsPage,
}));

export function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div role="status" className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
              Loading page…
            </div>
          }
        >
          <Routes>
            {/* Public Storefront Layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="product/:slug" element={<ProductDetailPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="order-success/:orderNumber" element={<OrderSuccessPage />} />
              <Route path="tracking" element={<OrderTrackingPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="404" element={<NotFoundPage />} />
            </Route>

            {/* Dedicated Admin Login Route */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Dedicated Separate Admin Module Pages with Enterprise Admin Layout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="products/new" element={<AdminProductCreatePage />} />
              <Route path="products/create" element={<AdminProductCreatePage />} />
              <Route path="products/:id/edit" element={<AdminProductEditPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="brands" element={<AdminBrandsPage />} />
              <Route path="collections" element={<AdminCollectionsPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="orders/:id" element={<AdminOrderDetailPage />} />
              <Route path="coupons" element={<AdminCouponsPage />} />
              <Route path="advertisements" element={<AdminAdvertisementsPage />} />
              <Route path="banners" element={<AdminBannersPage />} />
              <Route path="cms" element={<AdminCMSPage />} />
              <Route path="media" element={<AdminMediaPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="overview" element={<AdminPage />} />
            </Route>

            {/* Catch-all 404 */}
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
        <NotificationToastContainer />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
