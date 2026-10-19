import bcrypt from 'bcryptjs';
import {
  initialProducts,
  initialCategories,
  initialBrands,
  initialBanners,
  initialReviews,
  initialAuditLogs,
  initialMediaAssets,
} from '../../services/mockData';
import {
  Product,
  Category,
  Brand,
  PromotionBanner,
  Order,
  AuditLog,
  MediaAsset,
  User,
  Advertisement,
  PaymentTransaction,
  AuthSettings,
  PaymentGatewaySettings,
} from '../../types';
import { isConfiguredOAuthValue } from './oauthConfig';
import { ADMIN_PASSWORD } from './adminCredentials';

// Pre-hash default passwords with bcrypt for in-memory security
const ADMIN_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);
const DEMO_HASH = bcrypt.hashSync('Customer@2026!', 10);

class MemoryStore {
  products: Product[] = JSON.parse(JSON.stringify(initialProducts));
  categories: Category[] = JSON.parse(JSON.stringify(initialCategories));
  brands: Brand[] = JSON.parse(JSON.stringify(initialBrands));
  banners: PromotionBanner[] = JSON.parse(JSON.stringify(initialBanners));
  reviews: Record<string, any[]> = JSON.parse(JSON.stringify(initialReviews));
  auditLogs: AuditLog[] = JSON.parse(JSON.stringify(initialAuditLogs));
  mediaAssets: MediaAsset[] = JSON.parse(JSON.stringify(initialMediaAssets));

  // Dynamic Advertisements
  advertisements: Advertisement[] = [
    {
      id: 'ad_1',
      title: 'Summer Luxury Watch Collection — 30% Off',
      placement: 'below_hero',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200',
      destinationUrl: '/shop?category=Watches',
      openInNewTab: false,
      priority: 1,
      active: true,
      provider: 'custom_banner',
    },
    {
      id: 'ad_2',
      title: 'Official Apple & Tech Showcase — Free Express Delivery',
      placement: 'between_collections',
      imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200',
      destinationUrl: '/shop?category=Computing',
      openInNewTab: false,
      priority: 1,
      active: true,
      provider: 'custom_banner',
    },
  ];

  // Payment Transactions
  paymentTransactions: PaymentTransaction[] = [];

  // Global Auth Settings
  authSettings: AuthSettings = {
    emailRegistrationEnabled: true,
    googleAuthEnabled:
      isConfiguredOAuthValue(process.env.GOOGLE_CLIENT_ID) &&
      isConfiguredOAuthValue(process.env.GOOGLE_CLIENT_SECRET),
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    facebookAuthEnabled:
      isConfiguredOAuthValue(process.env.FACEBOOK_APP_ID) &&
      isConfiguredOAuthValue(process.env.FACEBOOK_APP_SECRET),
    facebookAppId: process.env.FACEBOOK_APP_ID || '',
  };

  // Payment Gateway Settings
  paymentSettings: PaymentGatewaySettings = {
    bkashEnabled: true,
    bkashSandbox: process.env.BKASH_SANDBOX?.toLowerCase() !== 'false',
    bkashConfigured: Boolean(
      process.env.BKASH_APP_KEY &&
      !process.env.BKASH_APP_KEY.includes('bkash_app_key') &&
      !process.env.BKASH_APP_KEY.includes('placeholder')
    ),
    nagadEnabled: true,
    nagadSandbox: true,
    nagadConfigured: Boolean(
      process.env.NAGAD_MERCHANT_ID &&
      !process.env.NAGAD_MERCHANT_ID.includes('nagad_merchant_id') &&
      !process.env.NAGAD_MERCHANT_ID.includes('placeholder')
    ),
    codEnabled: true,
  };

