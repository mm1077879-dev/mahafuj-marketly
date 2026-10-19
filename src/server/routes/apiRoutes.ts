import { Router } from 'express';
import multer from 'multer';
import {
  register,
  login,
  getMe,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getPublicAuthSettings,
  getAdminAuthSettings,
  updateAdminAuthSettings,
  getGoogleAuthUrl,
  verifyGoogleAuth,
  getFacebookAuthUrl,
  verifyFacebookAuth,
} from '../controllers/authController';
import {
  getProducts,
  getProductBySlug,
  getProductById,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from '../controllers/categoryController';
import {
  getProductReviews,
  createProductReview,
  voteReviewHelpful,
  updateProductReview,
  deleteProductReview,
} from '../controllers/reviewController';
import {
  createOrder,
  getOrders,
  getOrderByNumber,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/orderController';
import {
  getBanners,
  updateBanner,
  getMediaAssets,
  deleteMediaAsset,
  getDashboardStats,
  getAuditLogs,
  getCustomers,
  getInventorySummary,
  adjustStock,
} from '../controllers/adminController';
import {
  getPublicAdvertisements,
  getAdminAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
} from '../controllers/advertisementController';
import {
  getPaymentConfig,
  updatePaymentConfig,
  initiatePayment,
  verifyPayment,
  recordCodCollection,
  getAdminTransactions,
  handleBkashCallback,
  handleNagadCallback,
  cancelPaymentSession,
  refundPayment,
} from '../controllers/paymentController';
import { authenticate, optionalAuthenticate, requireRole } from '../middleware/auth';
import { uploadMiddleware, uploadImage } from '../controllers/uploadController';
import { dbStatus } from '../config/db';

const router = Router();

// Role Guards
const adminGuard = [authenticate, requireRole(['super_admin', 'admin', 'content_manager'])];
const superAdminGuard = [authenticate, requireRole(['super_admin', 'admin'])];

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Marketly Luxury Single-Vendor Commerce API',
    database: {
      connected: dbStatus.connected,
      mode: dbStatus.mode,
      host: dbStatus.host || 'Atlas-Managed',
    },
    version: '1.0.0',
  });
});

// Authentication Routes
router.post('/v1/auth/register', register);
router.post('/v1/auth/login', login);
router.post('/v1/auth/verify-email', verifyEmail);
router.post('/v1/auth/resend-verification', resendVerificationEmail);
router.post('/v1/auth/forgot-password', forgotPassword);
router.post('/v1/auth/reset-password', resetPassword);
router.get('/v1/auth/me', authenticate, getMe);
router.get('/v1/auth/settings', getPublicAuthSettings);
router.get('/v1/auth/google/url', getGoogleAuthUrl);
router.post('/v1/auth/google/verify', verifyGoogleAuth);
router.get('/v1/auth/facebook/url', getFacebookAuthUrl);
router.post('/v1/auth/facebook/verify', verifyFacebookAuth);

// Admin Auth Configuration (Protected)
router.get('/v1/admin/auth/settings', ...superAdminGuard, getAdminAuthSettings);
router.put('/v1/admin/auth/settings', ...superAdminGuard, updateAdminAuthSettings);

// Public Catalog Routes
router.get('/v1/products', getProducts);
router.get('/v1/products/:slug', getProductBySlug);
router.get('/v1/products/:id/related', getRelatedProducts);

// Customer Reviews & Feedback
router.get('/v1/products/:id/reviews', getProductReviews);
router.post('/v1/products/:id/reviews', optionalAuthenticate, createProductReview);
router.post('/v1/reviews/:id/helpful', voteReviewHelpful);
router.put('/v1/reviews/:id', ...adminGuard, updateProductReview);
router.delete('/v1/reviews/:id', ...adminGuard, deleteProductReview);
router.get('/v1/categories', getCategories);
router.get('/v1/brands', getBrands);
router.get('/v1/banners', getBanners);

