import {
  Product,
  Category,
  Brand,
  PromotionBanner,
  Order,
  MediaAsset,
  AuditLog,
  User,
  Advertisement,
  PaymentTransaction,
  AuthSettings,
  PaymentGatewaySettings,
} from '../types';

const API_BASE = '/api/v1';

interface AuthApiResponse {
  success?: boolean;
  message?: string;
  code?: string;
}

const readAuthResponse = async <T extends AuthApiResponse>(response: Response): Promise<T> => {
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error('The server returned an unexpected response. Please try again later.');
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error('The server returned an invalid response. Please try again later.');
  }

  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    throw new Error('The server returned an invalid response. Please try again later.');
  }
  const responseBody = result as Record<string, unknown>;
  if (typeof responseBody.success !== 'boolean') {
    throw new Error('The server returned an invalid response. Please try again later.');
  }
  if ('message' in responseBody && typeof responseBody.message !== 'string') {
    throw new Error('The server returned an invalid response. Please try again later.');
  }
  return result as T;
};

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('marketly_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Health
  async getHealth() {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Health check failed');
    }
    return data;
  }

  // Authentication
  async register(data: { name: string; email: string; password: string }): Promise<{ token: string; user: User; message?: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await readAuthResponse<{ success: boolean; message?: string; token: string; user: User }>(res);
    if (
      !res.ok ||
      !result.success ||
      typeof result.token !== 'string' ||
      typeof result.user !== 'object' ||
      result.user === null
    ) {
      throw new Error(result.message || 'Registration failed');
    }
    return result;
  }

  async login(data: { email: string; password: string }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await readAuthResponse<{ success: boolean; message?: string; token: string; user: User }>(res);
    if (
      !res.ok ||
      !result.success ||
      typeof result.token !== 'string' ||
      typeof result.user !== 'object' ||
      result.user === null
    ) {
      throw new Error(result.message || 'Login failed');
    }
    return result;
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string; user?: User }> {
    const res = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const result = await readAuthResponse<{ success: boolean; message: string; user?: User }>(res);
    if (!res.ok || !result.success || typeof result.message !== 'string') {
      throw new Error(result.message || 'Email verification failed');
    }
    return result;
  }

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const result = await readAuthResponse<{ success: boolean; message: string }>(res);
    if (!res.ok || !result.success || typeof result.message !== 'string') {
      throw new Error(result.message || 'Failed to resend verification email');
    }
    return result;
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const result = await readAuthResponse<{ success: boolean; message: string }>(res);
    if (!res.ok || !result.success || typeof result.message !== 'string') {
      throw new Error(result.message || 'Failed to process password reset request');
    }
    return result;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const result = await readAuthResponse<{ success: boolean; message: string }>(res);
    if (!res.ok || !result.success || typeof result.message !== 'string') {
      throw new Error(result.message || 'Password reset failed');
    }
    return result;
  }

  async getMe(): Promise<User | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: this.getHeaders(),
      });
      const data = await res.json();
      return data.user || null;
    } catch (e) {
      return null;
    }
  }

  async getPublicAuthSettings(): Promise<AuthSettings> {
    try {
      const res = await fetch(`${API_BASE}/auth/settings`);
      const data = await res.json();
      return data.data;
    } catch (e) {
      return {
        emailRegistrationEnabled: true,
        googleAuthEnabled: false,
        googleClientId: '',
        facebookAuthEnabled: false,
        facebookAppId: '',
      };
    }
  }

  async getAdminAuthSettings(): Promise<AuthSettings> {
    const res = await fetch(`${API_BASE}/admin/auth/settings`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return data.data;
  }

  async updateAdminAuthSettings(settings: Partial<AuthSettings>): Promise<AuthSettings> {
    const res = await fetch(`${API_BASE}/admin/auth/settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    return data.data;
  }

  async getGoogleAuthUrl(): Promise<{ url: string; redirectUri: string }> {
    const res = await fetch(`${API_BASE}/auth/google/url`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to initialize Google OAuth');
    }
    return data;
  }

  async verifyGoogleAuth(code: string, state: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/google/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to authenticate with Google');
    }
    return data;
  }

  async getFacebookAuthUrl(): Promise<{ url: string; redirectUri: string }> {
    const res = await fetch(`${API_BASE}/auth/facebook/url`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to initialize Facebook Login');
    }
    return data;
  }

  async verifyFacebookAuth(code: string, state: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/facebook/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to authenticate with Facebook');
    }
    return data;
  }

  // Dynamic Advertisements
  async getAdvertisements(): Promise<Advertisement[]> {
    try {
      const res = await fetch(`${API_BASE}/advertisements`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  async getAdminAdvertisements(): Promise<Advertisement[]> {
    try {
      const res = await fetch(`${API_BASE}/admin/advertisements`, {
        headers: this.getHeaders(),
      });
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  async createAdvertisement(ad: Partial<Advertisement>): Promise<Advertisement> {
    const res = await fetch(`${API_BASE}/admin/advertisements`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(ad),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create advertisement');
    return data.data;
  }

  async updateAdvertisement(id: string, ad: Partial<Advertisement>): Promise<Advertisement> {
    const res = await fetch(`${API_BASE}/admin/advertisements/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(ad),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update advertisement');
    return data.data;
  }

  async deleteAdvertisement(id: string): Promise<void> {
    await fetch(`${API_BASE}/admin/advertisements/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  // Payment Gateways
  async getPaymentConfig(): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/config`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load payment configuration');
    return data.data;
  }

  async initiatePayment(payload: {
    orderId: string;
    paymentMethod: string;
    customerEmail: string;
    customerPhone: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/initiate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to initiate payment');
    return data;
  }

  async verifyPayment(payload: {
    orderNumber: string;
    paymentMethod: string;
    paymentId: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Payment verification failed');
    return data;
  }

  async updatePaymentConfig(settings: Partial<PaymentGatewaySettings>): Promise<PaymentGatewaySettings> {
    const res = await fetch(`${API_BASE}/admin/payments/config`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    return data.data;
  }

  async recordCodCollection(payload: { orderId: string; amountCollected?: number; note?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/payments/cod-collect`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to record cash collection');
    return data;
  }

  async getAdminTransactions(): Promise<PaymentTransaction[]> {
    try {
      const res = await fetch(`${API_BASE}/admin/payments/transactions`, {
        headers: this.getHeaders(),
      });
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  async cancelPayment(orderNumber: string, contact: { email: string; phone: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ orderNumber, ...contact }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to cancel payment session');
    return data;
  }

  async refundPayment(payload: { orderId: string; amount?: number; reason?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/payments/refund`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Refund processing failed');
    return data;
  }

  async cancelOrder(id: string, contact?: { email: string; phone: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(contact || {}),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to cancel order');
    return data;
  }

  // Products
  async getProducts(params?: Record<string, string>): Promise<Product[]> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${API_BASE}/products${query}`);
    const data = await res.json();
    if (!res.ok || !data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to load products');
    }
    return data.data;
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const res = await fetch(`${API_BASE}/products/${slug}`);
      const data = await res.json();
      return data.data || null;
    } catch (e) {
      return null;
    }
  }

  async getAdminProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/admin/products`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to load admin products');
    }
    return data.data;
  }

  async getAdminProduct(id: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products/${encodeURIComponent(id)}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to load product');
    }
    return data.data;
  }

  async getRelatedProducts(id: string): Promise<Product[]> {
    try {
      const res = await fetch(`${API_BASE}/products/${id}/related`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  // Reviews
  async getProductReviews(
    productId: string,
    sort: string = 'recent',
    page: number = 1
  ): Promise<{
    stats: { totalReviews: number; averageRating: number; distribution: Record<number, number> };
    reviews: any[];
  }> {
    try {
      const res = await fetch(`${API_BASE}/products/${productId}/reviews?sort=${sort}&page=${page}`);
      const data = await res.json();
      return data;
    } catch (e) {
      return {
        stats: { totalReviews: 0, averageRating: 5.0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        reviews: [],
      };
    }
  }

  async submitReview(
    productId: string,
    data: { rating: number; comment: string; title?: string; userId?: string; userName?: string; userEmail?: string }
  ) {
    const res = await fetch(`${API_BASE}/products/${productId}/reviews`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to submit review');
    }
    return result;
  }

  async voteReviewHelpful(reviewId: string, voterId?: string): Promise<{ success: boolean; helpfulCount: number; hasVoted: boolean }> {
    const res = await fetch(`${API_BASE}/reviews/${reviewId}/helpful`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ voterId }),
    });
    return await res.json();
  }

  async deleteReview(reviewId: string, userId?: string, role?: string) {
    const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, role }),
    });
    return await res.json();
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(product),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create product');
    return data.data;
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/admin/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(product),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update product');
    return data.data;
  }

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      let message = 'Failed to delete product';
      try {
        const data = await res.json();
        if (data?.message) message = data.message;
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }
  }

  // Categories & Brands
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  async createCategory(category: Partial<Category>): Promise<Category> {
    const res = await fetch(`${API_BASE}/admin/categories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(category),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create category');
    return data.data;
  }

  async getAdminCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/admin/categories`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to load admin categories');
    }
    return data.data;
  }

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    const res = await fetch(`${API_BASE}/admin/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(category),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to update category');
    }
    return data.data;
  }

  async deleteCategory(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      let message = 'Failed to delete category';
      try {
        const data = await res.json();
        if (data?.message) message = data.message;
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }
  }

  async getBrands(): Promise<Brand[]> {
    try {
      const res = await fetch(`${API_BASE}/brands`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  async getAdminBrands(): Promise<Brand[]> {
    const res = await fetch(`${API_BASE}/admin/brands`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to load admin brands');
    }
    return data.data;
  }

  async createBrand(brand: Partial<Brand>): Promise<Brand> {
    const res = await fetch(`${API_BASE}/admin/brands`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(brand),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create brand');
    return data.data;
  }

  async updateBrand(id: string, brand: Partial<Brand>): Promise<Brand> {
    const res = await fetch(`${API_BASE}/admin/brands/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(brand),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update brand');
    return data.data;
  }

  async deleteBrand(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/brands/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      let message = 'Failed to delete brand';
      try {
        const data = await res.json();
        if (data?.message) message = data.message;
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }
  }

  // Banners
  async getBanners(): Promise<PromotionBanner[]> {
    try {
      const res = await fetch(`${API_BASE}/banners`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  async updateBanner(id: string, banner: Partial<PromotionBanner>): Promise<PromotionBanner> {
    const res = await fetch(`${API_BASE}/admin/banners/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(banner),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update banner');
    return data.data;
  }

  // Orders
  async createOrder(order: any): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(order),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to place order');
    }
    return data.data;
  }

  async getOrders(): Promise<Order[]> {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: this.getHeaders(),
      });
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  async getOrderByNumber(
    orderNumber: string,
    contact?: { email: string; phone: string }
  ): Promise<Order | null> {
    const res = await fetch(`${API_BASE}/orders/track`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ orderNumber, ...contact }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Could not verify this order');
    }
    return data.data || null;
  }

  async updateOrderStatus(id: string, status: string, note?: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/admin/orders/${id}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, note }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update order status');
    return data.data;
  }

  // Media
  async getMedia(): Promise<MediaAsset[]> {
    try {
      const res = await fetch(`${API_BASE}/media`);
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Uploads an image file through the real backend to persistent storage
   * (Cloudinary). Returns the persisted MediaAsset including its public URL.
   */
  async uploadImage(file: File): Promise<MediaAsset> {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('marketly_token');
    const res = await fetch(`${API_BASE}/admin/upload-image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || `Image upload failed (${res.status})`);
    }
    return data.data as MediaAsset;
  }

  async deleteMedia(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/media/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      let message = 'Failed to delete media asset';
      try {
        const data = await res.json();
        if (data?.message) message = data.message;
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }
  }

  // Admin Dashboard & Audit Logs
  async getDashboardStats() {
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: this.getHeaders(),
      });
      const data = await res.json();
      return data.data;
    } catch (e) {
      return null;
    }
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await fetch(`${API_BASE}/admin/audit-logs`, {
        headers: this.getHeaders(),
      });
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }
}

export const api = new ApiService();