  users: User[] = [
    {
      id: 'usr_admin_1',
      name: 'Mahim Haque (Super Admin)',
      email: (process.env.ADMIN_EMAIL || 'admin@marketly.com').toLowerCase().trim(),
      role: 'super_admin',
      phone: '+880 1712-345678',
      authProvider: 'local',
      passwordHash: ADMIN_HASH,
      addresses: [
        {
          fullName: 'Mahim Haque',
          phone: '+880 1712-345678',
          email: (process.env.ADMIN_EMAIL || 'admin@marketly.com').toLowerCase().trim(),
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Gulshan',
          union: 'Ward 19',
          streetAddress: 'House 42, Road 11, Block D, Banani',
          postalCode: '1213',
        },
      ],
    },
    {
      id: 'usr_customer_demo',
      name: 'Emily Johnson',
      email: 'customer@marketly.com',
      role: 'customer',
      phone: '+880 1812-987654',
      authProvider: 'local',
      passwordHash: DEMO_HASH,
      addresses: [
        {
          fullName: 'Emily Johnson',
          phone: '+880 1812-987654',
          email: 'customer@marketly.com',
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Dhanmondi',
          union: 'Ward 15',
          streetAddress: 'Apartment 4B, Road 7/A, Dhanmondi',
          postalCode: '1209',
        },
      ],
    },
  ];

  orders: Order[] = [
    {
      id: 'ord_1042',
      orderNumber: 'MKT-2026-1042',
      customer: {
        userId: 'usr_customer_demo',
        name: 'Emily Johnson',
        email: 'customer@marketly.com',
        phone: '+880 1812-987654',
      },
      shippingAddress: {
        fullName: 'Emily Johnson',
        phone: '+880 1812-987654',
        email: 'customer@marketly.com',
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Dhanmondi',
        union: 'Ward 15',
        streetAddress: 'Apartment 4B, Road 7/A, Dhanmondi',
        postalCode: '1209',
      },
      items: [
        {
          productId: 'prod_smartwatch_1',
          name: 'Ultra Precision Smartwatch OLED Series 9',
          sku: 'SW-900-BLK',
          price: 249.99,
          quantity: 1,
          image: '/src/assets/images/smartwatch_flash_deal_1790933014371.jpg',
        },
      ],
      subtotal: 249.99,
      discount: 0,
      shippingFee: 0,
      total: 249.99,
      paymentMethod: 'cod',
      paymentStatus: 'Pending',
      orderStatus: 'Shipped',
      statusHistory: [
        { status: 'Pending Payment', timestamp: new Date(Date.now() - 172800000).toISOString() },
        { status: 'Confirmed', timestamp: new Date(Date.now() - 150000000).toISOString() },
        { status: 'Processing', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { status: 'Shipped', timestamp: new Date(Date.now() - 28800000).toISOString(), note: 'Dispatched via Pathao Courier' },
      ],
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'ord_1043',
      orderNumber: 'MKT-2026-1043',
      customer: {
        name: 'Tanvir Ahmed',
        email: 'tanvir@gmail.com',
        phone: '+880 1911-223344',
      },
      shippingAddress: {
        fullName: 'Tanvir Ahmed',
        phone: '+880 1911-223344',
        email: 'tanvir@gmail.com',
        division: 'Chittagong',
        district: 'Chittagong',
        upazila: 'Panchlaish',
        union: 'Nasirabad',
        streetAddress: 'Plot 12, GEC Circle',
        postalCode: '4000',
      },
      items: [
        {
          productId: 'prod_sneakers_1',
          name: "Men's Air Aerodynamic Running Sneakers",
          sku: 'SNK-AIR-WHT',
          price: 119.99,
          quantity: 1,
          image: '/src/assets/images/sneakers_white_air_1790933024489.jpg',
        },
      ],
      subtotal: 119.99,
      discount: 10,
      shippingFee: 5,
      total: 114.99,
      paymentMethod: 'cod',
      paymentStatus: 'Pending',
      orderStatus: 'Processing',
      statusHistory: [
        { status: 'Confirmed', timestamp: new Date(Date.now() - 36000000).toISOString() },
        { status: 'Processing', timestamp: new Date(Date.now() - 18000000).toISOString() },
      ],
      createdAt: new Date(Date.now() - 36000000).toISOString(),
    },
  ];

  logAudit(actor: string, action: string, resource: string, details: string) {
    const log: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      actor,
      action,
      resource,
      details,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) {
      this.auditLogs = this.auditLogs.slice(0, 200);
    }
    return log;
  }
}

export const memoryStore = new MemoryStore();