// Dynamic Advertisements
router.get('/v1/advertisements', getPublicAdvertisements);
router.get('/v1/admin/advertisements', ...adminGuard, getAdminAdvertisements);
router.post('/v1/admin/advertisements', ...adminGuard, createAdvertisement);
router.put('/v1/admin/advertisements/:id', ...adminGuard, updateAdvertisement);
router.delete('/v1/admin/advertisements/:id', ...adminGuard, deleteAdvertisement);

// Payment & Checkout Verification Routes
router.get('/v1/payments/config', getPaymentConfig);
router.post('/v1/payments/initiate', optionalAuthenticate, initiatePayment);
router.post('/v1/payments/verify', verifyPayment);
router.post('/v1/payments/cancel', optionalAuthenticate, cancelPaymentSession);
router.get('/v1/payments/callback/bkash', handleBkashCallback);
router.post('/v1/payments/callback/bkash', handleBkashCallback);
router.get('/v1/payments/callback/nagad', handleNagadCallback);
router.post('/v1/payments/callback/nagad', handleNagadCallback);
router.put('/v1/admin/payments/config', ...superAdminGuard, updatePaymentConfig);
router.post('/v1/admin/payments/cod-collect', ...superAdminGuard, recordCodCollection);
router.post('/v1/admin/payments/refund', ...superAdminGuard, refundPayment);
router.get('/v1/admin/payments/transactions', ...superAdminGuard, getAdminTransactions);

// Order & Checkout Routes (Customer isolated, unauthenticated cannot query all orders)
router.post('/v1/orders', optionalAuthenticate, createOrder);
router.post('/v1/orders/track', optionalAuthenticate, getOrderByNumber);
router.get('/v1/orders', authenticate, getOrders);
router.post('/v1/orders/:id/cancel', optionalAuthenticate, cancelOrder);

// Image Upload Route (Admin) — real persistent storage via Cloudinary
router.post(
  '/v1/admin/upload-image',
  ...adminGuard,
  (req, res, next) => {
    uploadMiddleware(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Image exceeds the 5 MB size limit.'
            : `Upload rejected: ${err.message}`;
        res.status(400).json({ success: false, message });
        return;
      }
      if (err instanceof Error) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      next();
    });
  },
  uploadImage
);

// Media Routes
router.get('/v1/media', getMediaAssets);
router.delete('/v1/media/:id', ...adminGuard, deleteMediaAsset);

// Admin Control Center Routes (Strict Role & Authentication Enforcement)
router.get('/v1/admin/products', ...adminGuard, getProducts);
router.get('/v1/admin/products/:id', ...adminGuard, getProductById);
router.post('/v1/admin/products', ...adminGuard, createProduct);
router.put('/v1/admin/products/:id', ...adminGuard, updateProduct);
router.delete('/v1/admin/products/:id', ...adminGuard, deleteProduct);

router.get('/v1/admin/categories', ...adminGuard, getCategories);
router.get('/v1/admin/categories/:id', ...adminGuard, getCategoryById);
router.post('/v1/admin/categories', ...adminGuard, createCategory);
router.put('/v1/admin/categories/:id', ...adminGuard, updateCategory);
router.delete('/v1/admin/categories/:id', ...adminGuard, deleteCategory);

router.get('/v1/admin/brands', ...adminGuard, getBrands);
router.post('/v1/admin/brands', ...adminGuard, createBrand);
router.put('/v1/admin/brands/:id', ...adminGuard, updateBrand);
router.delete('/v1/admin/brands/:id', ...adminGuard, deleteBrand);

router.put('/v1/admin/banners/:id', ...adminGuard, updateBanner);
router.put('/v1/admin/orders/:id/status', ...adminGuard, updateOrderStatus);

router.get('/v1/admin/dashboard', ...adminGuard, getDashboardStats);
router.get('/v1/admin/audit-logs', ...adminGuard, getAuditLogs);
router.get('/v1/admin/customers', ...adminGuard, getCustomers);
router.get('/v1/admin/inventory', ...adminGuard, getInventorySummary);
router.post('/v1/admin/inventory/adjust', ...adminGuard, adjustStock);

export default router;
