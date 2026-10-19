import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../services/api';
import { AuthSettings, PaymentGatewaySettings, PaymentTransaction } from '../../types';
import {
  Settings,
  Save,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Key,
  Globe,
  ExternalLink,
  AlertCircle,
  Copy,
  Receipt,
  Clock,
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<'store' | 'auth' | 'payments' | 'transactions'>('store');

  // Store Settings
  const [storeName, setStoreName] = useState('Marketly');
  const [supportEmail, setSupportEmail] = useState('concierge@marketly.com');
  const [supportPhone, setSupportPhone] = useState('+880 9612-MARKET');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(49);
  const [returnDays, setReturnDays] = useState(30);

  // Auth Settings
  const [authSettings, setAuthSettings] = useState<AuthSettings>({
    emailRegistrationEnabled: true,
    googleAuthEnabled: false,
    googleClientId: '',
    facebookAuthEnabled: false,
    facebookAppId: '',
  });

  // Payment Settings
  const [paymentConfig, setPaymentConfig] = useState<any>({
    bkash: { enabled: false, sandbox: true, isConfigured: false },
    nagad: { enabled: false, sandbox: true, isConfigured: false },
    card: { enabled: false, isConfigured: false },
    cod: { enabled: true },
  });

  // Transactions
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  useEffect(() => {
    api.getAdminAuthSettings().then((s) => s && setAuthSettings(s)).catch(() => {});
    api.getPaymentConfig().then((p) => p && setPaymentConfig(p)).catch(() => {});
    api.getAdminTransactions().then((t) => setTransactions(t)).catch(() => {});
  }, []);

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(
      addNotification({
        type: 'success',
        title: 'Operational Settings Saved',
        message: 'Commercial delivery rules and merchant parameters updated.',
        duration: 3000,
      })
    );
  };

  const handleSaveAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateAdminAuthSettings(authSettings);
      setAuthSettings(updated);
      dispatch(
        addNotification({
          type: 'success',
          title: 'Authentication Settings Updated',
          message: 'Third-party OAuth & registration policies saved.',
          duration: 3000,
        })
      );
    } catch (err: any) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Error',
          message: err.message || 'Failed to save auth settings.',
          duration: 3500,
        })
      );
    }
  };

  const handleSavePayments = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updatePaymentConfig({
        bkashEnabled: paymentConfig.bkash.enabled,
        bkashSandbox: paymentConfig.bkash.sandbox,
        codEnabled: paymentConfig.cod.enabled,
      });
      dispatch(
        addNotification({
          type: 'success',
          title: 'Payment Gateway Configuration Saved',
          message: 'bKash and Cash on Delivery settings updated.',
          duration: 3000,
        })
      );
    } catch (err: any) {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Error',
          message: err.message || 'Failed to update payment settings.',
          duration: 3500,
        })
      );
    }
  };

  const copyCallbackUrl = (provider: 'google' | 'facebook') => {
    const origin = window.location.origin;
    const url = `${origin}/auth/callback/${provider}`;
    navigator.clipboard.writeText(url);
    dispatch(
      addNotification({
        type: 'info',
        title: 'Copied to Clipboard',
        message: `Redirect URI: ${url}`,
        duration: 2500,
      })
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Settings & Enterprise Administration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure authentication providers, payment gateway protocols, and store delivery parameters.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('store')}
          className={`py-3 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === 'store'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Storefront & Delivery
        </button>
        <button
          onClick={() => setActiveTab('auth')}
          className={`py-3 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === 'auth'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Authentication & Social OAuth
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-3 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === 'payments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Payment Gateways
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`py-3 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === 'transactions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Transaction Records ({transactions.length})
        </button>
      </div>

      {/* Tab 1: Store & Delivery Settings */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveStore} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            Merchant Identity & Contacts
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store Name</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                required
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Care Hotline</label>
              <input
                type="text"
                required
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider pt-4 border-t border-slate-100">
            Delivery & Return Thresholds
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Free Delivery Order Minimum ($)
              </label>
              <input
                type="number"
                required
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Guaranteed Return Window (Days)
              </label>
              <input
                type="number"
                required
                value={returnDays}
                onChange={(e) => setReturnDays(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Update Store Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Authentication & Social Providers */}
      {activeTab === 'auth' && (
        <form onSubmit={handleSaveAuth} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Authentication Architecture
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage public registration and OAuth 2.0 / OpenID Connect credentials.
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>

          {/* Email Registration */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs text-slate-900">Email & Password Registration</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enables new customer account creation via email with bcrypt password hashing.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={authSettings.emailRegistrationEnabled}
                onChange={(e) => setAuthSettings({ ...authSettings, emailRegistrationEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Google OAuth Section */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Google OAuth 2.0 / OpenID</h4>
                  <p className="text-[11px] text-slate-500">Allow customers to register and sign in with Google accounts.</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={authSettings.googleAuthEnabled}
                  onChange={(e) => setAuthSettings({ ...authSettings, googleAuthEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Client ID (Public Identifier)
              </label>
              <input
                type="text"
                value={authSettings.googleClientId}
                onChange={(e) => setAuthSettings({ ...authSettings, googleClientId: e.target.value })}
                placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Client secret must remain secure on the server (configured via GOOGLE_CLIENT_SECRET in .env).
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-700 block text-[11px]">Authorized Redirect URI for Google Console:</span>
                <span className="font-mono text-slate-500 text-[10px] break-all">
                  {window.location.origin}/auth/callback/google
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyCallbackUrl('google')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URI</span>
              </button>
            </div>
          </div>

          {/* Facebook Login Section */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1877F2] text-white flex items-center justify-center">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Facebook Login</h4>
                  <p className="text-[11px] text-slate-500">Allow customers to sign in using their Facebook profile.</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={authSettings.facebookAuthEnabled}
                  onChange={(e) => setAuthSettings({ ...authSettings, facebookAuthEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Facebook App ID (Public Identifier)
              </label>
              <input
                type="text"
                value={authSettings.facebookAppId}
                onChange={(e) => setAuthSettings({ ...authSettings, facebookAppId: e.target.value })}
                placeholder="e.g. 987654321098765"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                App secret is kept server-side (configured via FACEBOOK_APP_SECRET in .env).
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-700 block text-[11px]">OAuth Redirect URI for Meta Developer Portal:</span>
                <span className="font-mono text-slate-500 text-[10px] break-all">
                  {window.location.origin}/auth/callback/facebook
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyCallbackUrl('facebook')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URI</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Update Authentication Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Payment Gateways */}
      {activeTab === 'payments' && (
        <form onSubmit={handleSavePayments} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Commercial Payment Gateway Integrity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Provider-verified bKash checkout and authorized Cash on Delivery collection.
              </p>
            </div>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>

          {/* bKash Merchant Gateway */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2136E] text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                  bK
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-900">bKash Merchant Gateway (Tokenized API)</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        paymentConfig.bkash.isConfigured
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {paymentConfig.bkash.isConfigured ? 'Credentials Configured' : 'Not Configured'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Hosted checkout; payment status is confirmed only by server-side provider verification.</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentConfig.bkash.enabled}
                  onChange={(e) =>
                    setPaymentConfig({
                      ...paymentConfig,
                      bkash: { ...paymentConfig.bkash, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">Required Environment Secrets:</span>
                <span className="font-mono text-[10px] text-slate-700">
                  BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD
                </span>
              </div>
              <div className="flex items-center justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentConfig.bkash.sandbox}
                    onChange={(e) =>
                      setPaymentConfig({
                        ...paymentConfig,
                        bkash: { ...paymentConfig.bkash, sandbox: e.target.checked },
                      })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-700 text-xs">Sandbox Test Mode</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
            <h4 className="font-bold text-xs text-slate-900">Nagad and debit/credit cards: unavailable</h4>
            <p className="text-[11px] text-slate-600">
              This project has no verified Nagad signing/validation flow or hosted card processor. These methods cannot be enabled from the admin panel.
            </p>
          </div>

          {/* Cash on Delivery */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs text-slate-900">Cash on Delivery (COD)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                COD orders stay unpaid until an authorized staff member records the exact collection after delivery.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={paymentConfig.cod.enabled}
                onChange={(e) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    cod: { ...paymentConfig.cod, enabled: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Update Payment Gateway Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Transaction Records */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Payment Gateway Transaction Audit</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable ledger of all online & cash transaction attempts and verification states.
              </p>
            </div>
            <Receipt className="w-5 h-5 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{t.orderNumber}</td>
                      <td className="py-3 px-4 font-semibold uppercase">{t.provider}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{t.transactionId || '—'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ${t.amount.toFixed(2)} {t.currency}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            t.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : t.status === 'failed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
